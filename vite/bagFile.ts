import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { relative, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { BAG_CHANGED_EVENT, BAG_FILE_URL } from '../src/state/bagSync';

/**
 * Keeps the bag in a file inside the repo while `npm run dev` runs, so the
 * owner's rackets can be read and edited there instead of living only in one
 * browser's localStorage. Dev only: GitHub Pages is static, nothing on it can
 * write back, and the live site is for everyone, so it stays on localStorage.
 */

export interface BagFileStore {
  /** The file as it is on disk, or null before it exists. */
  read(): string | null;
  /** Writes a bag, indented. Throws and leaves the file alone if the body is not one. */
  write(body: string): void;
  /** True while the disk still holds exactly what this store last wrote. */
  isOwnWrite(): boolean;
}

class NotABag extends Error {}

export function bagFileStore(file: string): BagFileStore {
  let lastWritten: string | null = null;

  const read = (): string | null => {
    try {
      return readFileSync(file, 'utf8');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw e;
    }
  };

  return {
    read,
    write(body) {
      let data: unknown;
      try {
        data = JSON.parse(body);
      } catch {
        throw new NotABag('not JSON');
      }
      if (!data || typeof data !== 'object' || !Array.isArray((data as { rackets?: unknown }).rackets)) {
        throw new NotABag('no rackets');
      }

      // Renaming over the old file means a crash mid-write cannot leave half a bag.
      const text = `${JSON.stringify(data, null, 2)}\n`;
      const tmp = `${file}.tmp`;
      writeFileSync(tmp, text);
      renameSync(tmp, file);
      lastWritten = text;
    },
    isOwnWrite: () => lastWritten !== null && read() === lastWritten,
  };
}

/** GET serves the file, PUT replaces it. Mounted on its own path, so it never calls next. */
export function bagFileMiddleware(store: BagFileStore) {
  return (req: IncomingMessage, res: ServerResponse): void => {
    if (req.method === 'GET') {
      const text = store.read();
      if (text === null) {
        res.statusCode = 404;
        res.end();
        return;
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(text);
      return;
    }

    if (req.method === 'PUT') {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        try {
          store.write(Buffer.concat(chunks).toString('utf8'));
          res.statusCode = 204;
        } catch (e) {
          res.statusCode = e instanceof NotABag ? 400 : 500;
        }
        res.end();
      });
      return;
    }

    res.statusCode = 405;
    res.end();
  };
}

export function bagFilePlugin(fileName = 'bag.local.json'): Plugin {
  return {
    name: 'bag-file',
    apply: 'serve',
    configureServer(server) {
      const file = resolve(server.config.root, fileName);
      const store = bagFileStore(file);
      server.middlewares.use(BAG_FILE_URL, bagFileMiddleware(store));

      // Tell open pages to reload the bag when someone edits the file by hand.
      // The page's own writes come back through the watcher too; those are skipped.
      const onDisk = (changed: string) => {
        if (relative(changed, file) === '' && !store.isOwnWrite()) {
          server.ws.send({ type: 'custom', event: BAG_CHANGED_EVENT });
        }
      };
      server.watcher.add(file);
      server.watcher.on('add', onDisk);
      server.watcher.on('change', onDisk);
    },
  };
}
