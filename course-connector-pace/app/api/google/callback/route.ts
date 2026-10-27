import { NextRequest, NextResponse } from "next/server";
import { finishGoogle } from "@pace/core";
import { guard } from "../../guard";
export async function GET(request: NextRequest) {
  const base = process.env.GOOGLE_REDIRECT_URI
    ? new URL(process.env.GOOGLE_REDIRECT_URI).origin
    : "http://localhost:3000";
  try {
    guard(request);
    const state = request.nextUrl.searchParams.get("state"),
      code = request.nextUrl.searchParams.get("code");
    if (!state || state !== request.cookies.get("pace_oauth")?.value || !code)
      throw new Error("Autorização cancelada ou estado inválido");
    const id = await finishGoogle(state, code);
    const r = NextResponse.redirect(base + "/?connected=" + id);
    r.cookies.delete("pace_oauth");
    return r;
  } catch {
    return NextResponse.redirect(
      base +
        "/?error=" +
        encodeURIComponent(
          "Não foi possível conectar o Google. Confira as credenciais e tente novamente.",
        ),
    );
  }
}
