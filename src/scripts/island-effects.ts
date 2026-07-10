import type { Cleanup } from './theme';

type MistParticle = {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
  dx: number;
  dy: number;
};

type SurfaceGlint = {
  x: number;
  y: number;
  length: number;
  phase: number;
  speed: number;
};

const mistParticles: MistParticle[] = [
  { x: 0.12, y: 0.61, r: 1.3, phase: 0.2, speed: 0.72, dx: 5, dy: -4 },
  { x: 0.2, y: 0.76, r: 0.85, phase: 1.6, speed: 0.58, dx: -4, dy: -6 },
  { x: 0.28, y: 0.56, r: 1.55, phase: 3.1, speed: 0.48, dx: 5, dy: 3 },
  { x: 0.72, y: 0.58, r: 1, phase: 2.2, speed: 0.64, dx: -4, dy: -3 },
  { x: 0.81, y: 0.74, r: 1.65, phase: 4.4, speed: 0.44, dx: 5, dy: -6 },
  { x: 0.9, y: 0.62, r: 0.75, phase: 5.2, speed: 0.55, dx: -3, dy: 4 },
  { x: 0.32, y: 0.88, r: 1.1, phase: 1.1, speed: 0.5, dx: 4, dy: -5 },
  { x: 0.48, y: 0.93, r: 0.7, phase: 3.8, speed: 0.68, dx: -3, dy: -4 },
  { x: 0.64, y: 0.9, r: 1.25, phase: 0.8, speed: 0.46, dx: 4, dy: -6 },
  { x: 0.72, y: 0.84, r: 0.8, phase: 2.9, speed: 0.61, dx: -4, dy: 3 },
];

const surfaceGlints: SurfaceGlint[] = [
  { x: 0.08, y: 0.8, length: 8, phase: 0.6, speed: 0.52 },
  { x: 0.26, y: 0.69, length: 7, phase: 2.7, speed: 0.43 },
  { x: 0.73, y: 0.76, length: 8, phase: 4.1, speed: 0.47 },
  { x: 0.88, y: 0.85, length: 9, phase: 1.9, speed: 0.39 },
];

