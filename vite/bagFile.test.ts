import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bagFileMiddleware, bagFileStore } from './bagFile';

const BAG = '{"v":1,"rackets":[]}';
const PRETTY = '{\n  "v": 1,\n  "rackets": []\n}\n';

let dir: string;
let file: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'bagfile-'));
  file = join(dir, 'bag.local.json');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('bagFileStore', () => {
  it('reads nothing before the file exists', () => {
    expect(bagFileStore(file).read()).toBeNull();
  });

  it('writes the bag indented so it reads well in a diff', () => {
    const store = bagFileStore(file);
    store.write(BAG);
    expect(readFileSync(file, 'utf8')).toBe(PRETTY);
    expect(store.read()).toBe(PRETTY);
  });

  it('leaves only the bag file behind after a write', () => {
    bagFileStore(file).write(BAG);
    expect(readdirSync(dir)).toEqual(['bag.local.json']);
  });

  it('refuses a body that is not a bag and keeps the file as it was', () => {
    const store = bagFileStore(file);
    store.write(BAG);
    expect(() => store.write('not json')).toThrow();
    expect(() => store.write('{"v":1}')).toThrow();
    expect(readFileSync(file, 'utf8')).toBe(PRETTY);
  });

  it('recognises its own write so the watcher does not echo it back', () => {
    const store = bagFileStore(file);
    store.write(BAG);
    expect(store.isOwnWrite()).toBe(true);
  });

  it('treats an edit made outside the page as a real change', () => {
    const store = bagFileStore(file);
    store.write(BAG);
    writeFileSync(file, '{ "v": 1, "rackets": [{}] }\n');
    expect(store.isOwnWrite()).toBe(false);
  });
});

describe('bagFileMiddleware', () => {
  let server: Server;
  let url: string;

  beforeEach(async () => {
    server = createServer(bagFileMiddleware(bagFileStore(file)));
    await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`;
  });

  afterEach(async () => {
    await new Promise((done) => server.close(done));
  });

  it('answers 404 until the file exists', async () => {
    expect((await fetch(url)).status).toBe(404);
  });

  it('serves back what was put', async () => {
    expect((await fetch(url, { method: 'PUT', body: BAG })).status).toBe(204);
    const res = await fetch(url);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(PRETTY);
  });

  it('rejects a body that is not a bag without touching the file', async () => {
    await fetch(url, { method: 'PUT', body: BAG });
    expect((await fetch(url, { method: 'PUT', body: 'garbage' })).status).toBe(400);
    expect(readFileSync(file, 'utf8')).toBe(PRETTY);
  });

  it('rejects other methods', async () => {
    expect((await fetch(url, { method: 'DELETE' })).status).toBe(405);
  });
});
