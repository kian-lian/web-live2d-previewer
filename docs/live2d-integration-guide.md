# Next.js 项目集成 Live2D 全流程指南

> 基于 web-live2d-preview 项目总结，可复刻到其他 Next.js 项目中。

## 技术栈

- **Next.js 16+** (App Router)
- **pixi.js 6.x** — 2D WebGL 渲染引擎
- **pixi-live2d-display 0.4.0** — Pixi.js 的 Live2D 插件
- **Cubism 4 SDK Core** — Live2D 官方运行时

---

## 阶段一：项目基础与依赖安装

### 1. 创建项目

```bash
npx create-next-app@latest my-live2d-app --typescript --tailwind --app
```

### 2. 安装 Live2D 核心依赖

```bash
pnpm add pixi.js@6.x pixi-live2d-display@^0.4.0
```

> **关键**：`pixi.js` 必须用 **6.x**，`pixi-live2d-display 0.4.0` 只兼容 v6。v7/v8 的 API 已完全重构，会导致运行时错误。

### 3. (可选) 安装 UI 组件库

```bash
pnpm add radix-ui class-variance-authority clsx tailwind-merge lucide-react
npx shadcn init
```

---

## 阶段二：Live2D 资源准备

### 4. 获取 Cubism Core 运行时

从 [Live2D Cubism SDK](https://www.live2d.com/download/cubism-sdk/) 下载，将 `live2dcubismcore.min.js` 放到 `public/` 目录。

### 5. 准备模型资源

目录结构：

```
public/live2d/
└── Haru/
    ├── Haru.model3.json       ← 模型清单文件（入口）
    ├── Haru.moc3              ← 二进制骨骼数据
    ├── Haru.physics3.json     ← 物理模拟参数
    ├── Haru.cdi3.json         ← 显示信息
    ├── Haru.pose3.json        ← 默认姿势
    ├── Haru.2048/
    │   └── texture_00.png     ← 纹理贴图
    ├── expressions/           ← 表情文件
    │   └── F01.exp3.json
    └── motions/               ← 动作文件
        └── haru_g_idle.motion3.json
```

> `.model3.json` 是一切的入口，内部通过相对路径引用其他文件。

### 6. 排除模型资源的 Lint 检查

在 `biome.json`（或 `.eslintignore`）中排除 `public/live2d`。

---

## 阶段三：全局加载 Cubism Core

### 7. 在 layout.tsx 中注入脚本

```tsx
// src/app/layout.tsx
import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script src="/live2dcubismcore.min.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
```

> `strategy="afterInteractive"` 让脚本在页面水合后加载，不阻塞首屏渲染。Cubism Core 是 C++ 编译的 WASM 运行时，必须全局挂载为 `window.Live2DCubismCore`。

---

## 阶段四：模型配置层

### 8. 创建 src/lib/live2d-config.ts

```typescript
export const MODEL_NAMES = ["Haru", "Hiyori", "Mao", "Mark", "Natori", "Ren", "Rice", "Wanko"] as const;

export type ModelName = (typeof MODEL_NAMES)[number];

export function getModelPath(name: ModelName): string {
  return `/live2d/${name}/${name}.model3.json`;
}

export const DEFAULT_MODEL: ModelName = "Haru";
```

> `as const` + 类型推导生成联合类型，确保模型名称类型安全。

---

## 阶段五：核心 Hook 实现

### 9. 模块缓存机制

```typescript
// use-live2d.ts 文件顶部（模块级）
let live2dModule: Promise<typeof import("pixi-live2d-display/cubism4")> | null = null;

function getLive2DModule() {
  live2dModule ??= import("pixi-live2d-display/cubism4");
  return live2dModule;
}
```

### 10. 定义窄接口类型（Narrow Interface）

只定义 hook 实际使用的属性，降低与第三方库的耦合：

```typescript
interface PixiApp {
  screen: { width: number; height: number };
  stage: { addChild(child: unknown): void; removeChild(child: unknown): void };
  view: HTMLCanvasElement;
  destroy(removeView?: boolean): void;
}

interface Live2DModelHandle {
  width: number; height: number; x: number; y: number;
  scale: { set: (s: number) => void };
  internalModel?: { settings?: Live2DSettings };
  focus(x: number, y: number): void;
  tap(x: number, y: number): void;
  expression(name: string): void;
  motion(group: string, index: number): void;
  destroy(): void;
}

interface Live2DSettings {
  expressions?: Array<{ Name?: string; name?: string }>;
  motions?: Record<string, unknown[]>;
}
```

### 11. 创建 Pixi App

```typescript
const createPixiApp = useCallback(async (container: HTMLDivElement) => {
  const PIXI = await import("pixi.js");
  (window as any).PIXI = PIXI; // 必须在 import pixi-live2d-display 之前设置

  const app = new PIXI.Application({
    backgroundAlpha: 0,    // 透明背景
    resizeTo: container,   // 跟随容器自适应
    antialias: true,       // 抗锯齿
  });
  container.appendChild(app.view as HTMLCanvasElement);
  return app;
}, []);
```

### 12. 加载模型并居中

```typescript
const loadLive2DModel = useCallback(async (app, modelName, signal?) => {
  setIsLoading(true);

  // 1. 清理旧模型
  if (live2dModelRef.current) {
    app.stage.removeChild(live2dModelRef.current);
    live2dModelRef.current.destroy();
  }

  // 2. 加载新模型
  const { Live2DModel } = await getLive2DModule();
  const model = await Live2DModel.from(getModelPath(modelName), { autoInteract: false });

  // 3. 缩放到 80% 适配 + 居中
  const scaleX = app.screen.width / model.width;
  const scaleY = app.screen.height / model.height;
  model.scale.set(Math.min(scaleX, scaleY) * 0.8);
  model.x = (app.screen.width - model.width) / 2;
  model.y = (app.screen.height - model.height) / 2;

  // 4. 挂到舞台
  app.stage.addChild(model);
  live2dModelRef.current = model;

  // 5. 提取表情列表
  const settings = model.internalModel?.settings;
  setExpressions(
    (settings?.expressions ?? [])
      .map((e) => e.Name || e.name)
      .filter((n): n is string => Boolean(n))
  );

  // 6. 提取动作列表
  const entries = [];
  if (settings?.motions) {
    for (const [group, items] of Object.entries(settings.motions)) {
      (items as unknown[]).forEach((_, index) => {
        entries.push({ group, name: `${group} #${index + 1}`, index });
      });
    }
  }
  setMotions(entries);
  setIsLoading(false);
}, []);
```

### 13. 生命周期管理（3 个 useEffect）

| Effect | 触发条件 | 职责 |
|--------|----------|------|
| 初始化 | mount 时 | 创建 Pixi App，设 `appReady=true` |
| 加载模型 | `appReady` 或 `selectedModel` 变化 | 加载/切换模型，AbortController 取消旧请求 |
| 鼠标交互 | mount 时 | 注册 mousemove（眼球跟踪）和 click（点击互动） |

### 14. 交互功能实现

```typescript
// 眼球跟随（RAF 节流，每帧最多更新一次）
const handleMouseMove = (e: MouseEvent) => {
  cancelAnimationFrame(rafIdRef.current);
  rafIdRef.current = requestAnimationFrame(() => {
    const rect = container.getBoundingClientRect();
    model.focus(e.clientX - rect.left, e.clientY - rect.top);
  });
};

