/**
 * The page's half of the bag file the dev server keeps in the repo; the server
 * half is `vite/bagFile.ts`. Only `npm run dev` answers these, so nothing here
 * is called on the live site.
 */
export const BAG_FILE_URL = '/__bag';

/** Sent over the HMR socket when the file changes on disk from outside the page. */
export const BAG_CHANGED_EVENT = 'bag:changed';

/** The file as the server read it, or null before it exists. */
export async function fetchBagFile(): Promise<string | null> {
  const res = await fetch(BAG_FILE_URL, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${BAG_FILE_URL} ${res.status}`);
  return res.text();
}

export async function putBagFile(body: string): Promise<void> {
  const res = await fetch(BAG_FILE_URL, { method: 'PUT', body });
  if (!res.ok) throw new Error(`PUT ${BAG_FILE_URL} ${res.status}`);
}
