"use client";

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