// 点击互动（触发模型内置点击区域响应）
const handleClick = (e: MouseEvent) => {
  const rect = container.getBoundingClientRect();
  model.tap(e.clientX - rect.left, e.clientY - rect.top);
};

// 播放表情（从侧边栏按钮触发）
const playExpression = useCallback((name: string) => {
  live2dModelRef.current?.expression(name);
}, []);

// 播放动作（从侧边栏按钮触发）
const playMotion = useCallback((group: string, index: number) => {
  live2dModelRef.current?.motion(group, index);
}, []);
```

---

## 阶段六：组件拆分

### 15. 三文件组件结构

```
src/components/live2d-viewer/
├── index.tsx          ← 主容器，调用 useLive2D()，组合子组件（"use client"）
├── live2d-canvas.tsx  ← 画布容器 + loading/error 状态覆盖层
├── live2d-sidebar.tsx ← 控制面板：模型选择、表情按钮、动作按钮
└── use-live2d.ts      ← 自定义 Hook：所有 Live2D 逻辑
```

### 16. 主组件标记 "use client"

```tsx
// index.tsx
"use client";
```

---

## 阶段七：页面接入（SSR 绕过）

### 17. 动态导入

```tsx
// src/app/page.tsx
import dynamic from "next/dynamic";

const Live2DViewer = dynamic(() => import("@/components/live2d-viewer"), {
  ssr: false, // 关键：禁用 SSR
  loading: () => <div>Initializing Live2D...</div>,
});