/** 初始化现有岛屿 Canvas、指针视差和性能暂停逻辑；不改变任何视觉参数。 */
export function initIslandEffects(): Cleanup {
  const root = document.documentElement;
  const featuredProject = document.querySelector<HTMLElement>('.featured-project');
  const islandScene = document.querySelector<HTMLElement>('.island-scene');
  const canvas = document.querySelector<HTMLCanvasElement>('.island-fx-canvas');
  if (!featuredProject || !islandScene || !canvas) return () => {};

  const context = canvas.getContext('2d', { alpha: true });
  if (!context) return () => {};

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let width = 1;
  let height = 1;
  let frame = 0;
  let sceneVisible = true;

  canvas.dataset.fxReady = 'true';
  canvas.dataset.mistCount = String(mistParticles.length);
  canvas.dataset.glintCount = String(surfaceGlints.length);
  canvas.dataset.topSafeRatio = '0.54';

  const resizeCanvas = () => {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const draw = (timestamp: number, staticFrame = false) => {
    context.clearRect(0, 0, width, height);
    const isDark = root.dataset.theme === 'dark';
    const ink = isDark ? [218, 225, 221] : [87, 91, 87];
    const inkText = ink.join(',');
    const time = staticFrame ? 2.4 : timestamp / 1000;

    pointer.x += (pointer.targetX - pointer.x) * 0.055;
    pointer.y += (pointer.targetY - pointer.y) * 0.055;

    mistParticles.forEach((particle, index) => {
      const wave = Math.sin(time * particle.speed + particle.phase);
      const secondary = Math.cos(time * particle.speed * 0.73 + particle.phase);
      const x = particle.x * width + wave * particle.dx + pointer.x * (1.2 + index * 0.08);
      const y = particle.y * height + secondary * particle.dy + pointer.y * (0.7 + index * 0.04);
      const alpha = 0.055 + (wave + 1) * 0.042;
      const radius = particle.r * (0.92 + (secondary + 1) * 0.08);
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius * 2.8);
      gradient.addColorStop(0, `rgba(${inkText},${alpha.toFixed(3)})`);
      gradient.addColorStop(0.42, `rgba(${inkText},${(alpha * 0.48).toFixed(3)})`);
      gradient.addColorStop(1, `rgba(${inkText},0)`);
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, radius * 2.8, 0, Math.PI * 2);
      context.fill();
    });

    surfaceGlints.forEach((glint, index) => {
      const wave = Math.sin(time * glint.speed + glint.phase);
      const x = glint.x * width + wave * 5 + pointer.x * (0.8 + index * 0.12);
      const y =
        glint.y * height + Math.cos(time * glint.speed + glint.phase) * 2 + pointer.y * 0.45;
      const alpha = 0.045 + (wave + 1) * 0.035;
      context.strokeStyle = `rgba(${inkText},${alpha.toFixed(3)})`;
      context.lineWidth = 0.65;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(x - glint.length / 2, y + 0.6);
      context.quadraticCurveTo(x, y - 0.8, x + glint.length / 2, y);
      context.stroke();
    });
  };

  const tick = (timestamp: number) => {
    frame = 0;
    if (!sceneVisible || document.hidden || reducedMotion.matches) return;
    draw(timestamp);
    frame = requestAnimationFrame(tick);
  };

  const start = () => {
    if (frame || !sceneVisible || document.hidden || reducedMotion.matches) return;
    frame = requestAnimationFrame(tick);
  };

  const stop = () => {
    if (!frame) return;
    cancelAnimationFrame(frame);
    frame = 0;
  };

  const render = () => {
    resizeCanvas();
    draw(performance.now(), reducedMotion.matches);
    if (reducedMotion.matches) stop();
    else start();
  };

  const resetPointer = () => {
    pointer.targetX = 0;
    pointer.targetY = 0;
    islandScene.style.setProperty('--island-shift-x', '0px');
    islandScene.style.setProperty('--island-shift-y', '0px');
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!finePointer.matches || reducedMotion.matches) return;
    const rect = featuredProject.getBoundingClientRect();
    pointer.targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    pointer.targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 1.5;
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 3.5;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2.5;
    islandScene.style.setProperty('--island-shift-x', `${x.toFixed(2)}px`);
    islandScene.style.setProperty('--island-shift-y', `${y.toFixed(2)}px`);
  };

  const onVisibilityChange = () => {
    if (document.hidden) stop();
    else render();
  };

  const onMotionChange = () => {
    resetPointer();
    render();
  };

  const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(render) : undefined;
  resizeObserver?.observe(canvas);

  let visibilityObserver: IntersectionObserver | undefined;
  if ('IntersectionObserver' in window) {
    visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        sceneVisible = Boolean(entry?.isIntersecting);
        if (sceneVisible) render();
        else stop();
      },
      { rootMargin: '120px' },
    );
    visibilityObserver.observe(islandScene);
  }

  featuredProject.addEventListener('pointermove', onPointerMove);
  featuredProject.addEventListener('pointerleave', resetPointer);
  document.addEventListener('visibilitychange', onVisibilityChange);
  reducedMotion.addEventListener('change', onMotionChange);
  window.addEventListener('galilieo:theme-change', render);
  if (!resizeObserver) window.addEventListener('resize', render);
  render();

  return () => {
    stop();
    resizeObserver?.disconnect();
    visibilityObserver?.disconnect();
    featuredProject.removeEventListener('pointermove', onPointerMove);
    featuredProject.removeEventListener('pointerleave', resetPointer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    reducedMotion.removeEventListener('change', onMotionChange);
    window.removeEventListener('galilieo:theme-change', render);
    if (!resizeObserver) window.removeEventListener('resize', render);
    resetPointer();
  };
}
