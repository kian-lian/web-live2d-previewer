# Desktop Live2D Pet Design

## Overview

Implement a desktop pet application using Tauri 2, reusing the Live2D rendering core from `web-live2d-preview`. The character floats on a transparent borderless window, with click-through on transparent areas and a right-click context menu for control.

## Target Project

- **Source**: `/Users/lian/dev/my-projects/web-live2d-preview` (Next.js 16 + Pixi.js 6 + pixi-live2d-display)
- **Target**: `/Users/lian/dev/my-projects/desktop-live2d` (Tauri 2 + React 19 + Vite 7)

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Code sharing strategy | Direct copy (not shared package) | ~280 lines of core code; desktop and web needs will diverge; avoid premature abstraction |
| Desktop UI mode | Desktop pet (transparent borderless) | User requirement |
| Mouse passthrough | Click-through on transparent pixels | Character-only interaction, rest passes to desktop |
| Mouse eye tracking | Deferred | Not needed for MVP |
| Right-click menu | React component (not native menu) | Dynamic expression/motion lists, easier to extend |

## Architecture

```
desktop-live2d/
├── src/
│   ├── main.tsx
│   ├── App.tsx                     # Mount DesktopPet, no other UI
│   ├── components/
│   │   └── desktop-pet/
│   │       ├── index.tsx           # Fullscreen transparent canvas + interactions
│   │       ├── use-live2d.ts       # Copied from web, minimal adaptation
│   │       └── context-menu.tsx    # Right-click floating menu
│   └── lib/
│       └── live2d-config.ts        # Copied from web, path adjustments
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs                  # Tauri commands: set_cursor_passthrough
│   │   └── main.rs
│   └── tauri.conf.json             # Transparent + borderless + always-on-top
└── public/
    └── live2d/                     # Existing model assets (unchanged)
```

## Tauri Window Configuration

Key `tauri.conf.json` changes:

- `transparent: true` -- window background transparent
- `decorations: false` -- no title bar or border
- `alwaysOnTop: true` -- stay above other windows
- Window size set to screen dimensions (fullscreen transparent canvas)
- `csp: null` -- keep disabled for development

## Mouse Passthrough Mechanism

```
Mouse move event (when window is not in passthrough mode)
  ↓
Frontend: check if cursor is over character pixels (canvas hit test)
  ↓
├─ On character → invoke Tauri: set_cursor_passthrough(false)
│                → respond to drag / click / right-click
└─ Not on character → invoke Tauri: set_cursor_passthrough(true)
                    → mouse events pass through to desktop
```

When passthrough is enabled, the window stops receiving mouse events. A Rust-side timer polls global cursor position and re-checks if cursor has returned to character bounds, then disables passthrough.

## use-live2d.ts Adaptation

Changes from web version:

1. Remove `window.PIXI` assignment guard -- Vite imports directly, no Next.js dynamic import needed
2. Remove SSR-related AbortController checks -- Tauri frontend is always client-side
3. Keep `backgroundAlpha: 0` -- already set in web version
4. No UI-layer changes needed -- hook contains no UI code
5. Model paths unchanged -- `/live2d/...` works the same in Vite public dir

## Right-Click Context Menu

React floating component, positioned at cursor on right-click:

- **Model switch** -- sub-menu listing 8 available models
- **Expressions** -- dynamically populated from current model
- **Motions** -- dynamically populated from current model
- **Exit** -- calls Tauri process exit

## Character Dragging

Left-click and hold on character initiates drag. Movement updates model `x/y` coordinates within Pixi stage (window itself stays fullscreen).

## Implementation Steps

1. **Tauri window config** -- transparent, borderless, always-on-top, fullscreen size
2. **Install deps & copy core** -- pixi.js@6, pixi-live2d-display; copy use-live2d.ts and live2d-config.ts
3. **Desktop pet component** -- fullscreen transparent canvas, load and render model
4. **Mouse passthrough** -- Rust command + frontend hit test + polling recovery
5. **Character dragging** -- left-click drag updates model position
6. **Right-click menu** -- context-menu.tsx with model/expression/motion controls
