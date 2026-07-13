interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  sourceUrl: string;
  audioUrl: string;
  playable: boolean;
}

interface GlobalMusicController {
  syncViews: () => void;
}

let musicController: GlobalMusicController | undefined;
let persistentControlsReady = false;

function isMusicTrack(value: unknown): value is MusicTrack {
  if (!value || typeof value !== 'object') return false;
  const track = value as Partial<MusicTrack>;
  return (
    typeof track.id === 'string' &&
    typeof track.title === 'string' &&
    typeof track.artist === 'string' &&
    typeof track.album === 'string' &&
    typeof track.cover === 'string' &&
    typeof track.sourceUrl === 'string' &&
    typeof track.audioUrl === 'string' &&
    typeof track.playable === 'boolean'
  );
}

function formatTime(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function createMusicController(root: HTMLElement): GlobalMusicController | undefined {
  let tracks: MusicTrack[] = [];
  try {
    const parsed: unknown = JSON.parse(root.dataset.playlist ?? '[]');
    if (Array.isArray(parsed)) tracks = parsed.filter(isMusicTrack);
  } catch {
    tracks = [];
  }

  const audio = root.querySelector<HTMLAudioElement>('[data-music-audio]');
  const panel = root.querySelector<HTMLElement>('[data-global-music-panel]');
  const orbToggle = root.querySelector<HTMLButtonElement>('[data-global-music-toggle]');
  if (!audio || !panel || !orbToggle || tracks.length === 0) return undefined;

  const failedTrackIds = new Set<string>();
  let currentIndex = Math.max(
    0,
    tracks.findIndex((track) => track.playable),
  );

  const currentTrack = () => tracks[currentIndex];
  const isAvailable = (track: MusicTrack) => track.playable && !failedTrackIds.has(track.id);
  const playablePosition = () => {
    const available = tracks.filter(isAvailable);
    const index = available.findIndex((track) => track.id === currentTrack().id);
    return `${Math.max(0, index) + 1} / ${available.length}`;
  };

  const setText = (selector: string, value: string) => {
    document
      .querySelectorAll<HTMLElement>(selector)
      .forEach((element) => (element.textContent = value));
  };

  const syncViews = () => {
    const track = currentTrack();
    const total = audio.duration || 0;
    const elapsed = audio.currentTime || 0;
    const progress = total > 0 ? (elapsed / total) * 100 : 0;
    const state = root.dataset.state ?? 'paused';

    document
      .querySelectorAll<HTMLElement>('[data-music-view]')
      .forEach((view) => (view.dataset.state = state));
    setText('[data-music-title]', track.title);
    setText('[data-music-artist]', track.artist);
    setText('[data-music-album]', ` · ${track.album}`);
    setText('[data-music-current-time]', formatTime(elapsed));
    setText('[data-music-duration]', formatTime(total));
    setText('[data-music-position]', playablePosition());
    setText(
      '[data-music-status]',
      state === 'playing' ? '正在播放' : state === 'error' ? '播放受限' : '准备播放',
    );
    setText('[data-music-orb-icon]', state === 'playing' ? 'Ⅱ' : '▶');

    document.querySelectorAll<HTMLImageElement>('[data-music-cover]').forEach((cover) => {
      if (cover.src !== track.cover) cover.src = track.cover;
      if (cover.closest('.global-music__now, [data-music-view]'))
        cover.alt = `${track.album} 专辑封面`;
    });
    document.querySelectorAll<HTMLInputElement>('[data-music-seek]').forEach((seek) => {
      seek.disabled = false;
      seek.value = String(progress);
      seek.style.setProperty('--music-progress', `${progress}%`);
    });
    document.querySelectorAll<HTMLButtonElement>('[data-music-action]').forEach((button) => {
      button.disabled = false;
      if (button.dataset.musicAction === 'toggle') {
        button.textContent = state === 'playing' ? 'Ⅱ' : '▶';
        button.setAttribute('aria-label', state === 'playing' ? '暂停' : '播放');
      }
    });
    root.querySelectorAll<HTMLButtonElement>('[data-music-track-index]').forEach((button) => {
      const index = Number(button.dataset.musicTrackIndex);
      if (index === currentIndex) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
  };

  const setPlaybackState = (state: 'paused' | 'playing' | 'error' | 'unavailable') => {
    root.dataset.state = state;
    syncViews();
  };

  const setTrack = (index: number, play = false) => {
    if (!tracks[index] || !isAvailable(tracks[index])) return;
    currentIndex = index;
    const track = currentTrack();
    audio.src = track.audioUrl;
    audio.dataset.trackId = track.id;
    setPlaybackState('paused');
    if (play) audio.play().catch(() => setPlaybackState('paused'));
  };

  const findAvailableIndex = (direction: -1 | 1) => {
    for (let offset = 1; offset <= tracks.length; offset += 1) {
      const candidate = (currentIndex + direction * offset + tracks.length) % tracks.length;
      if (isAvailable(tracks[candidate])) return candidate;
    }
    return undefined;
  };

  const changeTrack = (direction: -1 | 1) => {
    const wasPlaying = root.dataset.state === 'playing';
    const target = findAvailableIndex(direction);
    if (target === undefined) {
      setPlaybackState('unavailable');
      return;
    }
    setTrack(target, wasPlaying);
  };

  const setOpen = (open: boolean) => {
    root.dataset.open = String(open);
    panel.setAttribute('aria-hidden', String(!open));
    orbToggle.setAttribute('aria-expanded', String(open));
    orbToggle.setAttribute('aria-label', open ? '收起全局音乐播放器' : '打开全局音乐播放器');
  };

  const handleDocumentClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const action = target.closest<HTMLElement>('[data-music-action]')?.dataset.musicAction;
    if (action === 'toggle') {
      if (root.dataset.state === 'playing') audio.pause();
      else audio.play().catch(() => setPlaybackState('paused'));
    } else if (action === 'previous') {
      changeTrack(-1);
    } else if (action === 'next') {
      changeTrack(1);
    }

    const trackButton = target.closest<HTMLButtonElement>('[data-music-track-index]');
    if (trackButton && !trackButton.disabled)
      setTrack(Number(trackButton.dataset.musicTrackIndex), true);

    if (target.closest('[data-global-music-toggle]')) setOpen(root.dataset.open !== 'true');
    else if (target.closest('[data-global-music-close]')) {
      setOpen(false);
      orbToggle.focus();
    } else if (root.dataset.open === 'true' && !target.closest('[data-global-music]')) {
      setOpen(false);
    }
  };

  const handleDocumentInput = (event: Event) => {
    const target = event.target;
    if (
      !(target instanceof HTMLInputElement) ||
      !target.matches('[data-music-seek]') ||
      !audio.duration
    )
      return;
    audio.currentTime = (Number(target.value) / 100) * audio.duration;
    syncViews();
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && root.dataset.open === 'true') {
      setOpen(false);
      orbToggle.focus();
    }
  };

  const handleError = () => {
    failedTrackIds.add(currentTrack().id);
    audio.pause();
    setPlaybackState('error');
  };

  document.addEventListener('click', handleDocumentClick);
  document.addEventListener('input', handleDocumentInput);
  document.addEventListener('keydown', handleKeydown);
  audio.addEventListener('play', () => setPlaybackState('playing'));
  audio.addEventListener('pause', () => {
    if (root.dataset.state !== 'error') setPlaybackState('paused');
  });
  audio.addEventListener('timeupdate', syncViews);
  audio.addEventListener('loadedmetadata', syncViews);
  audio.addEventListener('ended', () => changeTrack(1));
  audio.addEventListener('error', handleError);

  setTrack(currentIndex);
  setOpen(false);
  root.dataset.musicReady = 'true';

  return { syncViews };
}

function initBackToTop() {
  const link = document.querySelector<HTMLAnchorElement>('[data-back-to-top]');
  if (!link || link.dataset.ready === 'true') return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const updateVisibility = () => {
    link.classList.toggle('is-visible', window.scrollY > Math.max(480, window.innerHeight * 0.65));
  };
  const handleClick = (event: MouseEvent) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  };
  link.addEventListener('click', handleClick);
  window.addEventListener('scroll', updateVisibility, { passive: true });
  window.addEventListener('resize', updateVisibility, { passive: true });
  document.addEventListener('astro:page-load', updateVisibility);
  link.dataset.ready = 'true';
  updateVisibility();
}

/** 初始化不会随 Astro 页面交换销毁的全局控件。 */
export function initPersistentControls() {
  if (persistentControlsReady) return;
  const musicRoot = document.querySelector<HTMLElement>('[data-global-music]');
  if (musicRoot) musicController = createMusicController(musicRoot);
  initBackToTop();
  persistentControlsReady = true;
}

/** 新页面进入 DOM 后，让首页音乐卡等临时视图读取全局播放器当前状态。 */
export function syncPersistentControlViews() {
  musicController?.syncViews();
}
