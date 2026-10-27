import { test } from "node:test";
import assert from "node:assert/strict";
import { inspect, publicAddress } from "./audit";
import { validateDates, validateEvidence, compareMetrics } from "./index";
import type { Metric } from "./types";
test("auditoria detecta noindex e metadados ausentes", () => {
  const result = inspect(
    '<html><head><meta name="robots" content="noindex"></head><body><img src="x"></body></html>',
    "https://example.com",
    200,
  );
  assert.ok(result.findings.some((f) => f.code === "noindex"));
  assert.ok(result.findings.some((f) => f.code === "title-missing"));
});
test("página com metadados completos passa nos checks implementados", () => {
  assert.equal(
    inspect(
      '<title>Exemplo</title><meta name="description" content="Descrição"><link rel="canonical" href="https://example.com"><h1>Exemplo</h1>',
      "https://example.com",
      200,
    ).findings.length,
    0,
  );
});
test("bloqueia IPs privados e locais", () => {
  for (const ip of [
    "127.0.0.1",
    "10.1.1.1",
    "169.254.169.254",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
  ])
    assert.equal(publicAddress(ip), false);
  assert.equal(publicAddress("8.8.8.8"), true);
});
test("rejeita datas inexistentes e evidências inventadas", () => {
  assert.throws(() => validateDates("2025-02-30", "2025-03-01"));
  assert.throws(() =>
    validateEvidence(
      {
        summary: "x",
        tasks: [{ title: "x", proposal: "x", evidenceIds: ["fake"] }],
      },
      ["real"],
    ),
  );
});
test("comparação não divide por zero e rejeita sobreposição", () => {
  const a = {
    startDate: "2025-01-01",
    endDate: "2025-01-07",
    gsc: { clicks: 0, impressions: 1 },
    ga: { sessions: 0, keyEvents: 0 },
  } as Metric;
  const b = {
    ...a,
    startDate: "2025-01-08",
    endDate: "2025-01-14",
    gsc: { ...a.gsc, clicks: 10 },
  };
  assert.equal(compareMetrics(a, b).clicks.percent, null);
  assert.throws(() => compareMetrics(a, a));
});
