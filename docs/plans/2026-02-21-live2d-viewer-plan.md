# Live2D Character Viewer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-screen Live2D character viewer with sidebar controls for model switching, expression triggering, motion triggering, and mouse interaction.

**Architecture:** Single-page app using pixi-live2d-display on a Pixi.js canvas for rendering, with a React sidebar for controls. The Live2D component is client-only (uses `"use client"` directive). State lives in the main component and is passed down to sidebar sub-components.

**Tech Stack:** Next.js 16, React 19, TypeScript, pixi.js 6.x, pixi-live2d-display 0.4.0, Tailwind CSS 4, shadcn UI (new-york style)

---

### Task 1: Install required shadcn UI components

**Files:**
- Create: `src/components/ui/button.tsx` (via shadcn CLI)
- Create: `src/components/ui/select.tsx` (via shadcn CLI)
- Create: `src/components/ui/scroll-area.tsx` (via shadcn CLI)
- Create: `src/components/ui/separator.tsx` (via shadcn CLI)
- Create: `src/components/ui/badge.tsx` (via shadcn CLI)

**Step 1: Install shadcn components**

Run:
```bash
npx shadcn@latest add button select scroll-area separator badge
```

Expected: Components created in `src/components/ui/`

**Step 2: Verify components exist**

Run:
```bash
ls src/components/ui/
```

Expected: `button.tsx`, `select.tsx`, `scroll-area.tsx`, `separator.tsx`, `badge.tsx`

**Step 3: Commit**

```bash
git add src/components/ui/
git commit -m "feat: add shadcn UI components for Live2D viewer controls"
```

---

### Task 2: Create model configuration and types

**Files:**
- Create: `src/lib/live2d-config.ts`

**Step 1: Create the model config file**

Write `src/lib/live2d-config.ts`:

```typescript
export const MODEL_NAMES = [
  "Haru",
  "Hiyori",
  "Mao",
  "Mark",
  "Natori",
  "Ren",
  "Rice",
  "Wanko",
] as const;

export type ModelName = (typeof MODEL_NAMES)[number];

export function getModelPath(name: ModelName): string {
  return `/live2d/${name}/${name}.model3.json`;
}

export const DEFAULT_MODEL: ModelName = "Haru";
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors (or only pre-existing errors unrelated to our file)

**Step 3: Commit**

```bash
git add src/lib/live2d-config.ts
git commit -m "feat: add Live2D model configuration and types"
```

---

### Task 3: Implement core Live2D canvas rendering

This is the core task. The `Live2dModel` component initializes a Pixi.js application, loads a Live2D model, and handles canvas sizing.

**Files:**
- Modify: `src/components/live2d-model.tsx`

**Step 1: Implement the Live2D renderer component**

Replace `src/components/live2d-model.tsx` with:

```typescript
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_MODEL, type ModelName, getModelPath, MODEL_NAMES } from "@/lib/live2d-config";

// pixi-live2d-display and pixi.js are loaded at runtime via window globals
// and the /live2dcubismcore.min.js script in layout.tsx.
// We dynamic-import them to avoid SSR issues.

type MotionGroup = { group: string; name: string; index: number };

