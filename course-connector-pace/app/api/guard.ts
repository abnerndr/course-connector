import type { NextRequest } from "next/server";
export function guard(request: NextRequest, mutation = false) {
  const host = request.headers.get("host") || "";
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host))
    throw new Error("Acesso disponível somente pelo host local");
  if (mutation) {
    const origin = request.headers.get("origin");
    if (!origin || new URL(origin).host !== host)
      throw new Error("Origem da requisição não permitida");
  }
}
