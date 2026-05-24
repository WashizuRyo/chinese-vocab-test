"use client";

import type { Ref } from "react";
import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";

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
const STROKE_WIDTH = 3.5;

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  const lines = 4;
  for (let i = 1; i < lines; i++) {
    const y = (height / lines) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.strokeStyle = "#9ca3af";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  ctx.restore();
}

export function HandwritingCanvas({
  aspectRatio,
  className,
  ariaLabel = "手書き入力",
  ref,
}: {
  aspectRatio: number;
  className?: string;
  ariaLabel?: string;
  ref?: Ref<HandwritingCanvasHandle>;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);

  const resizeCanvases = useCallback(() => {
    const el = containerRef.current;
    const grid = gridCanvasRef.current;
    const ink = inkCanvasRef.current;
    if (!el || !grid || !ink) return;

    const rect = el.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = Math.floor(w * aspectRatio);
    if (w === 0 || h === 0) return;

    const dpr = window.devicePixelRatio || 1;

    for (const c of [grid, ink]) {
      c.width = Math.floor(w * dpr);
      c.height = Math.floor(h * dpr);
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
    }

    const gctx = grid.getContext("2d");
    if (gctx) {
      gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gctx.clearRect(0, 0, w, h);
      drawGrid(gctx, w, h);
    }

    const ictx = ink.getContext("2d");
    if (ictx) {
      ictx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ictx.clearRect(0, 0, w, h);
      ictx.lineCap = "round";
      ictx.lineJoin = "round";
      ictx.strokeStyle = STROKE_COLOR;
      ictx.lineWidth = STROKE_WIDTH;
    }
  }, [aspectRatio]);

  useLayoutEffect(() => {
    resizeCanvases();

    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => resizeCanvases());
    ro.observe(el);
    window.addEventListener("orientationchange", resizeCanvases);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", resizeCanvases);
    };
  }, [resizeCanvases]);

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

  const getCtx = () => inkCanvasRef.current?.getContext("2d") ?? null;

  const eventToPoint = (e: PointerEvent | React.PointerEvent): Point | null => {
    const c = inkCanvasRef.current;
    if (!c) return null;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const c = inkCanvasRef.current;
    if (!c) return;
    c.setPointerCapture(e.pointerId);
    const p = eventToPoint(e);
    if (!p) return;
    drawingRef.current = true;
    lastPointRef.current = p;
    const ctx = getCtx();
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.arc(p.x, p.y, STROKE_WIDTH / 2, 0, Math.PI * 2);
    ctx.fillStyle = STROKE_COLOR;
    ctx.fill();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const p = eventToPoint(e);
    if (!p) return;
    const last = lastPointRef.current;
    ctx.beginPath();
    if (last) ctx.moveTo(last.x, last.y);
    else ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPointRef.current = p;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    drawingRef.current = false;
    lastPointRef.current = null;
    const c = inkCanvasRef.current;
    if (c?.hasPointerCapture(e.pointerId)) c.releasePointerCapture(e.pointerId);
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
    <div
      ref={containerRef}
      className={`relative w-full select-none ${className ?? ""}`}
      style={{ touchAction: "none" }}
    >
      <canvas
        ref={gridCanvasRef}
        className="disable-text-selection block w-full h-auto bg-white"
        tabIndex={-1}
      />
      <canvas
        ref={inkCanvasRef}
        aria-label={ariaLabel}
        className="disable-text-selection absolute inset-0 block w-full h-full"
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
    </div>
  );
}
