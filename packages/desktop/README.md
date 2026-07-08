# OPC Agent Desktop

Electron shell for the OPC Agent System macOS app.

## Development

Build the NestJS server first, then start Electron:

```bash
pnpm desktop:dev
```

By default the desktop window loads `packages/web/dist/index.html`. To use the Vite dev server during UI development, run the web app separately and pass a URL:

```bash
pnpm dev:web
OPC_DESKTOP_WEB_URL=http://localhost:5173 pnpm desktop:dev
```

## Packaging

```bash
pnpm build:desktop
```

The macOS DMG is written to `release/`.

## Runtime model

- Electron starts the compiled NestJS server from `packages/server/dist/main.js` on a free localhost port.
- The preload script exposes that API URL to the Vue app as `window.opcDesktop.apiBaseUrl`.
- The Vue API client falls back to `/api` outside Electron.

## Production note

The current server still defaults to PostgreSQL. A user-friendly desktop release should add a SQLite TypeORM mode and store local data under Electron's `app.getPath('userData')`.
