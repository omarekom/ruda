const CROSSFADE_MS = 450;

/**
 * Fades smoothly from what the canvas shows now to whatever is drawn on it next, e.g. when
 * switching between day and night: a still copy of the current picture is laid over the
 * canvas and faded out while the canvas keeps drawing underneath.
 */
export function crossfade(canvas: HTMLCanvasElement): void {
  const parent = canvas.parentElement;
  if (!parent || canvas.width === 0 || canvas.height === 0) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const snapshot = document.createElement('canvas');
  snapshot.width = canvas.width;
  snapshot.height = canvas.height;
  snapshot.getContext('2d')?.drawImage(canvas, 0, 0);
  snapshot.setAttribute('aria-hidden', 'true');
  Object.assign(snapshot.style, {
    position: 'absolute',
    left: `${canvas.offsetLeft}px`,
    top: `${canvas.offsetTop}px`,
    width: `${canvas.clientWidth}px`,
    height: `${canvas.clientHeight}px`,
    pointerEvents: 'none',
  });
  // Right above the canvas, so any panels drawn over the world stay on top.
  canvas.after(snapshot);
  snapshot
    .animate([{ opacity: 1 }, { opacity: 0 }], { duration: CROSSFADE_MS, easing: 'ease-in-out' })
    .finished.finally(() => snapshot.remove());
}
