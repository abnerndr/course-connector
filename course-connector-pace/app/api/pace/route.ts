import { NextRequest, NextResponse } from "next/server";
import * as core from "@pace/core";
import { z } from "zod";
import { guard } from "../guard";
export const runtime = "nodejs";
const id = z.string().uuid();
export async function POST(request: NextRequest) {
  try {
    guard(request, true);
    const a = await request.json();
    let result: unknown;
    switch (a.action) {
      case "projects":
        result = await core.projects();
        break;
      case "create":
        result = await core.createProject(a);
        break;
      case "overview":
        result = await core.overview(id.parse(a.projectId));
        break;
      case "collect":
        result = await core.collectMetrics(
          id.parse(a.projectId),
          z.string().parse(a.startDate),
          z.string().parse(a.endDate),
        );
        break;
      case "audit":
        result = await core.auditPage(
          id.parse(a.projectId),
          z.string().url().optional().parse(a.url),
        );
        break;
      case "diagnose":
        result = await core.diagnose(id.parse(a.projectId));
        break;
      case "task":
        result = await core.updateTask(
          id.parse(a.taskId),
          z.enum(["approved", "implemented"]).parse(a.status),
        );
        break;
      case "validate":
        result = await core.validateTask(id.parse(a.taskId));
        break;
      case "compare":
        result = await core.comparePeriods(
          id.parse(a.projectId),
          id.parse(a.beforeId),
          id.parse(a.afterId),
        );
        break;
      default:
        return NextResponse.json(
          { error: "Operação desconhecida" },
          { status: 400 },
        );
    }
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha inesperada" },
      { status: 400 },
    );
  }
}
