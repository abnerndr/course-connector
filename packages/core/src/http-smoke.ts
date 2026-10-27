import assert from "node:assert/strict";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { dataDir } from "./store";
const base = "http://127.0.0.1:3000";
const created: { collection: string; id: string }[] = [];
async function call(
  action: string,
  args: Record<string, unknown> = {},
  origin = base,
) {
  return fetch(base + "/api/pace", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...args }),
  });
}
try {
  assert.equal(
    (await call("projects", {}, "https://untrusted.example")).status,
    400,
  );
  assert.equal((await call("create", { name: "invalid" })).status, 400);
  const response = await call("create", {
    name: "Teste temporário HTTP",
    url: "https://houseofpace.com.br",
    searchConsoleSite: "sc-domain:houseofpace.com.br",
    analyticsProperty: "123",
  });
  assert.equal(response.status, 200);
  const project = await response.json();
  created.push({ collection: "projects", id: project.id });
  const auditResponse = await call("audit", {
    projectId: project.id,
    url: "https://houseofpace.com.br/conectar",
  });
  assert.equal(auditResponse.status, 200);
  const audit = await auditResponse.json();
  created.push({ collection: "audits", id: audit.id });
  assert.equal(audit.status, 200);
  const view = await (await call("overview", { projectId: project.id })).json();
  assert.equal(view.audits.length, 1);
  assert.equal(view.connected, false);
  const invalid = await call("audit", {
    projectId: project.id,
    url: "http://127.0.0.1:3000",
  });
  assert.equal(invalid.status, 400);
  console.log(
    "HTTP smoke: project creation, real audit, persisted overview, input/origin rejection OK",
  );
} finally {
  for (const item of created)
    await unlink(join(dataDir, item.collection, item.id + ".json"));
}
