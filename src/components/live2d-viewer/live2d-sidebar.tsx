import { MODEL_NAMES, type ModelName } from "@/lib/live2d-config";
import type { MotionEntry } from "./use-live2d";

interface Live2DSidebarProps {
  selectedModel: ModelName;
  onModelChange: (name: ModelName) => void;
  expressions: string[];
  onPlayExpression: (name: string) => void;
  motions: MotionEntry[];
  onPlayMotion: (group: string, index: number) => void;
  isLoading: boolean;
}

export function Live2DSidebar({
  selectedModel,
  onModelChange,
  expressions,
  onPlayExpression,
  motions,
  onPlayMotion,
  isLoading,
}: Live2DSidebarProps) {
  return (
    <aside className="w-[300px] border-l bg-card flex flex-col overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-3">Live2D Viewer</h2>
        <label className="text-sm text-muted-foreground mb-1 block">
          Model
        </label>
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value as ModelName)}
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
        {expressions.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Expressions ({expressions.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {expressions.map((expr) => (
                <button
                  key={expr}
                  onClick={() => onPlayExpression(expr)}
                  className="px-3 py-1.5 text-xs rounded-md border bg-background hover:bg-accent transition-colors"
                  disabled={isLoading}
                >
                  {expr}
                </button>
              ))}
            </div>
          </section>
        )}

        {motions.length > 0 && (
          <section>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Motions ({motions.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {motions.map((m) => (
                <button
                  key={`${m.group}-${m.index}`}
                  onClick={() => onPlayMotion(m.group, m.index)}
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
        Click the model to trigger tap interaction. Move your mouse to have the
        character follow your cursor.
      </div>
    </aside>
  );
}
