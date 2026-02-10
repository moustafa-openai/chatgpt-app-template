# Apps SDK Pizzaz Examples

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Focused Apps SDK + MCP example centered on Pizzaz widgets.

## Project layout

- `index.ts` - MCP server entrypoint (SSE + tool wiring)
- `tools/` - MCP tool definitions (one file per tool)
- `utils/` - generic MCP server plumbing/helpers
- `ui/` - React widget source code
- `assets/` - built widget HTML/JS/CSS output
- `build-all.mts` - widget production build script
- `vite.config.mts` - local widget dev server config

## Prerequisites

- Node.js 18+
- pnpm

## Install

```bash
pnpm install
```

Optional local config:

```bash
cp .env.example .env
```

- `MCP_PORT` controls MCP server port (default `8000`)
- `LT_SUBDOMAIN` sets reusable localtunnel subdomain

## Smooth local dev

Run everything with one command:

```bash
pnpm run dev
```

This does:

- initial asset build
- UI rebuild watch on `ui/**`
- MCP server watch/restart on backend changes
- serves widget assets from MCP server at `/assets/*`

With tunnel:

```bash
pnpm run dev:all:tunnel
```

With ngrok instead:

```bash
pnpm run dev:all:ngrok
```

## Common commands

Build widget assets:

```bash
pnpm run build
```

Run MCP server:

```bash
pnpm run mcp:start
```

Run MCP server in watch mode:

```bash
pnpm run mcp:dev
```

Run Vite UI dev server only:

```bash
pnpm run dev:vite
```

Optional separate static asset serving (not needed for normal MCP dev):

```bash
BASE_URL=http://localhost:4444 pnpm run build
pnpm run serve
```

## MCP endpoints

Default (`MCP_PORT=8000`):

- `GET /mcp`
- `POST /mcp/messages?sessionId=...`
- `GET /assets/*`

## ChatGPT connector (local)

If using a tunnel, add this MCP URL in ChatGPT developer mode:

```text
https://<your-tunnel-domain>/mcp
```

## Deploy note

If assets are hosted elsewhere, override `BASE_URL` when building:

```bash
BASE_URL=https://your-server.com pnpm run build
```
