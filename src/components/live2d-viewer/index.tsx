"use client";

import { Live2DCanvas } from "./live2d-canvas";
import { Live2DSidebar } from "./live2d-sidebar";
import { useLive2D } from "./use-live2d";

export default function Live2DViewer() {
  const {
    containerRef,
    isLoading,
    error,
    expressions,
    motions,
    selectedModel,
    setSelectedModel,
    playExpression,
    playMotion,
  } = useLive2D();

  return (
    <div className="flex h-screen w-screen">
      <Live2DCanvas
        containerRef={containerRef}
        isLoading={isLoading}
        error={error}
      />
      <Live2DSidebar
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        expressions={expressions}
        onPlayExpression={playExpression}
        motions={motions}
        onPlayMotion={playMotion}
        isLoading={isLoading}
      />
    </div>
  );
}
