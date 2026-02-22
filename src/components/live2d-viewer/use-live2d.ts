"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_MODEL,
  getModelPath,
  type ModelName,
} from "@/lib/live2d-config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MotionEntry {
  group: string;
  name: string;
  index: number;
}

/** Narrow interface for the Live2D model settings we actually read. */
interface Live2DSettings {
  expressions?: Array<{ Name?: string; name?: string }>;
  motions?: Record<string, unknown[]>;
}

/** Narrow interface – only the Pixi.Application surface we touch. */
interface PixiApp {
  screen: { width: number; height: number };
  stage: {
    addChild: (child: unknown) => void;
    removeChild: (child: unknown) => void;
  };
  view: HTMLCanvasElement;
  destroy: (removeView?: boolean) => void;
}

/** Narrow interface – only the Live2DModel surface we touch. */
interface Live2DModelHandle {
  width: number;
  height: number;
  x: number;
  y: number;
  scale: { set: (s: number) => void };
  internalModel?: { settings?: Live2DSettings };
  focus: (x: number, y: number) => void;
  tap: (x: number, y: number) => void;
  expression: (name: string) => void;
  motion: (group: string, index: number) => void;
  destroy: () => void;
}

export interface UseLive2DReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isLoading: boolean;
  error: string | null;
  expressions: string[];
  motions: MotionEntry[];
  selectedModel: ModelName;
  setSelectedModel: (name: ModelName) => void;
  playExpression: (name: string) => void;
  playMotion: (group: string, index: number) => void;
}

// ---------------------------------------------------------------------------
// Module-level cache for the dynamic import (resolved once, reused forever)
// ---------------------------------------------------------------------------

let live2dModule: Promise<
  typeof import("pixi-live2d-display/cubism4")
> | null = null;

function getLive2DModule() {
  live2dModule ??= import("pixi-live2d-display/cubism4");
  return live2dModule;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLive2D(): UseLive2DReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const pixiAppRef = useRef<PixiApp | null>(null);
  const live2dModelRef = useRef<Live2DModelHandle | null>(null);
  const rafIdRef = useRef<number>(0);

  const [selectedModel, setSelectedModel] =
    useState<ModelName>(DEFAULT_MODEL);
  const [appReady, setAppReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expressions, setExpressions] = useState<string[]>([]);
  const [motions, setMotions] = useState<MotionEntry[]>([]);

  // ---- Create the Pixi application (called once on mount) ----

  const createPixiApp = useCallback(
    async (container: HTMLDivElement): Promise<PixiApp> => {
      const PIXI = await import("pixi.js");
      // pixi-live2d-display reads window.PIXI at import time
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- required by pixi-live2d-display
      (window as any).PIXI = PIXI;

      const app = new PIXI.Application({
        backgroundAlpha: 0,
        resizeTo: container,
        antialias: true,
      });
      container.appendChild(app.view as HTMLCanvasElement);
      return app as unknown as PixiApp;
    },
    [],
  );

  // ---- Load a Live2D model into the stage ----

  const loadLive2DModel = useCallback(
    async (app: PixiApp, modelName: ModelName, signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);

      // Tear down previous model
      if (live2dModelRef.current) {
        app.stage.removeChild(live2dModelRef.current);
        live2dModelRef.current.destroy();
        live2dModelRef.current = null;
      }

      try {
        const { Live2DModel } = await getLive2DModule();
        if (signal?.aborted) return;

        const model: Live2DModelHandle = (await Live2DModel.from(
          getModelPath(modelName),
          { autoInteract: false },
        )) as unknown as Live2DModelHandle;
        if (signal?.aborted) {
          model.destroy();
          return;
        }

        // Scale & center
        const scaleX = app.screen.width / model.width;
        const scaleY = app.screen.height / model.height;
        model.scale.set(Math.min(scaleX, scaleY) * 0.8);
        model.x = (app.screen.width - model.width) / 2;
        model.y = (app.screen.height - model.height) / 2;

        app.stage.addChild(model);
        live2dModelRef.current = model;

        // Extract expressions
        const settings = model.internalModel?.settings;
        setExpressions(
          (settings?.expressions ?? [])
            .map((e) => e.Name || e.name)
            .filter((n): n is string => Boolean(n)),
        );

        // Extract motions
        const entries: MotionEntry[] = [];
        if (settings?.motions) {
          for (const [group, items] of Object.entries(settings.motions)) {
            (items as unknown[]).forEach((_, index) => {
              entries.push({ group, name: `${group} #${index + 1}`, index });
            });
          }
        }
        setMotions(entries);
      } catch (e) {
        if (signal?.aborted) return;
        console.error(`Failed to load Live2D model "${modelName}":`, e);
        setExpressions([]);
        setMotions([]);
        setError(
          `Failed to load "${modelName}". The model may require a newer Cubism SDK version.`,
        );
      }
      setIsLoading(false);
    },
    [],
  );

  // ---- Initialize Pixi app on mount ----

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const abort = new AbortController();

    createPixiApp(container)
      .then((app) => {
        if (abort.signal.aborted) {
          app.destroy(true);
          return;
        }
        pixiAppRef.current = app;
        setAppReady(true);
      })
      .catch((e) => {
        if (abort.signal.aborted) return;
        console.error("Failed to initialize Pixi app:", e);
        setError("Failed to initialize rendering engine.");
        setIsLoading(false);
      });

    return () => {
      abort.abort();
      pixiAppRef.current?.destroy(true);
      pixiAppRef.current = null;
    };
  }, [createPixiApp]);

  // ---- Load model when app is ready or selection changes ----

  useEffect(() => {
    if (!appReady || !pixiAppRef.current) return;

    const abort = new AbortController();
    loadLive2DModel(pixiAppRef.current, selectedModel, abort.signal);
    return () => abort.abort();
  }, [appReady, selectedModel, loadLive2DModel]);

  // ---- Mouse tracking (rAF-throttled) & click interaction ----

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const model = live2dModelRef.current;
      if (!model) return;
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect();
        model.focus(e.clientX - rect.left, e.clientY - rect.top);
      });
    };

    const handleClick = (e: MouseEvent) => {
      const model = live2dModelRef.current;
      if (!model) return;
      const rect = container.getBoundingClientRect();
      model.tap(e.clientX - rect.left, e.clientY - rect.top);
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("click", handleClick);
    return () => {
      cancelAnimationFrame(rafIdRef.current);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("click", handleClick);
    };
  }, []);

  // ---- Actions ----

  const playExpression = useCallback((name: string) => {
    live2dModelRef.current?.expression(name);
  }, []);

  const playMotion = useCallback((group: string, index: number) => {
    live2dModelRef.current?.motion(group, index);
  }, []);

  return {
    containerRef,
    isLoading,
    error,
    expressions,
    motions,
    selectedModel,
    setSelectedModel,
    playExpression,
    playMotion,
  };
}
