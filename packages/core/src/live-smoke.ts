import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const dir = await mkdtemp(join(tmpdir(), "pace-live-audit-"));
process.env.PACE_DATA_DIR = dir;
try {
  const core = await import("./index");
  const p = await core.createProject({
    name: "Auditoria temporária",
    url: "https://houseofpace.com.br",
    searchConsoleSite: "sc-domain:houseofpace.com.br",
    analyticsProperty: "123",
  });
  const result = await core.auditPage(
    p.id,
    "https://houseofpace.com.br/conectar",
  );
  if (result.status !== 200 || !result.title)
    throw new Error("Resposta inesperada");
  console.log(
    JSON.stringify({
      status: result.status,
      title: result.title,
      findings: result.findings.length,
    }),
  );
} finally {
  await rm(dir, { recursive: true, force: true });
}
