"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_MODEL, type ModelName, getModelPath, MODEL_NAMES } from "@/lib/live2d-config";

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
      const settings: any = model.internalModel?.settings;
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
