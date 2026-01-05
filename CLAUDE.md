# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

youtube-videogata is a plugin for the [Videogata](https://github.com/InfoGata/videogata) media player that enables YouTube video support. It bridges multiple video source APIs (YouTube, Piped, Invidious, Innertube) to provide unified video playback and discovery.

## Build Commands

```bash
npm run build           # Full build: tsc + all Vite builds
npm run build:options   # Build options UI (vite.config.ts)
npm run build:plugin    # Build plugin script (plugin.vite.config.ts)
npm run build:player    # Build player (player.vite.config.ts)
npm test                # Run tests with Vitest
npm run test:coverage   # Run tests with coverage
```

The build produces three outputs in `dist/`:
- `index.js` - Plugin main script
- `options.html` - Settings UI (single-file bundle)
- `player.html` - YouTube player (single-file bundle)

## Architecture

### Multi-Entry-Point Design

The plugin uses three separate Vite configurations for different entry points:

1. **Plugin Main** (`src/index.ts` → `dist/index.js`): Registers handlers on the global `application` object for search, playlists, channels, and URL parsing
2. **Options Page** (`src/options.tsx` → `dist/options.html`): Preact-based settings UI with shadcn/ui components
3. **Player** (`src/player.ts` → `dist/player.html`): Standalone YouTube player iframe

### Backend Providers

Four video source backends with conditional routing based on settings:

- **youtube.ts** - OAuth authentication, user playlists, official YouTube API
- **piped.ts** - Privacy-focused alternative (default for trending/public content)
- **innertube-api.ts** - Uses youtubei.js, no CORS required
- **invidious.ts** - Legacy fallback support

### Key Patterns

- **Message passing**: Plugin communicates with options UI via `postMessage`
- **Multi-provider routing**: Search and content functions route to different backends based on user settings and CORS requirements
- **Token refresh**: OAuth tokens auto-refresh via ky HTTP client hooks in `shared.ts`

### Important Files for Understanding

- `src/index.ts` - All plugin API handler registrations
- `src/shared.ts` - Types, auth utilities, localStorage wrappers
- `src/piped.ts` - Primary backend implementation (good reference for API patterns)

## Tech Stack

- **Preact** for UI (aliased as React)
- **Tailwind CSS v4** with shadcn/ui components
- **Vite** with `vite-plugin-singlefile` for bundling
- **TypeScript 5** with strict checking
- **Vitest** with jsdom for testing
