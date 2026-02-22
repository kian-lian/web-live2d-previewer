"use client";

import dynamic from "next/dynamic";

const Live2DViewer = dynamic(() => import("@/components/live2d-viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center">
      <div className="text-muted-foreground">Initializing Live2D...</div>
    </div>
  ),
});

export default function Home() {
  return <Live2DViewer />;
}
