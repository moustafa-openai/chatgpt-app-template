import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type ListResourceTemplatesRequest,
  type ListResourcesRequest,
  type ListToolsRequest,
  type ReadResourceRequest,
} from "@modelcontextprotocol/sdk/types.js";
import type { WidgetCatalog } from "./widget-catalog";

type CreateMcpServerOptions = {
  name: string;
  version: string;
  widgetCatalog: WidgetCatalog;
};

export function createMcpServer(options: CreateMcpServerOptions): Server {
  const server = new Server(
    {
      name: options.name,
      version: options.version,
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    },
  );

  server.setRequestHandler(
    ListResourcesRequestSchema,
    async (_request: ListResourcesRequest) => ({
      resources: options.widgetCatalog.resources,
    }),
  );

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request: ReadResourceRequest) => {
      const content = options.widgetCatalog.getResourceContent(
        request.params.uri,
      );

      if (!content) {
        throw new Error(`Unknown resource: ${request.params.uri}`);
      }

      return {
        contents: [content],
      };
    },
  );

  server.setRequestHandler(
    ListResourceTemplatesRequestSchema,
    async (_request: ListResourceTemplatesRequest) => ({
      resourceTemplates: options.widgetCatalog.resourceTemplates,
    }),
  );

  server.setRequestHandler(
    ListToolsRequestSchema,
    async (_request: ListToolsRequest) => ({
      tools: options.widgetCatalog.tools,
    }),
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      const invocation = options.widgetCatalog.getToolInvocation(
        request.params.name,
      );

      if (!invocation) {
        throw new Error(`Unknown tool: ${request.params.name}`);
      }

      const input = invocation.tool.input.parse(request.params.arguments ?? {});
      const result = await invocation.tool.handler(input);

      return {
        ...result,
        _meta: invocation.meta,
      };
    },
  );

  return server;
}
