# Live2D Model Web Previewer

A modern Live2D model web previewer built with Next.js 16 and React 19, providing smooth character model interaction experience.

## Features

- 🎭 **Multiple Models** - 8 built-in Live2D character models (Haru, Hiyori, Mao, Mark, Natori, Ren, Rice, Wanko)
- 👁️ **Eye Tracking** - Character eyes follow mouse cursor in real-time
- 🖱️ **Click Interaction** - Click on character to trigger interactive animations
- 😊 **Expression Switching** - Support for all built-in model expressions
- 💃 **Motion Playback** - Browse and play all motions by category
- 📱 **Responsive Design** - Auto-scaling canvas size
- 🌙 **Dark Mode** - Full dark theme support

## Tech Stack

- **Next.js 16** - React full-stack framework
- **React 19** - UI component library
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling framework
- **pixi.js 6.x** - WebGL 2D rendering engine
- **pixi-live2d-display** - Live2D rendering plugin
- **Cubism 4 SDK** - Live2D official WASM runtime
- **shadcn/ui** - UI component library
- **Biome** - Code linting and formatting

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm/yarn

### Installation

```bash
# Clone the project
git clone https://github.com/kian-lian/web-live2d-previewer
cd web-live2d-preview

# Install dependencies
pnpm install
```

### Development

```bash
# Start development server
pnpm dev
```

Visit http://localhost:3000 to view the application.

### Build

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

### Code Quality

```bash
# Run linting
pnpm lint

# Format code
pnpm format
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout, loads Cubism Core WASM
│   ├── page.tsx            # Home page (dynamic import, SSR disabled)
│   └── globals.css         # Global styles
├── components/
│   ├── live2d-viewer/      # Live2D viewer components
│   │   ├── index.tsx       # Main container component
│   │   ├── live2d-canvas.tsx   # Canvas rendering area
│   │   ├── live2d-sidebar.tsx  # Control sidebar
│   │   └── use-live2d.ts   # Custom hook (core logic)
│   └── ui/                 # shadcn UI components
└── lib/
    ├── live2d-config.ts    # Model configuration
    └── utils.ts            # Utility functions
```

## Usage

1. **Select Model** - Choose different character models from the sidebar dropdown
2. **Mouse Tracking** - Move mouse over the canvas area, character will follow your cursor
3. **Click Interaction** - Click on character to trigger built-in interaction points
4. **Switch Expression** - Click buttons in the "Expressions" section to change character expressions
5. **Play Motion** - Click buttons in the "Motions" section to play character motions

## Adding New Models

1. Place model files in `public/live2d/{ModelName}/` directory
2. Ensure the directory contains `{ModelName}.model3.json` entry file
3. Add model configuration in `src/lib/live2d-config.ts`:

```typescript
export const modelNames = [
  // ... existing models
  "YourModelName",
];
```

## Technical Details

### Live2D Integration

The project uses Cubism 4 SDK to render Live2D models:

- **WASM Runtime** - Loaded via `<Script>` tag in `layout.tsx`
- **Pixi.js v6** - Must use v6 (v7/v8 are incompatible)
- **SSR Disabled** - Uses `dynamic(ssr: false)` to avoid server-side rendering issues

### Performance Optimizations

- **RAF Throttling** - Mouse move events throttled via `requestAnimationFrame`
- **Module Caching** - Live2D module imported as singleton to avoid redundant loading
- **AbortController** - Async operations are cancellable to prevent memory leaks

## Browser Support

Supports all modern browsers (requires WebGL):

- Chrome 70+
- Firefox 65+
- Safari 14+
- Edge 79+

## License

MIT

## Acknowledgments

- [Live2D Inc.](https://www.live2d.com/) - Live2D Cubism SDK
- [pixi-live2d-display](https://github.com/guansss/pixi-live2d-display) - Live2D rendering library
- [shadcn/ui](https://ui.shadcn.com/) - UI component library
