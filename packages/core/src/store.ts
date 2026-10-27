import { mkdir, readFile, writeFile, rename, readdir } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { existsSync } from "node:fs";
import {
  randomUUID,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
function workspaceRoot() {
  let dir = process.cwd();
  while (!existsSync(join(dir, "pnpm-workspace.yaml"))) {
    const parent = dirname(dir);
    if (parent === dir)
      throw new Error(
        "Execute a partir do workspace ou configure PACE_DATA_DIR",
      );
    dir = parent;
  }
  return dir;
}
const root = process.env.PACE_WORKSPACE_ROOT || workspaceRoot();
if (existsSync(join(root, ".env"))) process.loadEnvFile(join(root, ".env"));
export const dataDir = resolve(
  /* turbopackIgnore: true */
  process.env.PACE_DATA_DIR || join(root, ".pace"),
);
export async function put<T extends { id: string }>(
  collection: string,
  value: T,
) {
  const dir = join(dataDir, collection);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const temp = join(dir, randomUUID() + ".tmp");
  await writeFile(temp, JSON.stringify(value, null, 2), { mode: 0o600 });
  await rename(temp, join(dir, value.id + ".json"));
  return value;
}
export async function get<T>(collection: string, id: string): Promise<T> {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error("Identificador inválido");
  return JSON.parse(
    await readFile(join(dataDir, collection, id + ".json"), "utf8"),
  );
}
export async function list<T>(collection: string): Promise<T[]> {
  const dir = join(dataDir, collection);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const names = await readdir(dir);
  return Promise.all(
    names
      .filter((n) => n.endsWith(".json"))
      .map((n) => get<T>(collection, n.slice(0, -5))),
  );
}
async function key() {
  await mkdir(dataDir, { recursive: true, mode: 0o700 });
  const path = join(dataDir, "secret.key");
  try {
    await writeFile(path, randomBytes(32), { flag: "wx", mode: 0o600 });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
  }
  return readFile(path);
}
export async function seal(value: unknown) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", await key(), iv);
  const content = Buffer.concat([
    cipher.update(JSON.stringify(value)),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), content]).toString("base64");
}
export async function unseal<T>(value: string): Promise<T> {
  const b = Buffer.from(value, "base64"),
    decipher = createDecipheriv("aes-256-gcm", await key(), b.subarray(0, 12));
  decipher.setAuthTag(b.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([
      decipher.update(b.subarray(28)),
      decipher.final(),
    ]).toString(),
  );
}
