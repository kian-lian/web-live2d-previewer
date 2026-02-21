# Live2D Character Viewer Design

## Overview

A full-screen Live2D character viewer with sidebar controls for model switching, expression triggering, and motion triggering. Uses `pixi-live2d-display` + `pixi.js 6.x` to render 8 available Live2D models.

## Architecture

### Layout

- **Canvas area** (flex-grow): Pixi.js renders the Live2D model on a transparent canvas
- **Sidebar** (~300px fixed): Control panel with model selector, expression buttons, motion buttons

### Components

| Component | Responsibility |
|-----------|---------------|
| `Live2dModel` | Main component. Manages PIXI.Application, canvas, model lifecycle |
| `ModelSelector` | Dropdown to switch between 8 models |
| `ExpressionPanel` | Dynamic button list of available expressions for current model |
| `MotionPanel` | Dynamic button list of available motions for current model |

### State (React useState)

```typescript
currentModel: string              // Model name, e.g. "Haru"
modelInstance: Live2DModel | null  // pixi-live2d-display instance
isLoading: boolean                // Loading indicator
availableExpressions: string[]    // Expressions for current model
availableMotions: Record<string, { name: string; index: number }[]>
```

## Data Flow

### Model Switching

1. User selects model from dropdown
2. Set `isLoading = true`
3. Destroy current model instance
4. Load new model via `Live2DModel.from("/live2d/{name}/{name}.model3.json")`
5. Parse expressions and motions from loaded model
6. Center and scale model to fit canvas
7. Set `isLoading = false`

### Expression Triggering

User clicks expression button -> `model.expression(name)` -> model changes expression.

### Motion Triggering

User clicks motion button -> `model.motion(group, index)` -> model plays motion.

### Mouse Interaction

- **Eye tracking**: `mousemove` on canvas -> `model.focus(x, y)` -> eyes follow cursor
- **Click interaction**: Click on model hit areas -> trigger random motion for that area

## Model Configuration

```typescript
const MODEL_CONFIG = {
  Haru:   { path: "/live2d/Haru/Haru.model3.json" },
  Hiyori: { path: "/live2d/Hiyori/Hiyori.model3.json" },
  Mao:    { path: "/live2d/Mao/Mao.model3.json" },
  Mark:   { path: "/live2d/Mark/Mark.model3.json" },
  Natori: { path: "/live2d/Natori/Natori.model3.json" },
  Ren:    { path: "/live2d/Ren/Ren.model3.json" },
  Rice:   { path: "/live2d/Rice/Rice.model3.json" },
  Wanko:  { path: "/live2d/Wanko/Wanko.model3.json" },
}
```

### Model Capabilities

| Model | Expressions | Motions | Sounds | Hit Areas |
|-------|-------------|---------|--------|-----------|
| Haru | 8 | 27 | 4 | Head, Body |
| Hiyori | 0 | 10 | 0 | - |
| Mao | 8 | 8 | 0 | - |
| Mark | 0 | 6 | 0 | - |
| Natori | 11 | 8 | 0 | Head, Body |
| Ren | 5 | 3 | 0 | - |
| Rice | 0 | 4 | 0 | - |
| Wanko | 0 | 12 | 0 | Body |

## Technical Details

### Pixi Application Lifecycle

- Create `PIXI.Application` with `transparent: true` on mount
- Use `useRef` for app and canvas references
- Destroy app on unmount to free WebGL resources
- Use `ResizeObserver` to track container size changes and resize canvas

### Dynamic Expression/Motion Discovery

After model loads, read available expressions and motions from:
- `model.internalModel.motionManager`
- `model.internalModel.settings`

Sidebar renders buttons dynamically based on current model's capabilities.

### Responsive Layout

- Canvas area: `flex: 1`, fills remaining space
- Sidebar: `w-[300px]` fixed width
- Full viewport height layout

## Stack

- Next.js 16 + React 19 + TypeScript
- pixi.js 6.x + pixi-live2d-display 0.4.0
- Tailwind CSS 4 + shadcn UI components
- Live2D Cubism Core (loaded via Script tag in layout)
