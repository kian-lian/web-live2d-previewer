import type { RefObject } from "react";

interface Live2DCanvasProps {
  containerRef: RefObject<HTMLDivElement | null>;
  isLoading: boolean;
  error: string | null;
}

export function Live2DCanvas({
  containerRef,
  isLoading,
  error,
}: Live2DCanvasProps) {
  return (
    <div
      ref={containerRef}
      className="flex-1 relative bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800"
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-muted-foreground">Loading model...</div>
        </div>
      )}
      {error && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded-lg px-6 py-4 max-w-md text-center text-sm">
            {error}
          </div>
        </div>
      )}
    </div>
  );
}
