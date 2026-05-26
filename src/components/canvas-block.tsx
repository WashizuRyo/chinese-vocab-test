"use client";

import { useRef } from "react";
import { HandwritingCanvas, type HandwritingCanvasHandle } from "@/components/handwriting-canvas";

export function CanvasBlock({
  label,
  canvasRef,
}: {
  label: string;
  canvasRef?: React.RefObject<HandwritingCanvasHandle | null>;
}) {
  const localCanvasRef = useRef<HandwritingCanvasHandle>(null);
  const handwritingCanvasRef = canvasRef ?? localCanvasRef;

  return (
    <div className="disable-text-selection">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</span>
        <button
          type="button"
          onClick={() => handwritingCanvasRef.current?.clear()}
          className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 active:bg-zinc-50"
        >
          クリア
        </button>
      </div>
      <HandwritingCanvas ref={handwritingCanvasRef} ariaLabel={`${label}の手書き`} />
    </div>
  );
}
