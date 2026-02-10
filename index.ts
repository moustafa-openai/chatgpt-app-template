import path from "node:path";
import { fileURLToPath } from "node:url";
import { toolDefinitions } from "./tools";
import { createMcpServer } from "./utils/create-mcp-server";
import { startSseServer } from "./utils/start-sse-server";
import { createWidgetCatalog } from "./utils/widget-catalog";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, "assets");

const widgetCatalog = createWidgetCatalog(toolDefinitions, assetsDir);

const createServerInstance = () =>
  createMcpServer({
    name: "pizzaz-node",
    version: "0.1.0",
    widgetCatalog,
  });

const portEnv = Number(process.env.PORT ?? 8000);
const port = Number.isFinite(portEnv) ? portEnv : 8000;

startSseServer({
  createMcpServer: createServerInstance,
  port,
  serverLabel: "Pizzaz MCP server",
  staticAssetsDir: assetsDir,
  staticAssetsPath: "/assets",
});
