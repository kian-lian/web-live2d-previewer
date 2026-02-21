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
