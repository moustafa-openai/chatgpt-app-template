# AGENTS.md

This file explains how a coding model should extend this repository safely.

## Purpose

This repo is a focused Apps SDK + MCP example with:

- UI widgets in `ui/`
- built widget assets in `assets/`
- a Node MCP server at repo root (`index.ts`, `tools/`, `utils/`)

The server exposes tools that render widgets via `_meta.openai/outputTemplate`.

## Project map

- `ui/`
  React widget source code (entrypoints are `ui/**/index.tsx` or `index.jsx`).
- `build-all.mts`
  Production-style widget build script. Writes hashed and non-hashed files to `assets/`.
- `vite.config.mts`
  Local dev server for widgets.
- `index.ts`
  Server entrypoint (composition only).
- `tools/*.ts`
  Tool definitions (one file per tool).
- `tools/index.ts`
  Exports `toolDefinitions` array consumed by server startup.
- `utils/define-tool.ts`
  `defineTool(...)` helper. Converts Zod input to MCP input schema.
- `utils/widget-catalog.ts`
  Maps tool defs to resources/templates/tool metadata and loads widget HTML from `assets/`.
- `utils/create-mcp-server.ts`
  Registers MCP handlers.
- `utils/start-sse-server.ts`
  Runs HTTP + SSE transport (`/mcp`, `/mcp/messages`) and static widget assets (`/assets/*`).

## Core rules when adding features

1. Keep business logic in tool files and UI files.
2. Keep server plumbing generic inside `utils/*`.
3. Define tool input once in Zod; do not hand-write `inputSchema`.
4. Keep naming consistent across UI, build targets, and tool metadata.
5. Validate with TypeScript before finishing.

## Add a new UI widget

1. Create a folder: `ui/<widget-name>/`
2. Add entry file: `ui/<widget-name>/index.tsx`
3. Render into the expected root id:
   - `createRoot(document.getElementById("<widget-name>-root")!)` pattern is used, but prefer null-check guard.
4. Add any widget-local CSS in the same folder.
5. Ensure global styles are in `ui/index.css` only when truly shared.
6. Ensure your widget entrypoint matches `ui/**/index.tsx` or `ui/**/index.jsx`:
   - build targets are inferred automatically from this glob.
7. Build assets:
   - `pnpm run build`
8. Confirm generated files exist in `assets/`:
   - `<widget-name>.html`
   - `<widget-name>-<hash>.html`

## Add a new MCP tool (backed by a widget)

1. Create a file: `tools/<tool-name>.ts`
2. Use `defineTool(...)` from `utils/define-tool.ts`.
3. Required fields in tool definition:
   - `name`: MCP tool name
   - `title`
   - `description`
   - `annotations`
   - `input`: Zod schema
   - `ui`: widget template name and built asset basename (`ui://widget/${ui}.html` and `assets/${ui}.html`)
   - `invoking` / `invoked`
   - `handler(input)`
4. Export as default.
5. Register in `tools/index.ts` by adding it to `toolDefinitions`.

## How tool -> widget wiring works

- `ui` is used to read widget HTML from `assets/` via `readWidgetHtml(...)`.
- `ui` also becomes template URI: `ui://widget/<ui>.html`.
- `widget-catalog` generates:
  - `tools` (for `list_tools`)
  - `resources` and `resourceTemplates`
  - invocation metadata for `call_tool`

If the widget does not render, check `ui` first.

## Local development workflow

1. Install deps: `pnpm install`
2. Build assets: `pnpm run build`
3. Start MCP server: `pnpm run mcp:start` (port `8000`)
4. Run full dev loop (build + UI watch + MCP watch): `pnpm run dev`

Optional:

- Tunnel + dev loop: `pnpm run dev:all:tunnel`
- ngrok + dev loop: `pnpm run dev:all:ngrok`
- UI-only Vite server: `pnpm run dev:vite`

## Validation checklist (run before finishing)

- UI types:
  `pnpm exec tsc -p tsconfig.app.json --noEmit`
- Node/build script types:
  `pnpm exec tsc -p tsconfig.node.json --noEmit`
- MCP server types:
  `pnpm exec tsc -p tsconfig.mcp.json --noEmit`
- Production assets build:
  `pnpm run build`

## Common pitfalls

- Tool added but not exported in `tools/index.ts`.
- Mismatch between `ui` and actual template URI expectations.
- Mismatch between `ui` and built asset basename.
- Starting MCP server before building assets (server will fail to find HTML).

## Conventions

- Prefer `.tsx` for React entrypoints/components.
- Keep imports extensionless in TS files (repo uses bundler module resolution).
- Keep helper/util code generic (`ToolDefinition`, `WidgetCatalog`, etc.).
- Keep one tool per file under `tools/`.
