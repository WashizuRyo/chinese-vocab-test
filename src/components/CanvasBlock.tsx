"use client";

import { HandwritingCanvas, type HandwritingCanvasHandle } from "@/components/HandwritingCanvas";

export function CanvasBlock({
  label,
  canvasRef,
  aspectRatio,
}: {
  label: string;
  canvasRef: React.RefObject<HandwritingCanvasHandle | null>;
  aspectRatio: number;
}) {
  return (
    <div className="handwriting-practice">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
        <button
          type="button"
          onClick={() => canvasRef.current?.clear()}
          className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 active:bg-zinc-50"
        >
          クリア
        </button>
      </div>
      <HandwritingCanvas ref={canvasRef} aspectRatio={aspectRatio} ariaLabel={`${label}の手書き`} />
    </div>
  );
}
