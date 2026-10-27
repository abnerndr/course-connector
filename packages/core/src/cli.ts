import * as core from "./index";
const [command, ...args] = process.argv.slice(2);
try {
  let result: unknown;
  switch (command) {
    case "projects":
      result = await core.projects();
      break;
    case "create":
      result = await core.createProject(JSON.parse(args[0] || "{}"));
      break;
    case "overview":
      result = await core.overview(args[0]);
      break;
    case "collect":
      result = await core.collectMetrics(args[0], args[1], args[2]);
      break;
    case "audit":
      result = await core.auditPage(args[0], args[1]);
      break;
    case "diagnose":
      result = await core.diagnose(args[0]);
      break;
    case "approve":
      result = await core.updateTask(args[0], "approved");
      break;
    case "implemented":
      result = await core.updateTask(args[0], "implemented");
      break;
    case "validate":
      result = await core.validateTask(args[0]);
      break;
    case "compare":
      result = await core.comparePeriods(args[0], args[1], args[2]);
      break;
    default:
      console.log(
        "pace projects | create <json> | overview <projectId> | collect <projectId> <YYYY-MM-DD> <YYYY-MM-DD> | audit <projectId> [url] | diagnose <projectId> | approve <taskId> | implemented <taskId> | validate <taskId> | compare <projectId> <beforeId> <afterId>",
      );
      process.exit(0);
  }
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  console.error(e instanceof Error ? e.message : "Falha");
  process.exitCode = 1;
}
