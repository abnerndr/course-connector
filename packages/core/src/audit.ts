import { load } from "cheerio";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Agent, fetch as httpFetch } from "undici";
import type { Finding } from "./types";
export function publicAddress(address: string) {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  const a = address.toLowerCase();
  return a.startsWith("2") || a.startsWith("3");
}
export async function assertPublic(url: string) {
  const u = new URL(url);
  if (!["https:", "http:"].includes(u.protocol) || u.username || u.password)
    throw new Error("URL não permitida");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  const addresses = await lookup(host, { all: true });
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw new Error("Auditoria aceita apenas endereços públicos");
  return addresses[0];
}
export function inspect(html: string, url: string, status: number) {
  const $ = load(html);
  const title = $("title").text().trim(),
    description = $('meta[name="description"]').attr("content") || "",
    h1 = $("h1").length,
    canonical = $('link[rel="canonical"]').attr("href") || "";
  const findings: Finding[] = [];
  const add = (
    code: string,
    severity: Finding["severity"],
    message: string,
    evidence: string,
  ) => findings.push({ code, severity, message, evidence });
  if (status >= 400)
    add("http-error", "high", "Página retornou erro", String(status));
  if (!title)
    add("title-missing", "high", "Título ausente", "Nenhum title com texto");
  if (!description)
    add(
      "description-missing",
      "medium",
      "Meta description ausente",
      "Nenhum conteúdo de description",
    );
  if (h1 !== 1)
    add("h1-count", "medium", "Revisar título principal", h1 + " elementos h1");
  if (!canonical)
    add(
      "canonical-missing",
      "medium",
      "Canonical ausente",
      "Nenhum link canonical",
    );
  else {
    try {
      new URL(canonical, url);
    } catch {
      add("canonical-invalid", "high", "Canonical inválida", canonical);
    }
  }
  const robots = $('meta[name="robots"]').attr("content") || "";
  if (/noindex/i.test(robots))
    add("noindex", "high", "Página sinaliza noindex", robots);
  const missing = $("img:not([alt])").length;
  if (missing)
    add("image-alt", "low", "Imagens sem atributo alt", missing + " imagens");
  return { title, description, h1, canonical, findings };
}
export async function fetchPage(url: string) {
  let current = url;
  for (let i = 0; i < 6; i++) {
    const address = await assertPublic(current);
    const dispatcher = new Agent({
      connect: {
        autoSelectFamily: false,
        lookup: (_host, _options, callback) =>
          callback(null, address.address, address.family),
      },
    });
    try {
      const r = await httpFetch(current, {
        dispatcher,
        redirect: "manual",
        headers: { "User-Agent": "PaceAudit/0.1" },
        signal: AbortSignal.timeout(20000),
      });
      if (r.status >= 300 && r.status < 400 && r.headers.get("location")) {
        current = new URL(r.headers.get("location")!, current).href;
        await r.body?.cancel();
        continue;
      }
      if (!r.headers.get("content-type")?.includes("text/html")) {
        await r.body?.cancel();
        throw new Error("A URL não retornou HTML");
      }
      const reader = r.body?.getReader();
      if (!reader) throw new Error("Resposta vazia");
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          bytes += part.value.length;
          if (bytes > 2000000) throw new Error("HTML excede 2 MB");
          chunks.push(part.value);
        }
      } finally {
        await reader.cancel();
      }
      return {
        url: current,
        status: r.status,
        ...inspect(Buffer.concat(chunks).toString("utf8"), current, r.status),
      };
    } finally {
      await dispatcher.close();
    }
  }
  throw new Error("Redirecionamentos em excesso");
}
