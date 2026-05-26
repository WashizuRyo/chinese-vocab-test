"use client";

import type { Ref } from "react";
import { useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";

export interface HandwritingCanvasHandle {
  clear: () => void;
  getDataURL: () => string | null;
}

interface Point {
  x: number;
  y: number;
}

const STROKE_COLOR = "#111111";
const GRID_COLOR = "#dcdcdc";
const STROKE_WIDTH = 8.5;
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 288;

export function HandwritingCanvas({
  ariaLabel = "手書き入力",
  ref,
}: {
  ariaLabel?: string;
  ref: Ref<HandwritingCanvasHandle>;
}) {
  const inkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);

  useLayoutEffect(() => {
    const grid = gridCanvasRef.current;
    const ink = inkCanvasRef.current;
    if (!grid || !ink) return;

    for (const c of [grid, ink]) {
      c.width = CANVAS_WIDTH;
      c.height = CANVAS_HEIGHT;
    }

    const gctx = grid.getContext("2d");
    if (gctx) {
      gctx.save();
      gctx.strokeStyle = GRID_COLOR;
      gctx.lineWidth = 1;
      gctx.setLineDash([4, 4]);

      const lines = 4;
      for (let i = 1; i < lines; i++) {
        const y = (CANVAS_HEIGHT / lines) * i;
        gctx.beginPath();
        gctx.moveTo(0, y);
        gctx.lineTo(CANVAS_WIDTH, y);
        gctx.stroke();
      }

      gctx.setLineDash([]);
      gctx.strokeStyle = "#9ca3af";
      gctx.lineWidth = 1.5;
      gctx.strokeRect(0.5, 0.5, CANVAS_WIDTH - 1, CANVAS_HEIGHT - 1);
      gctx.restore();
    }

    const ictx = ink.getContext("2d");
    if (ictx) {
      ictx.lineCap = "round";
      ictx.lineJoin = "round";
      ictx.strokeStyle = STROKE_COLOR;
      ictx.lineWidth = STROKE_WIDTH;
    }
  }, []);

  useEffect(() => {
    const canvas = inkCanvasRef.current;
    if (!canvas) return;

    const preventTouchDefault = (event: TouchEvent) => {
      if (event.cancelable) event.preventDefault();
    };

    canvas.addEventListener("touchstart", preventTouchDefault, { passive: false });
    canvas.addEventListener("touchmove", preventTouchDefault, { passive: false });
    canvas.addEventListener("touchend", preventTouchDefault, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", preventTouchDefault);
      canvas.removeEventListener("touchmove", preventTouchDefault);
      canvas.removeEventListener("touchend", preventTouchDefault);
    };
  }, []);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const point = getCanvasPoint(e);
    lastPointRef.current = point;

    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.arc(point.x, point.y, STROKE_WIDTH / 2, 0, Math.PI * 2);
    ctx.fillStyle = STROKE_COLOR;
    ctx.fill();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;

    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;

    const point = getCanvasPoint(e);
    const last = lastPointRef.current;

    ctx.beginPath();
    ctx.moveTo(last?.x ?? point.x, last?.y ?? point.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    lastPointRef.current = point;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;

    drawingRef.current = false;
    lastPointRef.current = null;

    const canvas = e.currentTarget;
    if (canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      clear: () => {
        const c = inkCanvasRef.current;
        const ctx = c?.getContext("2d") ?? null;
        if (!ctx || !c) return;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.restore();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = STROKE_COLOR;
        ctx.lineWidth = STROKE_WIDTH;
      },
      getDataURL: () => {
        const grid = gridCanvasRef.current;
        const ink = inkCanvasRef.current;
        if (!grid || !ink) return null;
        const out = document.createElement("canvas");
        out.width = grid.width;
        out.height = grid.height;
        const ctx = out.getContext("2d");
        if (!ctx) return null;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.drawImage(grid, 0, 0);
        ctx.drawImage(ink, 0, 0);
        return out.toDataURL("image/png");
      },
    }),
    [],
  );

  return (
    <div className="relative w-full select-none">
      <canvas ref={gridCanvasRef} className="block w-full h-auto bg-white" tabIndex={-1} />
      <canvas
        ref={inkCanvasRef}
        aria-label={ariaLabel}
        className="absolute inset-0 block w-full h-full touch-none"
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}
