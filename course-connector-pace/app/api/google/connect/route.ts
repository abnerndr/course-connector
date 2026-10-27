import { NextRequest, NextResponse } from "next/server";
import { beginGoogle } from "@pace/core";
import { guard } from "../../guard";
export async function GET(request: NextRequest) {
  try {
    guard(request);
    const { url, state } = await beginGoogle(
      request.nextUrl.searchParams.get("projectId") || "",
    );
    const response = NextResponse.redirect(url);
    response.cookies.set("pace_oauth", state, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 600,
      path: "/api/google",
      secure: false,
    });
    return response;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha OAuth" },
      { status: 400 },
    );
  }
}
