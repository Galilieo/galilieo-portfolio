import type { Cleanup } from './theme';

type SlideDirection = -1 | 1;

function initCarousel(carousel: HTMLElement): Cleanup {
  const slides = Array.from(carousel.querySelectorAll<HTMLElement>('[data-home-slide]'));
  const dots = Array.from(carousel.querySelectorAll<HTMLButtonElement>('[data-home-dot]'));

  if (slides.length === 0) return () => undefined;

  let activeIndex = 0;
  let autoplayTimer: number | undefined;
  let isHovered = false;
  let hasFocus = false;
  let transitionSequence = 0;
  let runningAnimations: Animation[] = [];
  const autoplayDelay = Number(carousel.dataset.homeAutoplay ?? 0);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const stopTransition = () => {
    transitionSequence += 1;
    runningAnimations.forEach((animation) => animation.cancel());
    runningAnimations = [];
    slides.forEach((slide) => slide.style.removeProperty('pointer-events'));
  };

  const syncDots = () => {
    dots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === activeIndex;
      dot.setAttribute('aria-current', String(isActive));
      dot.tabIndex = isActive ? 0 : -1;
    });
  };

  const syncState = () => {
    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === activeIndex;
      slide.hidden = !isActive;
      slide.inert = !isActive;
      if (isActive) slide.removeAttribute('aria-hidden');
      else slide.setAttribute('aria-hidden', 'true');
    });
    syncDots();
  };

  const render = (index: number, direction: SlideDirection = 1, animate = true) => {
    const nextIndex = (index + slides.length) % slides.length;
    const previousIndex = activeIndex;

    stopTransition();
    activeIndex = nextIndex;

    if (!animate || reducedMotion.matches || nextIndex === previousIndex) {
      syncState();
      return;
    }

    const outgoing = slides[previousIndex];
    const incoming = slides[nextIndex];
    slides.forEach((slide, slideIndex) => {
      slide.hidden = slideIndex !== previousIndex && slideIndex !== nextIndex;
      slide.inert = slideIndex !== nextIndex;
      if (slideIndex === nextIndex) slide.removeAttribute('aria-hidden');
      else slide.setAttribute('aria-hidden', 'true');
    });
    syncDots();

    outgoing.style.pointerEvents = 'none';
    const offset = direction * 12;
    const options: KeyframeAnimationOptions = {
      duration: 320,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'both',
    };
    runningAnimations = [
      outgoing.animate(
        [
          { opacity: 1, transform: 'translateX(0)' },
          { opacity: 0, transform: `translateX(${-offset}px)` },
        ],
        options,
      ),
      incoming.animate(
        [
          { opacity: 0, transform: `translateX(${offset}px)` },
          { opacity: 1, transform: 'translateX(0)' },
        ],
        options,
      ),
    ];

    const sequence = transitionSequence;
    Promise.allSettled(runningAnimations.map((animation) => animation.finished)).then(() => {
      if (sequence !== transitionSequence) return;
      outgoing.hidden = true;
      outgoing.style.removeProperty('pointer-events');
      runningAnimations.forEach((animation) => animation.cancel());
      runningAnimations = [];
    });
  };

  const stopAutoplay = () => {
    if (autoplayTimer === undefined) return;
    window.clearTimeout(autoplayTimer);
    autoplayTimer = undefined;
  };

  const canAutoplay = () =>
    slides.length > 1 &&
    autoplayDelay > 0 &&
    !reducedMotion.matches &&
    !document.hidden &&
    !isHovered &&
    !hasFocus;

  const scheduleAutoplay = () => {
    stopAutoplay();
    if (!canAutoplay()) return;
    autoplayTimer = window.setTimeout(() => {
      render(activeIndex + 1, 1);
      scheduleAutoplay();
    }, autoplayDelay);
  };

  const selectSlide = (index: number) => {
    const nextIndex = (index + slides.length) % slides.length;
    render(nextIndex, nextIndex >= activeIndex ? 1 : -1);
    scheduleAutoplay();
  };

  const dotListeners = dots.map((dot, index) => {
    const select = () => selectSlide(index);
    dot.addEventListener('click', select);
    return () => dot.removeEventListener('click', select);
  });

  const handleMouseEnter = () => {
    isHovered = true;
    stopAutoplay();
  };
  const handleMouseLeave = () => {
    isHovered = false;
    scheduleAutoplay();
  };
  const handleFocusIn = () => {
    hasFocus = true;
    stopAutoplay();
  };
  const handleFocusOut = (event: FocusEvent) => {
    if (event.relatedTarget instanceof Node && carousel.contains(event.relatedTarget)) return;
    hasFocus = false;
    scheduleAutoplay();
  };
  const handleVisibilityChange = () => scheduleAutoplay();
  const handleReducedMotionChange = () => {
    if (reducedMotion.matches) render(activeIndex, 1, false);
    scheduleAutoplay();
  };
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const direction: SlideDirection = event.key === 'ArrowRight' ? 1 : -1;
    render(activeIndex + direction, direction);
    scheduleAutoplay();
    dots[activeIndex]?.focus();
  };

  carousel.addEventListener('mouseenter', handleMouseEnter);
  carousel.addEventListener('mouseleave', handleMouseLeave);
  carousel.addEventListener('focusin', handleFocusIn);
  carousel.addEventListener('focusout', handleFocusOut);
  carousel.addEventListener('keydown', handleKeyDown);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  reducedMotion.addEventListener('change', handleReducedMotionChange);
  render(0, 1, false);
  scheduleAutoplay();

  return () => {
    stopAutoplay();
    stopTransition();
    dotListeners.reverse().forEach((dispose) => dispose());
    carousel.removeEventListener('mouseenter', handleMouseEnter);
    carousel.removeEventListener('mouseleave', handleMouseLeave);
    carousel.removeEventListener('focusin', handleFocusIn);
    carousel.removeEventListener('focusout', handleFocusOut);
    carousel.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    reducedMotion.removeEventListener('change', handleReducedMotionChange);
  };
}

/** 增强首页轮播；Header 与状态条时钟由全站导航生命周期统一维护。 */
export function initHomeDashboard(): Cleanup {
  const dashboard = document.querySelector<HTMLElement>('#home-dashboard');
  if (!dashboard) return () => undefined;

  const cleanups = Array.from(dashboard.querySelectorAll<HTMLElement>('[data-home-carousel]')).map(
    initCarousel,
  );
  return () => {
    cleanups.reverse().forEach((dispose) => dispose());
  };
}
