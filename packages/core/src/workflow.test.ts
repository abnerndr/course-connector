import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("fluxo integrado: OAuth, coleta, diagnóstico e aprovação com respostas simuladas", async () => {
  const dir = await mkdtemp(join(tmpdir(), "pace-test-"));
  process.env.PACE_DATA_DIR = dir;
  process.env.GOOGLE_CLIENT_ID = "test-client";
  process.env.GOOGLE_CLIENT_SECRET = "test-secret";
  const core = await import("./index");
  const store = await import("./store");
  const original = globalThis.fetch;
  try {
    const p = await core.createProject({
      name: "Teste",
      url: "https://example.com",
      searchConsoleSite: "sc-domain:example.com",
      analyticsProperty: "123",
    });
    const auth = await core.beginGoogle(p.id);
    assert.ok(auth.url.includes("code_challenge="));
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("oauth2.googleapis.com"))
        return Response.json({
          access_token: "private-access",
          refresh_token: "private-refresh",
          expires_in: 3600,
        });
      if (url.includes("searchAnalytics"))
        return Response.json({
          rows: [{ clicks: 10, impressions: 100, ctr: 0.1, position: 4 }],
        });
      if (url.includes("analyticsdata"))
        return Response.json({
          rows: [
            { metricValues: [{ value: "12" }, { value: "8" }, { value: "2" }] },
          ],
        });
      if (url.includes("/api/chat")) {
        const request = JSON.parse(String(init?.body));
        const evidence = JSON.parse(request.messages[1].content);
        assert.ok(!String(init?.body).includes("private-access"));
        return Response.json({
          message: {
            content: JSON.stringify({
              summary: "Observação de teste",
              tasks: [
                {
                  title: "Revisar página",
                  proposal: "Comparar desempenho do próximo período",
                  evidenceIds: [evidence.metrics[0].id],
                },
              ],
            }),
          },
        });
      }
      throw new Error("Unexpected URL " + url);
    };
    await core.finishGoogle(auth.state, "test-code");
    await assert.rejects(
      () => core.finishGoogle(auth.state, "test-code"),
      /já utilizada/,
    );
    const tokenFile = await readFile(
      join(dir, "tokens", p.id + ".json"),
      "utf8",
    );
    assert.ok(!tokenFile.includes("private-access"));
    const m = await core.collectMetrics(p.id, "2025-01-01", "2025-01-07");
    assert.equal(m.ga.sessions, 12);
    assert.equal(m.gsc.clicks, 10);
    const result = await core.diagnose(p.id);
    assert.equal(result.tasks.length, 1);
    assert.deepEqual(result.tasks[0].evidenceIds, [m.id]);
    await assert.rejects(
      () => core.updateTask(result.tasks[0].id, "implemented"),
      /Transição/,
    );
    await core.updateTask(result.tasks[0].id, "approved");
    await core.updateTask(result.tasks[0].id, "implemented");
    await assert.rejects(
      () => core.validateTask(result.tasks[0].id),
      /referência/,
    );
    const view = await core.overview(p.id);
    assert.equal(view.tasks[0].status, "implemented");
    assert.equal((await store.list("diagnoses")).length, 1);
  } finally {
    globalThis.fetch = original;
    await rm(dir, { recursive: true, force: true });
  }
});