export default function Home() {
  return <Live2DViewer />;
}
```

---

## 可复刻 Checklist

```
阶段一：项目基础
  □ 创建 Next.js + TypeScript + Tailwind 项目
  □ 安装 pixi.js@6.x 和 pixi-live2d-display@^0.4.0
  □ (可选) 安装 UI 组件库

阶段二：资源准备
  □ 下载 live2dcubismcore.min.js → public/
  □ 放置模型文件 → public/live2d/{ModelName}/
  □ 确认 .model3.json 内相对路径正确
  □ 排除 public/live2d 的 lint 检查

阶段三：全局脚本
  □ layout.tsx 用 <Script strategy="afterInteractive"> 加载 Cubism Core

阶段四：配置层
  □ 创建 live2d-config.ts（模型名列表、路径函数、默认模型）

阶段五：核心 Hook
  □ 模块级缓存 pixi-live2d-display 的 import Promise
  □ 定义窄接口类型（PixiApp, Live2DModelHandle, Live2DSettings）
  □ createPixiApp：动态 import pixi.js → 设 window.PIXI → new Application
  □ loadLive2DModel：清理旧模型 → Live2DModel.from() → 缩放居中 → 提取表情/动作
  □ Effect 1：mount 时创建 Pixi App
  □ Effect 2：appReady/selectedModel 变化时加载模型（带 AbortController）
  □ Effect 3：注册鼠标跟随（RAF 节流）+ 点击互动
  □ 暴露 playExpression / playMotion 回调

阶段六：组件拆分
  □ index.tsx — 主容器组件（"use client"，组合 hook + 子组件）
  □ live2d-canvas.tsx — 画布 + loading/error 覆盖层
  □ live2d-sidebar.tsx — 模型选择、表情列表、动作列表

阶段七：页面接入
  □ page.tsx 用 dynamic(ssr: false) 导入 Live2DViewer
```

---

## 关键踩坑备忘

| 问题 | 原因 | 解法 |
|------|------|------|
| `Canvas is not defined` | SSR 环境无 DOM | `dynamic(ssr: false)` |
| `Cannot read 'Ticker' of undefined` | `window.PIXI` 未设置 | 在 `import("pixi-live2d-display")` **之前**设置 |
| pixi v7/v8 运行崩溃 | pixi-live2d-display 只兼容 v6 | 锁定 `pixi.js@6.x` |
| 切模型时旧模型残留 | 未清理 stage 子节点 | `removeChild` + `destroy()` |
| 鼠标跟随掉帧 | mousemove 触发频率过高 | RAF 节流（`requestAnimationFrame`） |
| 组件卸载后 setState 报错 | 异步加载完成时组件已卸载 | `AbortController` + signal 检查 |

---

## 数据流概览

```
layout.tsx
  └─ <Script> 加载 live2dcubismcore.min.js（全局 window.Live2DCubismCore）

page.tsx
  └─ dynamic(ssr: false) 加载 Live2DViewer

Live2DViewer/index.tsx ("use client")
  └─ useLive2D() hook
      ├─ Effect 1: import("pixi.js") → window.PIXI = PIXI → new Application()
      ├─ Effect 2: import("pixi-live2d-display/cubism4") → Live2DModel.from(path)
      │             → 缩放居中 → app.stage.addChild(model)
      │             → 提取 expressions / motions
      └─ Effect 3: mousemove → model.focus(x,y)  [RAF throttled]
                    click    → model.tap(x,y)
```
