/* A soft, GPU-friendly glow that follows the pointer. Optional hook for future enhancement. */
export function pointerGradientScript() {
  const root = document.documentElement;
  const handler = (e: MouseEvent) => {
    root.style.setProperty('--mx', e.clientX + 'px');
    root.style.setProperty('--my', e.clientY + 'px');
  };
  window.addEventListener('pointermove', handler, { passive: true });
  return () => window.removeEventListener('pointermove', handler);
}
