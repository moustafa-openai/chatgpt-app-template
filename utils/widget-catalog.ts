import fs from "node:fs";
import path from "node:path";

import type {
  Resource,
  ResourceTemplate,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import type { ToolDefinition } from "./define-tool";

type Widget = {
  toolName: string;
  title: string;
  templateUri: string;
  invoking: string;
  invoked: string;
  html: string;
};

type DescriptorMeta = {
  "openai/outputTemplate": string;
  "openai/toolInvocation/invoking": string;
  "openai/toolInvocation/invoked": string;
  "openai/widgetAccessible": true;
};

type InvocationMeta = {
  "openai/toolInvocation/invoking": string;
  "openai/toolInvocation/invoked": string;
};

type ResourceContent = {
  uri: string;
  mimeType: "text/html+skybridge";
  text: string;
  _meta: DescriptorMeta;
};

export type WidgetCatalog = {
  tools: Tool[];
  resources: Resource[];
  resourceTemplates: ResourceTemplate[];
  getResourceContent: (uri: string) => ResourceContent | undefined;
  getToolInvocation: (
    toolName: string,
  ) => { tool: ToolDefinition; meta: InvocationMeta } | undefined;
};

function readWidgetHtml(assetsDir: string, uiName: string): string {
  if (!fs.existsSync(assetsDir)) {
    throw new Error(
      `Widget assets not found. Expected directory ${assetsDir}. Run "pnpm run build" before starting the server.`,
    );
  }

  const directPath = path.join(assetsDir, `${uiName}.html`);
  let htmlContents: string | null = null;

  if (fs.existsSync(directPath)) {
    htmlContents = fs.readFileSync(directPath, "utf8");
  } else {
    const candidates = fs
      .readdirSync(assetsDir)
      .filter(
        (file) =>
          file.startsWith(`${uiName}-`) && file.endsWith(".html"),
      )
      .sort();
    const fallback = candidates[candidates.length - 1];
    if (fallback) {
      htmlContents = fs.readFileSync(path.join(assetsDir, fallback), "utf8");
    }
  }

  if (!htmlContents) {
    throw new Error(
      `Widget HTML for "${uiName}" not found in ${assetsDir}. Run "pnpm run build" to generate the assets.`,
    );
  }

  return htmlContents;
}

function descriptorMeta(widget: Widget): DescriptorMeta {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
  };
}

function invocationMeta(widget: Widget): InvocationMeta {
  return {
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
  };
}

function createWidget(definition: ToolDefinition, assetsDir: string): Widget {
  return {
    toolName: definition.name,
    title: definition.title,
    templateUri: `ui://widget/${definition.ui}.html`,
    invoking: definition.invoking,
    invoked: definition.invoked,
    html: readWidgetHtml(assetsDir, definition.ui),
  };
}

export function createWidgetCatalog(
  toolDefinitions: ToolDefinition[],
  assetsDir: string,
): WidgetCatalog {
  const widgets = toolDefinitions.map((tool) => createWidget(tool, assetsDir));

  const widgetsByToolName = new Map<string, Widget>();
  const widgetsByUri = new Map<string, Widget>();
  const toolsByName = new Map<string, ToolDefinition>();

  widgets.forEach((widget) => {
    widgetsByToolName.set(widget.toolName, widget);
    widgetsByUri.set(widget.templateUri, widget);
  });

  toolDefinitions.forEach((tool) => {
    toolsByName.set(tool.name, tool);
  });

  const tools: Tool[] = toolDefinitions.map((tool) => {
    const widget = widgetsByToolName.get(tool.name);

    if (!widget) {
      throw new Error(`Tool "${tool.name}" is missing a widget definition.`);
    }

    return {
      name: tool.name,
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema,
      _meta: descriptorMeta(widget),
      annotations: tool.annotations,
    };
  });

  const resources: Resource[] = widgets.map((widget) => ({
    uri: widget.templateUri,
    name: widget.title,
    description: `${widget.title} widget markup`,
    mimeType: "text/html+skybridge",
    _meta: descriptorMeta(widget),
  }));

  const resourceTemplates: ResourceTemplate[] = widgets.map((widget) => ({
    uriTemplate: widget.templateUri,
    name: widget.title,
    description: `${widget.title} widget markup`,
    mimeType: "text/html+skybridge",
    _meta: descriptorMeta(widget),
  }));

  return {
    tools,
    resources,
    resourceTemplates,
    getResourceContent(uri: string) {
      const widget = widgetsByUri.get(uri);

      if (!widget) {
        return undefined;
      }

      return {
        uri: widget.templateUri,
        mimeType: "text/html+skybridge",
        text: widget.html,
        _meta: descriptorMeta(widget),
      };
    },
    getToolInvocation(toolName: string) {
      const tool = toolsByName.get(toolName);
      const widget = widgetsByToolName.get(toolName);

      if (!tool || !widget) {
        return undefined;
      }

      return {
        tool,
        meta: invocationMeta(widget),
      };
    },
  };
}