export default function Live2dViewer() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);
  const modelRef = useRef<any>(null);

  const [currentModel, setCurrentModel] = useState<ModelName>(DEFAULT_MODEL);
  const [isLoading, setIsLoading] = useState(true);
  const [expressions, setExpressions] = useState<string[]>([]);
  const [motions, setMotions] = useState<MotionGroup[]>([]);

  // Initialize Pixi app once
  const initApp = useCallback(async (container: HTMLDivElement) => {
    const PIXI = await import("pixi.js");

    const app = new PIXI.Application({
      backgroundAlpha: 0,
      resizeTo: container,
      antialias: true,
    });
    container.appendChild(app.view as HTMLCanvasElement);
    appRef.current = app;
    return app;
  }, []);

  // Load a model into the Pixi stage
  const loadModel = useCallback(
    async (app: any, modelName: ModelName) => {
      setIsLoading(true);

      // Remove old model
      if (modelRef.current) {
        app.stage.removeChild(modelRef.current);
        modelRef.current.destroy();
        modelRef.current = null;
      }

      // Dynamic import to avoid SSR
      const { Live2DModel } = await import("pixi-live2d-display");

      const model = await Live2DModel.from(getModelPath(modelName), {
        autoInteract: false,
      });

      // Scale and center
      const scaleX = app.screen.width / model.width;
      const scaleY = app.screen.height / model.height;
      const scale = Math.min(scaleX, scaleY) * 0.8;
      model.scale.set(scale);
      model.x = (app.screen.width - model.width * scale) / 2;
      model.y = (app.screen.height - model.height * scale) / 2;

      app.stage.addChild(model);
      modelRef.current = model;

      // Extract expressions
      const exprList: string[] = [];
      const settings = model.internalModel?.settings;
      if (settings?.expressions) {
        for (const expr of settings.expressions) {
          exprList.push(expr.Name || expr.name);
        }
      }
      setExpressions(exprList);

      // Extract motions
      const motionList: MotionGroup[] = [];
      const motionDefs = settings?.motions;
      if (motionDefs) {
        for (const [group, items] of Object.entries(motionDefs)) {
          const arr = items as any[];
          arr.forEach((_, index) => {
            motionList.push({
              group,
              name: `${group} #${index + 1}`,
              index,
            });
          });
        }
      }
      setMotions(motionList);
      setIsLoading(false);
    },
    [],
  );

  // Setup Pixi app on mount
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    let destroyed = false;

    (async () => {
      const app = await initApp(container);
      if (destroyed) {
        app.destroy(true);
        return;
      }
      await loadModel(app, currentModel);
    })();

    return () => {
      destroyed = true;
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch model when currentModel changes (skip initial)
  const initialLoadRef = useRef(true);
  useEffect(() => {
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }
    if (appRef.current) {
      loadModel(appRef.current, currentModel);
    }
  }, [currentModel, loadModel]);

  // Mouse tracking for eye follow
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const model = modelRef.current;
      if (!model) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      model.focus(x, y);
    };

    const handleClick = (e: MouseEvent) => {
      const model = modelRef.current;
      if (!model) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      model.tap(x, y);
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("click", handleClick);
    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("click", handleClick);
    };
  }, []);

  // Handle expression trigger
  const triggerExpression = useCallback((name: string) => {
    modelRef.current?.expression(name);
  }, []);

  // Handle motion trigger
  const triggerMotion = useCallback((group: string, index: number) => {
    modelRef.current?.motion(group, index);
  }, []);

  return (
    <div className="flex h-screen w-screen">
      {/* Canvas area */}
      <div
        ref={canvasContainerRef}
        className="flex-1 relative bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-muted-foreground">Loading model...</div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <aside className="w-[300px] border-l bg-card flex flex-col overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold mb-3">Live2D Viewer</h2>
          {/* Model selector */}
          <label className="text-sm text-muted-foreground mb-1 block">
            Model
          </label>
          <select
            value={currentModel}
            onChange={(e) => setCurrentModel(e.target.value as ModelName)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            disabled={isLoading}
          >
            {MODEL_NAMES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Expressions */}
          {expressions.length > 0 && (
            <section>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Expressions ({expressions.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {expressions.map((expr) => (
                  <button
                    key={expr}
                    onClick={() => triggerExpression(expr)}
                    className="px-3 py-1.5 text-xs rounded-md border bg-background hover:bg-accent transition-colors"
                    disabled={isLoading}
                  >
                    {expr}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Motions */}
          {motions.length > 0 && (
            <section>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                Motions ({motions.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {motions.map((m) => (
                  <button
                    key={`${m.group}-${m.index}`}
                    onClick={() => triggerMotion(m.group, m.index)}
                    className="px-3 py-1.5 text-xs rounded-md border bg-background hover:bg-accent transition-colors"
                    disabled={isLoading}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </section>
          )}

          {!isLoading && expressions.length === 0 && motions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              This model has no expressions or motions.
            </p>
          )}
        </div>

        <div className="p-4 border-t text-xs text-muted-foreground">
          Click the model to trigger tap interaction. Move your mouse to have
          the character follow your cursor.
        </div>
      </aside>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No type errors in our files (pixi-live2d-display may lack types, which is fine with `any` refs)

**Step 3: Commit**

```bash
git add src/components/live2d-model.tsx
git commit -m "feat: implement Live2D viewer with canvas rendering and sidebar controls"
```

---

### Task 4: Update page.tsx to use the full-screen viewer

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Update the page to render the viewer full-screen**

Replace `src/app/page.tsx` with:

```typescript
import dynamic from "next/dynamic";

const Live2dViewer = dynamic(() => import("@/components/live2d-model"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="text-muted-foreground">Initializing Live2D...</div>
    </div>
  ),
});

export default function Home() {
  return <Live2dViewer />;
}
```

Note: `dynamic` with `ssr: false` is critical because pixi.js and pixi-live2d-display require browser APIs (Canvas, WebGL). Without this, Next.js SSR will crash.

**Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: render Live2D viewer with dynamic import (SSR disabled)"
```

---

### Task 5: Verify the app runs correctly

**Step 1: Start the dev server**

Run:
```bash
pnpm dev
```

Expected: Server starts on http://localhost:3000

**Step 2: Manual verification checklist**

Open http://localhost:3000 in a browser and verify:
- [ ] Canvas renders with Haru model visible
- [ ] Sidebar shows model selector with all 8 models
- [ ] Sidebar shows expressions list (8 for Haru)
- [ ] Sidebar shows motions list (grouped)
- [ ] Clicking an expression button changes the model's expression
- [ ] Clicking a motion button plays the motion
- [ ] Moving mouse over canvas makes eyes follow cursor
- [ ] Clicking on model triggers tap interaction
- [ ] Switching model in dropdown loads a different character
- [ ] Loading indicator shows during model switch
- [ ] Models without expressions show no expression section (e.g., Rice)

**Step 3: Fix any issues found during manual testing**

Common issues to watch for:
- Canvas not resizing: Check that `resizeTo` references the container div
- Model too large/small: Adjust the 0.8 scale factor
- Expressions not discovered: Check that model3.json field names match (some use `Name`, others `name`)

**Step 4: Build check**

Run:
```bash
pnpm build
```

Expected: Build succeeds without errors

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during manual testing"
```

---

### Task 6: Final cleanup and commit

**Step 1: Run lint**

Run:
```bash
pnpm lint
```

Fix any lint issues.

**Step 2: Final commit**

```bash
git add -A
git commit -m "chore: lint cleanup for Live2D viewer"
```
