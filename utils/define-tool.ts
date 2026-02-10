import { zodToJsonSchema } from "zod-to-json-schema";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod/v3";

export type ToolAnnotations = {
  readOnlyHint: boolean;
  openWorldHint: boolean;
  destructiveHint: boolean;
};

export type ToolResponse = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: Record<string, unknown>;
};

export type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  annotations: ToolAnnotations;
  input: z.ZodTypeAny;
  inputSchema: Tool["inputSchema"];
  ui: string;
  invoking: string;
  invoked: string;
  handler: (input: unknown) => ToolResponse | Promise<ToolResponse>;
};

export function defineTool<TInput extends z.ZodTypeAny>(
  tool: Omit<ToolDefinition, "input" | "inputSchema" | "handler"> & {
    input: TInput;
    handler: (input: z.infer<TInput>) => ToolResponse | Promise<ToolResponse>;
  },
): ToolDefinition {
  const rawSchema = zodToJsonSchema(tool.input, {
    $refStrategy: "none",
  });
  const inputSchema: Tool["inputSchema"] =
    typeof rawSchema === "object" &&
    rawSchema !== null &&
    "type" in rawSchema &&
    rawSchema.type === "object"
      ? (rawSchema as Tool["inputSchema"])
      : { type: "object" };

  return {
    ...tool,
    inputSchema,
    handler: tool.handler as ToolDefinition["handler"],
  };
}
