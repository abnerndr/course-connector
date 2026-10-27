import { randomBytes, createHash } from "node:crypto";
import { get, put, seal, unseal } from "./store";
import type { Project } from "./types";
const scopes = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/analytics.readonly",
];
function config() {
  const clientId = process.env.GOOGLE_CLIENT_ID,
    clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    throw new Error("Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET");
  return {
    clientId,
    clientSecret,
    redirect:
      process.env.GOOGLE_REDIRECT_URI ||
      "http://localhost:3000/api/google/callback",
  };
}
export async function beginGoogle(projectId: string) {
  await get<Project>("projects", projectId);
  const c = config(),
    state = randomBytes(24).toString("hex"),
    verifier = randomBytes(48).toString("base64url");
  await put("oauth", {
    id: state,
    projectId,
    verifier,
    expires: Date.now() + 600000,
    used: false,
  });
  const params = new URLSearchParams({
    client_id: c.clientId,
    redirect_uri: c.redirect,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
  });
  return {
    url: "https://accounts.google.com/o/oauth2/v2/auth?" + params,
    state,
  };
}
async function tokenRequest(params: Record<string, string>) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(
      "Google recusou a autenticação. Reconecte a conta e confira as credenciais.",
    );
  return response.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  }>;
}
type Tokens = { access_token: string; refresh_token?: string; expires: number };
export async function finishGoogle(state: string, code: string) {
  const pending = await get<{
    id: string;
    projectId: string;
    verifier: string;
    expires: number;
    used: boolean;
  }>("oauth", state);
  if (pending.used || pending.expires < Date.now())
    throw new Error("Autorização expirada ou já utilizada");
  await put("oauth", { ...pending, used: true });
  const c = config();
  const result = await tokenRequest({
    client_id: c.clientId,
    client_secret: c.clientSecret,
    redirect_uri: c.redirect,
    code,
    code_verifier: pending.verifier,
    grant_type: "authorization_code",
  });
  let previous: Tokens | undefined;
  try {
    previous = await unseal<Tokens>(
      (await get<{ value: string }>("tokens", pending.projectId)).value,
    );
  } catch {}
  await put("tokens", {
    id: pending.projectId,
    value: await seal({
      ...result,
      refresh_token: result.refresh_token || previous?.refresh_token,
      expires: Date.now() + result.expires_in * 1000,
    }),
  });
  return pending.projectId;
}
export async function connected(projectId: string) {
  try {
    await get("tokens", projectId);
    return true;
  } catch {
    return false;
  }
}
async function access(projectId: string) {
  const record = await get<{ value: string }>("tokens", projectId).catch(() => {
    throw new Error("Conecte a conta Google primeiro");
  });
  let tokens = await unseal<Tokens>(record.value);
  if (tokens.expires < Date.now() + 60000) {
    if (!tokens.refresh_token)
      throw new Error("Reconecte o Google para renovar a autorização");
    const c = config(),
      fresh = await tokenRequest({
        client_id: c.clientId,
        client_secret: c.clientSecret,
        refresh_token: tokens.refresh_token,
        grant_type: "refresh_token",
      });
    tokens = {
      ...tokens,
      ...fresh,
      expires: Date.now() + fresh.expires_in * 1000,
    };
    await put("tokens", { id: projectId, value: await seal(tokens) });
  }
  return tokens.access_token;
}
export async function google<T>(
  projectId: string,
  url: string,
  body?: unknown,
): Promise<T> {
  const r = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: "Bearer " + (await access(projectId)),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60000),
  });
  if (!r.ok)
    throw new Error(
      "Google API retornou HTTP " +
        r.status +
        ". Confira as APIs habilitadas e o acesso às propriedades.",
    );
  return r.json() as Promise<T>;
}
export async function googleProperties(projectId: string) {
  return {
    searchConsole: await google(
      projectId,
      "https://www.googleapis.com/webmasters/v3/sites",
    ),
    analytics: await google(
      projectId,
      "https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200",
    ),
  };
}
