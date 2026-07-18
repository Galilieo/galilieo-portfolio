(() => {
  'use strict';

  const WRITING_MODE_KEY = 'galilieo-studio-writing-mode';
  const PREVIEW_DEVICE_KEY = 'galilieo-studio-preview-device';
  const THEME_KEY = 'galilieo-studio-theme';
  const RECOVERY_PREFIX = 'galilieo-studio-recovery:';
  const TAXONOMY_MAX_LENGTH = 40;
  const DESKTOP_PREVIEW_WIDTH = 1180;

  const state = {
    articles: [],
    categories: [],
    tags: [],
    coverGallery: [],
    current: null,
    currentSlug: '',
    filter: 'all',
    modified: false,
    previewOrigin: 'http://127.0.0.1:4321',
    search: '',
    sessionReady: false,
    writingMode: localStorage.getItem(WRITING_MODE_KEY) === 'focus' ? 'focus' : 'split',
    previewDevice: localStorage.getItem(PREVIEW_DEVICE_KEY) === 'mobile' ? 'mobile' : 'desktop',
    recoveryTimer: null,
    selectedCategory: '',
    selectedTags: new Set(),
    newCategory: '',
    newTags: new Set(),
    coverMode: 'auto',
    galleryCoverKey: '',
    drawerReturnFocus: null,
    newModalReturnFocus: null,
    selectionReturnFocus: null,
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const refs = {
    articleCount: $('#article-count'),
    articleList: $('#article-list'),
    btnConfirmPublish: $('#btn-confirm-publish'),
    connection: $('#connection-status'),
    currentSlug: $('#current-slug'),
    currentState: $('#current-state'),
    currentTitle: $('#current-title'),
    derivedOrder: $('#derived-order'),
    derivedReadingTime: $('#derived-reading-time'),
    derivedState: $('#derived-state'),
    drawerScrim: $('#drawer-scrim'),
    editorBody: $('#editor-body'),
    editorShell: $('#editor-shell'),
    editorStatus: $('#editor-status'),
    editorStatusText: $('#editor-status-text'),
    editorTitle: $('#editor-title'),
    emptyEditor: $('#empty-editor'),
    headerSaveState: $('#header-save-state'),
    lineCount: $('#line-count'),
    metaCoverFile: $('#meta-cover-file'),
    metaDescription: $('#meta-description'),
    metaFeatured: $('#meta-featured'),
    metaFields: $('#meta-fields'),
    metaPublishedAt: $('#meta-publishedAt'),
    metaSlug: $('#meta-slug'),
    metaUpdatedAt: $('#meta-updatedAt'),
    newAddCategory: $('#new-add-category'),
    newArticleForm: $('#new-article-form'),
    newArticleModal: $('#new-article-modal'),
    newCategoryInput: $('#new-category-input'),
    newCategoryOptions: $('#new-category-options'),
    previewEmpty: $('#preview-empty'),
    previewFrame: $('#preview-frame'),
    previewPanel: $('#preview-panel'),
    previewShell: $('#preview-shell'),
    previewStage: $('#preview-stage'),
    publishDrawer: $('#publish-drawer'),
    publishCheckStatus: $('#publish-check-status'),
    readOnlyBadge: $('#read-only-badge'),
    readingTimeDisplay: $('#reading-time-display'),
    recoveryBanner: $('#recovery-banner'),
    search: $('#search-articles'),
    selectionPanel: $('#selection-panel'),
    selectionScrim: $('#selection-scrim'),

    selectionTitle: $('#selection-title'),
    selectionSubtitle: $('#selection-subtitle'),
    selectionContent: $('#selection-content'),
    selectionClose: $('#selection-close'),
    selectionDone: $('#selection-done'),
    settingsAddCategory: $('#settings-add-category'),
    settingsCategoryInput: $('#settings-category-input'),
    settingsCategoryOptions: $('#settings-category-options'),
    settingsDrawer: $('#settings-drawer'),
    settingsTagCombobox: $('#settings-tag-combobox'),
    settingsTagInput: $('#settings-tag-input'),
    settingsTagOptions: $('#settings-tag-options'),
    settingsTagSelected: $('#settings-tag-selected'),
    studioShell: $('#studio-shell'),
    summaryCategory: $('#summary-category strong'),
    summaryCategoryButton: $('#summary-category'),
    summaryCover: $('#summary-cover'),
    summaryTags: $('#summary-tags strong'),
    summaryTagsButton: $('#summary-tags'),

    toast: $('#toast'),
    triggerCoverValue: $('#trigger-cover-value'),
    newTagCombobox: $('#new-tag-combobox'),
    newTagInput: $('#new-tag-input'),
    newTagOptions: $('#new-tag-options'),
    newTagSelected: $('#new-tag-selected'),
    verifyOutput: $('#verify-output'),
    wordCount: $('#word-count'),
  };

  function escapeHtml(value) {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return String(value ?? '').replace(/[&<>"']/g, (character) => entities[character]);
  }

  function formatError(data, fallback) {
    if (Array.isArray(data?.errors)) return data.errors.map(({ message }) => message).join('\n');
    return data?.error || fallback;
  }

  async function ensureSession(force = false) {
    if (state.sessionReady && !force) return;
    const response = await fetch('/api/session', { method: 'POST', credentials: 'same-origin' });
    if (!response.ok) throw new Error('无法建立本机写作会话');
    state.sessionReady = true;
  }

  async function api(path, options = {}, retry = true) {
    const headers = new Headers(options.headers);
    if (typeof options.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    const response = await fetch(path, { credentials: 'same-origin', ...options, headers });
    if (response.status === 401 && retry) {
      await ensureSession(true);
      return api(path, options, false);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(formatError(data, `HTTP ${response.status}`));
    return data;
  }

  function toast(message, tone = 'info') {
    refs.toast.textContent = message;
    refs.toast.dataset.tone = tone;
    refs.toast.hidden = false;
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => {
      refs.toast.hidden = true;
    }, 3200);
  }

  function localDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function estimateReadingTime(body = refs.editorBody.value) {
    const content = String(body)
      .replace(/```[\s\S]*?```/g, ' ')
      .trim();
    return Math.max(1, Math.ceil(content.length / 420));
  }

  function autoResizeTitle() {
    refs.editorTitle.style.height = 'auto';
    refs.editorTitle.style.height = `${Math.min(refs.editorTitle.scrollHeight, 205)}px`;
  }

  function updateStats() {
    const body = refs.editorBody.value;
    const readingTime = estimateReadingTime(body);
    refs.wordCount.textContent = `${body.length} 字`;
    refs.lineCount.textContent = `${body ? body.split('\n').length : 0} 行`;
    refs.readingTimeDisplay.textContent = `约 ${readingTime} 分钟阅读`;
    refs.derivedReadingTime.textContent = `${readingTime} 分钟`;
  }

  function recoveryKey(slug = state.currentSlug) {
    return slug ? `${RECOVERY_PREFIX}${slug}` : '';
  }

  function collectRecovery() {
    return {
      title: refs.editorTitle.value,
      body: refs.editorBody.value,
      description: refs.metaDescription.value,
      category: state.selectedCategory,
      tags: [...state.selectedTags].join(', '),
      publishedAt: refs.metaPublishedAt.value,
      updatedAt: refs.metaUpdatedAt.value,
      featured: refs.metaFeatured.checked,
      coverMode: state.coverMode,
      galleryCoverKey: state.galleryCoverKey,
      savedAt: Date.now(),
    };
  }

  function scheduleRecovery() {
    if (!state.currentSlug || state.current?.editable === false || state.current?.isMdx) return;
    window.clearTimeout(state.recoveryTimer);
    state.recoveryTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(recoveryKey(), JSON.stringify(collectRecovery()));
        refs.headerSaveState.textContent = '已保存恢复副本';
      } catch {
        refs.headerSaveState.textContent = '恢复副本保存失败';
      }
    }, 550);
  }

  function clearRecovery(slug = state.currentSlug) {
    const key = recoveryKey(slug);
    if (key) localStorage.removeItem(key);
    refs.recoveryBanner.hidden = true;
  }

  function setModified(modified = true) {
    state.modified = modified;
    refs.editorStatus.classList.toggle('modified', modified);
    refs.headerSaveState.classList.toggle('dirty', modified);
    refs.editorStatusText.textContent = modified ? '● 尚未写入 Markdown' : '已保存到 Markdown';
    refs.headerSaveState.textContent = modified ? '正在保存恢复副本…' : 'Markdown 已保存';
    updateStats();
    if (modified) scheduleRecovery();
  }

  function setEditable(editable) {
    refs.metaFields.disabled = !editable;
    $$(
      '[data-editable-control], .tool-btn, .summary-chip, #btn-save, #btn-confirm-publish',
    ).forEach((element) => {
      element.disabled = !editable;
    });
    refs.readOnlyBadge.hidden = editable;
  }

  // --- Selection panel ---

  function addCategory(context) {
    const input = context === 'current' ? refs.settingsCategoryInput : refs.newCategoryInput;
    const category = input.value.trim();
    if (!category) {
      toast('请输入分类名称', 'error');
      input.focus();
      return;
    }
    if (category.length > TAXONOMY_MAX_LENGTH) {
      toast(`分类不能超过 ${TAXONOMY_MAX_LENGTH} 个字符`, 'error');
      input.focus();
      return;
    }
    if (!state.categories.includes(category)) state.categories.push(category);
    input.value = '';

    if (context === 'current') {
      if (state.selectedCategory !== category) {
        state.selectedCategory = category;
        syncSummary();
        setModified(true);
      } else {
        renderCategoryOptions();
      }
    } else {
      state.newCategory = category;
      renderCategoryOptions();
    }
    input.focus();
  }

  function renderCategoryOptions() {
    const categories = [
      ...new Set([state.selectedCategory, state.newCategory, ...state.categories].filter(Boolean)),
    ];

    const render = (container, context) => {
      const selected = context === 'current' ? state.selectedCategory : state.newCategory;
      container.innerHTML = categories.length
        ? categories
            .map(
              (category) =>
                `<button class="category-choice${selected === category ? ' active' : ''}" type="button" data-category-value="${escapeHtml(category)}" aria-pressed="${selected === category}">${escapeHtml(category)}</button>`,
            )
            .join('')
        : '<span class="field-hint">暂无可用分类</span>';

      container.querySelectorAll('[data-category-value]').forEach((button) => {
        button.addEventListener('click', () => {
          const category = button.dataset.categoryValue;
          if (context === 'current') {
            if (state.selectedCategory === category) return;
            state.selectedCategory = category;
            syncSummary();
            setModified(true);
          } else {
            if (state.newCategory === category) return;
            state.newCategory = category;
            renderCategoryOptions();
          }
          const active = container.querySelector('[aria-pressed="true"]');
          active?.focus();
        });
      });
    };

    render(refs.settingsCategoryOptions, 'current');
    render(refs.newCategoryOptions, 'new');
  }

  function tagElements(context) {
    return context === 'current'
      ? {
          combobox: refs.settingsTagCombobox,
          input: refs.settingsTagInput,
          menu: refs.settingsTagOptions,
          selected: refs.settingsTagSelected,
          selection: state.selectedTags,
        }
      : {
          combobox: refs.newTagCombobox,
          input: refs.newTagInput,
          menu: refs.newTagOptions,
          selected: refs.newTagSelected,
          selection: state.newTags,
        };
  }

  function hasTaxonomyControlCharacters(value) {
    return [...value].some((character) => {
      const code = character.charCodeAt(0);
      return code <= 0x1f || code === 0x7f;
    });
  }

  function commitTagChange(context) {
    renderTagCombobox(context);
    if (context === 'current') {
      syncSummary();
      setModified(true);
    }
  }

  function addTag(context, value) {
    const tag = value.trim();
    const { input, selection } = tagElements(context);
    if (!tag) return;
    if (tag.length > TAXONOMY_MAX_LENGTH) {
      toast(`标签不能超过 ${TAXONOMY_MAX_LENGTH} 个字符`, 'error');
      input.focus();
      return;
    }
    if (hasTaxonomyControlCharacters(tag)) {
      toast('标签不能包含换行或控制字符', 'error');
      input.focus();
      return;
    }

    const changed = !selection.has(tag);
    selection.add(tag);
    input.value = '';
    input.dataset.activeIndex = '-1';
    if (changed) commitTagChange(context);
    else renderTagCombobox(context);
    openTagMenu(context);
    input.focus();
  }

  function toggleTag(context, tag) {
    const { input, selection } = tagElements(context);
    if (selection.has(tag)) {
      if (context === 'current' && selection.size === 1) {
        toast('文章至少需要一个标签', 'error');
        input.focus();
        return;
      }
      selection.delete(tag);
    } else {
      selection.add(tag);
    }
    input.value = '';
    commitTagChange(context);
    openTagMenu(context);
    input.focus();
  }

  function renderTagCombobox(context) {
    const { input, menu, selected, selection } = tagElements(context);
    const prefix = context === 'current' ? 'settings' : 'new';
    const query = input.value.trim();
    const lowerQuery = query.toLowerCase();
    const allTags = [...new Set([...selection, ...state.tags])].sort((a, b) => a.localeCompare(b));
    const matches = allTags.filter((tag) => tag.toLowerCase().includes(lowerQuery));
    const exactMatch = allTags.includes(query);

    selected.innerHTML = [...selection]
      .map(
        (tag) =>
          `<button class="tag-combobox__chip" type="button" data-tag-remove="${escapeHtml(tag)}" aria-label="移除标签 ${escapeHtml(tag)}"><span>${escapeHtml(tag)}</span><b aria-hidden="true">×</b></button>`,
      )
      .join('');

    const createOption =
      query && !exactMatch
        ? `<button class="tag-combobox__option tag-combobox__option--create" id="${prefix}-tag-create-option" type="button" role="option" aria-selected="false" data-tag-create="${escapeHtml(query)}"><strong>＋ 创建「${escapeHtml(query)}」</strong><small>按 Enter 新增并选中</small></button>`
        : '';
    const hint = query ? '' : '<div class="tag-combobox__hint">输入名称可搜索或创建新标签</div>';
    const options = matches
      .map((tag, index) => {
        const active = selection.has(tag);
        return `<button class="tag-combobox__option${active ? ' is-selected' : ''}" id="${prefix}-tag-option-${index}" type="button" role="option" aria-selected="${active}" data-tag-value="${escapeHtml(tag)}"><span>${escapeHtml(tag)}</span><small>${active ? '已选择' : '选择'}</small></button>`;
      })
      .join('');
    menu.innerHTML = `${hint}${createOption}${options}`;

    selected.querySelectorAll('[data-tag-remove]').forEach((button) => {
      button.addEventListener('click', () => toggleTag(context, button.dataset.tagRemove));
    });
    menu.querySelector('[data-tag-create]')?.addEventListener('click', (event) => {
      addTag(context, event.currentTarget.dataset.tagCreate);
    });
    menu.querySelectorAll('[data-tag-value]').forEach((button) => {
      button.addEventListener('click', () => toggleTag(context, button.dataset.tagValue));
    });
  }

  function positionTagMenu(context) {
    const { combobox, menu } = tagElements(context);
    const control = combobox.querySelector('[data-tag-control]').getBoundingClientRect();
    const boundary =
      context === 'current'
        ? refs.settingsDrawer.getBoundingClientRect()
        : $('#new-article-modal .modal-body').getBoundingClientRect();
    const availableBelow = Math.max(0, boundary.bottom - control.bottom - 8);
    const availableAbove = Math.max(0, control.top - boundary.top - 8);
    const naturalHeight = Math.min(menu.scrollHeight, 228);
    const opensUp = availableBelow < naturalHeight && availableAbove > availableBelow;
    const available = opensUp ? availableAbove : availableBelow;
    combobox.classList.toggle('opens-up', opensUp);
    menu.style.maxHeight = `${Math.max(96, Math.min(228, available))}px`;
  }

  function openTagMenu(context) {
    const { input, menu } = tagElements(context);
    closeTagMenu(context === 'current' ? 'new' : 'current');
    menu.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    renderTagCombobox(context);
    window.requestAnimationFrame(() => positionTagMenu(context));
  }

  function closeTagMenu(context, { clear = false } = {}) {
    const { input, menu } = tagElements(context);
    menu.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    input.dataset.activeIndex = '-1';
    if (clear && input.value) {
      input.value = '';
      renderTagCombobox(context);
    }
  }

  function moveTagOption(context, direction) {
    const { input, menu } = tagElements(context);
    const options = [...menu.querySelectorAll('[role="option"]')];
    if (!options.length) return;
    const current = Number(input.dataset.activeIndex ?? -1);
    const next =
      direction > 0
        ? (current + 1) % options.length
        : current <= 0
          ? options.length - 1
          : current - 1;
    options.forEach((option, index) => option.classList.toggle('is-active', index === next));
    input.dataset.activeIndex = String(next);
    input.setAttribute('aria-activedescendant', options[next].id);
    options[next].scrollIntoView({ block: 'nearest' });
  }

  function bindTagCombobox(context) {
    const { combobox, input, menu } = tagElements(context);
    combobox.querySelector('[data-tag-control]').addEventListener('click', (event) => {
      if (!event.target.closest('[data-tag-remove]')) input.focus();
    });
    input.addEventListener('focus', () => openTagMenu(context));
    input.addEventListener('blur', (event) => {
      if (event.relatedTarget && combobox.contains(event.relatedTarget)) return;
      closeTagMenu(context, { clear: true });
    });
    input.addEventListener('input', () => {
      input.dataset.activeIndex = '-1';
      openTagMenu(context);
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        openTagMenu(context);
        moveTagOption(context, event.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      if (event.key === 'Escape') {
        const menuWasOpen = !menu.hidden;
        closeTagMenu(context, { clear: true });
        if (menuWasOpen) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }
      if (event.key !== 'Enter') return;
      event.preventDefault();
      const options = [...menu.querySelectorAll('[role="option"]')];
      const active = options[Number(input.dataset.activeIndex ?? -1)];
      if (active) {
        active.click();
        return;
      }
      const value = input.value.trim();
      if (value) addTag(context, value);
    });
  }

  function updateTriggerValues() {
    if (state.coverMode === 'upload' && state.current?.cover) {
      refs.triggerCoverValue.textContent = '专属上传';
    } else if (state.coverMode === 'gallery' && state.galleryCoverKey) {
      refs.triggerCoverValue.textContent = `图库 · ${state.galleryCoverKey}`;
    } else if (state.coverMode === 'gallery') {
      refs.triggerCoverValue.textContent = '选择图库封面';
    } else {
      refs.triggerCoverValue.textContent = '自动图库';
    }
    renderCategoryOptions();
    renderTagCombobox('current');
    renderTagCombobox('new');
  }

  function getGalleryCoverKey(cover) {
    return typeof cover === 'string'
      ? (cover.match(/^\.\.\/\.\.\/assets\/images\/covers\/scene-([a-z0-9]+)\.webp$/)?.[1] ?? '')
      : '';
  }

  function renderCoverOptions() {
    const content = refs.selectionContent;
    refs.selectionTitle.textContent = '选择封面';
    refs.selectionSubtitle.textContent = '自动图库、指定图库或专属上传';
    const mode = state.coverMode;
    content.innerHTML = `<div class="selection-cover-mode">
        <button class="selection-cover-option${mode === 'auto' ? ' active' : ''}" type="button" data-cover-mode="auto" aria-pressed="${mode === 'auto'}">自动图库</button>
        <button class="selection-cover-option${mode === 'gallery' ? ' active' : ''}" type="button" data-cover-mode="gallery" aria-pressed="${mode === 'gallery'}">指定图库</button>
        <button class="selection-cover-option${mode === 'upload' ? ' active' : ''}" type="button" data-cover-mode="upload" aria-pressed="${mode === 'upload'}">专属上传</button>
      </div>
      <div class="selection-cover-gallery"${mode !== 'gallery' ? ' hidden' : ''}>${
        state.coverGallery.length
          ? state.coverGallery
              .map((cover) => {
                const active = state.galleryCoverKey === cover.key;
                return `<button class="selection-cover-thumb${active ? ' active' : ''}" type="button" data-cover-key="${escapeHtml(cover.key)}" aria-pressed="${active}"><img src="${escapeHtml(cover.thumbnail)}" alt="${escapeHtml(cover.key)}" loading="lazy" /><span>${escapeHtml(cover.key)}</span></button>`;
              })
              .join('')
          : '<span class="field-hint">暂无图库封面</span>'
      }</div>
      <div class="selection-cover-upload"${mode !== 'upload' ? ' hidden' : ''}>
        <button class="btn btn-secondary" id="selection-btn-upload-cover" type="button">选择并压缩图片</button>
        <span id="selection-cover-status">${state.current?.cover && !getGalleryCoverKey(state.current.cover) ? '已设置专属封面' : '未设置'}</span>
      </div>`;
    content.querySelectorAll('[data-cover-mode]').forEach((b) => {
      b.addEventListener('click', () => {
        state.coverMode = b.dataset.coverMode;
        if (state.coverMode !== 'gallery') state.galleryCoverKey = '';
        renderCoverOptions();
        updateTriggerValues();
        syncSummary();
        setModified(true);
      });
    });
    content.querySelectorAll('[data-cover-key]').forEach((b) => {
      b.addEventListener('click', () => {
        state.galleryCoverKey = b.dataset.coverKey;
        renderCoverOptions();
        updateTriggerValues();
        syncSummary();
        setModified(true);
      });
    });
    const uploadBtn = content.querySelector('#selection-btn-upload-cover');
    if (uploadBtn) uploadBtn.addEventListener('click', () => refs.metaCoverFile.click());
  }

  function openCoverPanel() {
    state.selectionReturnFocus = document.activeElement;
    $$('.drawer.open').forEach((drawer) => drawer.setAttribute('inert', ''));
    refs.selectionPanel.hidden = false;
    renderCoverOptions();
    window.requestAnimationFrame(() => refs.selectionClose.focus());
  }

  function closeSelectionPanel() {
    if (refs.selectionPanel.hidden) return false;
    refs.selectionPanel.hidden = true;
    $$('.drawer.open').forEach((drawer) => drawer.removeAttribute('inert'));
    const returnFocus = state.selectionReturnFocus;
    state.selectionReturnFocus = null;
    window.requestAnimationFrame(() => returnFocus?.focus());
    return true;
  }

  function syncCoverModeFromArticle() {
    const article = state.current;
    if (!article) return;
    const galleryKey = getGalleryCoverKey(article.cover);
    if (state.coverGallery.some((cover) => cover.key === galleryKey)) {
      state.coverMode = 'gallery';
      state.galleryCoverKey = galleryKey;
    } else if (article.cover) {
      state.coverMode = 'upload';
      state.galleryCoverKey = '';
    } else {
      state.coverMode = 'auto';
      state.galleryCoverKey = '';
    }
  }

  // --- Article list ---

  function renderArticleList() {
    const query = state.search.trim().toLowerCase();
    const articles = state.articles.filter((article) => {
      if (state.filter === 'draft' && !article.draft) return false;
      if (state.filter === 'published' && article.draft) return false;
      if (!query) return true;
      return [article.title, article.description, article.slug].some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(query),
      );
    });

    refs.articleCount.textContent = `${articles.length} 篇`;
    if (!articles.length) {
      refs.articleList.innerHTML = '<div class="article-list-empty">没有匹配的文章</div>';
      return;
    }

    refs.articleList.innerHTML = articles
      .map((article) => {
        const active = article.slug === state.currentSlug;
        const status = article.parseError ? '需修复' : article.draft ? '草稿' : '已发布';
        const statusClass = article.parseError ? 'error' : article.draft ? '' : 'published';
        const meta = article.publishedAt || (article.draft ? '本地草稿' : '未填写日期');
        return `<button class="article-item${active ? ' active' : ''}" type="button" data-slug="${escapeHtml(article.slug)}" aria-current="${active ? 'true' : 'false'}" title="${escapeHtml(article.title || article.slug)}">
        <span class="article-rail${article.draft ? '' : ' published'}"></span>
        <span class="article-copy"><strong>${escapeHtml(article.title || article.slug)}</strong><small>${escapeHtml(meta)} · ${escapeHtml(article.category || '未分类')}${article.isMdx ? ' · MDX' : ''}</small></span>
        <span class="article-status ${statusClass}">${status}</span>
      </button>`;
      })
      .join('');

    refs.articleList.querySelectorAll('[data-slug]').forEach((button) => {
      button.addEventListener('click', () => selectArticle(button.dataset.slug));
    });
  }

  async function loadArticles() {
    const data = await api('/api/articles');
    state.articles = data.articles;
    state.categories = data.categories;
    state.tags = data.tags;
    state.coverGallery = data.covers || [];
    state.previewOrigin = data.previewOrigin;
    renderArticleList();
  }

  function syncSummary() {
    const category = state.selectedCategory;
    const tags = [...state.selectedTags];
    refs.summaryCategory.textContent = category || '未设置';
    refs.summaryTags.textContent = tags.length ? tags.join(' · ') : '未设置';
    if (state.coverMode === 'upload' && state.current?.cover) {
      refs.summaryCover.textContent = '✓ 专属封面';
    } else if (state.coverMode === 'gallery' && state.galleryCoverKey) {
      refs.summaryCover.textContent = `✓ 图库：${state.galleryCoverKey}`;
    } else if (state.coverMode === 'gallery') {
      refs.summaryCover.textContent = '选择图库封面';
    } else {
      refs.summaryCover.textContent = '自动封面';
    }
    updateTriggerValues();
  }

  function syncCurrentHeader() {
    const article = state.current;
    refs.currentTitle.textContent = refs.editorTitle.value.trim() || article?.title || '未命名文章';
    refs.currentState.textContent = article?.draft === false ? '已发布' : '草稿';
    refs.currentSlug.textContent = state.currentSlug;
    refs.derivedState.textContent = article?.draft === false ? '已发布' : '草稿';
    refs.derivedOrder.textContent = Number.isInteger(article?.order)
      ? String(article.order)
      : '自动';
  }

  function readRecovery() {
    try {
      const raw = localStorage.getItem(recoveryKey());
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function maybeOfferRecovery() {
    const recovery = readRecovery();
    if (!recovery) {
      refs.recoveryBanner.hidden = true;
      return;
    }
    const disk = collectRecovery();
    const fields = [
      'title',
      'body',
      'description',
      'category',
      'tags',
      'publishedAt',
      'updatedAt',
      'featured',
    ];
    refs.recoveryBanner.hidden = !fields.some((field) => recovery[field] !== disk[field]);
  }

  function restoreRecovery() {
    const recovery = readRecovery();
    if (!recovery) return;
    refs.editorTitle.value = recovery.title ?? refs.editorTitle.value;
    refs.editorBody.value = recovery.body ?? refs.editorBody.value;
    refs.metaDescription.value = recovery.description ?? refs.metaDescription.value;
    state.selectedCategory = recovery.category ?? state.selectedCategory;
    if (recovery.tags && typeof recovery.tags === 'string') {
      state.selectedTags = new Set(
        recovery.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      );
    }
    refs.metaPublishedAt.value = recovery.publishedAt ?? refs.metaPublishedAt.value;
    refs.metaUpdatedAt.value = recovery.updatedAt ?? refs.metaUpdatedAt.value;
    refs.metaFeatured.checked = recovery.featured ?? refs.metaFeatured.checked;
    if (recovery.coverMode) {
      state.coverMode = recovery.coverMode;
      state.galleryCoverKey = recovery.galleryCoverKey || '';
    }
    refs.recoveryBanner.hidden = true;
    autoResizeTitle();
    syncSummary();
    syncCurrentHeader();
    setModified(true);
    toast('已恢复本机副本，保存后才会写入 Markdown', 'success');
  }

  function renderCurrent() {
    const article = state.current;
    if (!article) return;
    refs.emptyEditor.hidden = true;
    refs.editorShell.hidden = false;
    refs.editorTitle.value = article.title ?? '';
    refs.editorBody.value = article.body ?? '';
    refs.metaSlug.textContent = article.slug;
    refs.metaDescription.value = article.description ?? '';
    state.selectedCategory = article.category ?? '';
    refs.settingsTagInput.value = '';
    state.selectedTags = new Set(article.tags ?? []);
    refs.metaPublishedAt.value = article.publishedAt ?? '';
    refs.metaUpdatedAt.value = article.updatedAt ?? '';
    refs.metaFeatured.checked = article.featured ?? false;
    syncCoverModeFromArticle();

    setEditable(article.editable !== false && !article.isMdx);
    autoResizeTitle();
    syncSummary();
    syncCurrentHeader();
    setModified(false);
    maybeOfferRecovery();
    renderArticleList();
    if (state.writingMode === 'split') refreshPreview({ saveModified: false });
  }

  async function selectArticle(slug) {
    if (slug === state.currentSlug) return;
    if (
      state.modified &&
      !window.confirm('当前文章尚未写入 Markdown，仍要切换吗？恢复副本会继续保留。')
    )
      return;
    try {
      state.current = await api(`/api/articles/${slug}`);
      state.currentSlug = slug;
      renderCurrent();
      if (window.innerWidth <= 900) refs.studioShell.classList.remove('library-open');
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  function collectCurrent() {
    return {
      title: refs.editorTitle.value.trim(),
      description: refs.metaDescription.value.trim(),
      category: state.selectedCategory,
      tags: [...state.selectedTags],
      cover:
        state.coverMode === 'upload'
          ? undefined
          : state.coverMode === 'gallery'
            ? state.galleryCoverKey || 'auto'
            : 'auto',
      publishedAt: refs.metaPublishedAt.value.trim() || undefined,
      updatedAt: refs.metaUpdatedAt.value.trim() || undefined,
      readingTime: estimateReadingTime(),
      featured: refs.metaFeatured.checked,
      draft: state.current?.draft !== false,
      homepageState: state.current?.draft === false ? '已发布' : '草稿',
      body: refs.editorBody.value,
    };
  }

  async function saveCurrent({ quiet = false, refresh = true } = {}) {
    if (!state.currentSlug || state.current?.editable === false || state.current?.isMdx) {
      throw new Error('当前内容不可由 Studio 写入');
    }
    const payload = collectCurrent();
    const saved = await api(`/api/articles/${state.currentSlug}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    state.current = saved;
    syncCoverModeFromArticle();
    clearRecovery();
    setModified(false);
    syncSummary();
    syncCurrentHeader();
    await loadArticles();
    if (refresh && state.writingMode === 'split') refreshPreview({ saveModified: false });
    if (!quiet) toast('已保存到本地 Markdown', 'success');
    return saved;
  }

  async function handleSave() {
    try {
      await saveCurrent();
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  function headingStructureValid(body) {
    const levels = String(body)
      .split('\n')
      .flatMap((line) => {
        const match = line.match(/^(#{2,3})\s+\S/);
        return match ? [match[1].length] : [];
      });
    let previous = 2;
    for (const level of levels) {
      if (level - previous > 1 || (level === 3 && previous < 2)) return false;
      previous = level;
    }
    return true;
  }

  function setCheck(name, passed, detail) {
    const row = $(`[data-check="${name}"]`);
    row.classList.toggle('passed', passed);
    row.classList.toggle('failed', !passed);
    row.querySelector('.check-icon').textContent = passed ? '✓' : '!';
    row.querySelector('.check-result').textContent = detail;
  }

  function runPublishChecks() {
    const title = refs.editorTitle.value.trim();
    const description = refs.metaDescription.value.trim();
    const category = state.selectedCategory;
    const tags = [...state.selectedTags];
    const content = Boolean(title && description);
    const taxonomy = Boolean(category && tags.length);
    const headings = headingStructureValid(refs.editorBody.value);
    const preview = Boolean(state.currentSlug && state.previewOrigin);
    setCheck('content', content, content ? '已通过' : '请补全');
    setCheck('taxonomy', taxonomy, taxonomy ? `${tags.length} 个标签` : '请补全');
    setCheck('headings', headings, headings ? '已通过' : '需要调整');
    setCheck('preview', preview, preview ? '已连接' : '预览服务未连接');
    const passed = content && taxonomy && headings && preview;
    const editable = state.current?.editable !== false && !state.current?.isMdx;
    const isPublic = state.current?.draft === false;
    refs.btnConfirmPublish.textContent = isPublic ? '保存公开更新' : '标记为公开';
    refs.btnConfirmPublish.disabled = !passed || !editable;
    refs.publishCheckStatus.classList.toggle('blocked', !passed || !editable);
    refs.publishCheckStatus.textContent = !editable
      ? '当前内容为只读 MDX，不能由 Studio 修改发布状态。'
      : passed
        ? isPublic
          ? '全部检查通过，可以保存这篇公开文章的本地更新。'
          : '全部检查通过，可以安全更新本地公开状态。'
        : '仍有未通过项目，修正后才能标记为公开。';
    return passed && editable;
  }

  async function handlePublish() {
    if (!runPublishChecks()) {
      toast('发布检查未通过，请先补全标记项目', 'error');
      return;
    }
    try {
      const isPublic = state.current?.draft === false;
      const publishedAt = refs.metaPublishedAt.value.trim() || localDate();
      const payload = {
        ...collectCurrent(),
        publishedAt,
        draft: false,
        homepageState: '已发布',
      };
      const saved = await api(`/api/articles/${state.currentSlug}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      state.current = saved;
      refs.metaPublishedAt.value = saved.publishedAt ?? publishedAt;
      clearRecovery();
      setModified(false);
      syncCurrentHeader();
      syncSummary();
      await loadArticles();
      closeDrawers();
      refreshPreview({ saveModified: false });
      toast(
        isPublic
          ? '已保存公开文章更新；部署前请运行完整验证'
          : '已标记为公开文章；部署前请运行完整验证',
        'success',
      );
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  function previewUrl() {
    return state.currentSlug
      ? `${state.previewOrigin}/notes/${state.currentSlug}/?studio=${Date.now()}`
      : '';
  }

  async function refreshPreview({ saveModified = true } = {}) {
    if (!state.currentSlug) return;
    try {
      if (saveModified && state.modified) await saveCurrent({ quiet: true, refresh: false });
      refs.previewEmpty.textContent = '正在生成真实 Astro 预览…';
      refs.previewEmpty.hidden = false;
      refs.previewFrame.src = previewUrl();
      refs.previewShell.hidden = false;
    } catch (error) {
      refs.previewEmpty.textContent = `预览加载失败：${error.message}`;
      refs.previewEmpty.hidden = false;
      toast(`无法刷新预览：${error.message}`, 'error');
    }
  }

  function openPreviewWindow() {
    if (!state.currentSlug) return toast('请先选择文章', 'error');
    window.open(previewUrl(), '_blank', 'noopener');
  }

  async function handleVerify() {
    refs.verifyOutput.hidden = false;
    refs.verifyOutput.textContent = '正在执行 lint、Astro check、build 与结构契约…';
    try {
      const result = await api('/api/verify', { method: 'POST', body: '{}' });
      refs.verifyOutput.textContent = `${result.success ? '✓ 验证通过' : '✕ 验证失败'}\n\n${result.stdout || ''}${result.stderr || ''}`;
    } catch (error) {
      refs.verifyOutput.textContent = `验证未完成\n\n${error.message}`;
    }
  }

  async function uploadCover() {
    const file = refs.metaCoverFile.files[0];
    if (!file || !state.currentSlug) return;
    if (file.size > 10 * 1024 * 1024) return toast('封面不能超过 10MB', 'error');
    const form = new FormData();
    form.append('cover', file);
    const status = $('#selection-cover-status');
    if (status) status.textContent = '正在压缩…';
    try {
      const data = await api(`/api/articles/${state.currentSlug}/cover`, {
        method: 'POST',
        body: form,
      });
      state.current.cover = data.cover;
      state.coverMode = 'upload';
      if (!refs.selectionPanel.hidden) renderCoverOptions();
      syncSummary();
      refreshPreview({ saveModified: false });
      toast('封面已写入文章资源目录', 'success');
    } catch (error) {
      const currentStatus = $('#selection-cover-status');
      if (currentStatus) currentStatus.textContent = '上传失败';
      toast(error.message, 'error');
    } finally {
      refs.metaCoverFile.value = '';
    }
  }

  async function createDraft(form) {
    const values = new FormData(form);
    const input = {
      slug: String(values.get('slug') ?? '').trim(),
      title: String(values.get('title') ?? '').trim(),
      description: String(values.get('description') ?? '').trim(),
      category: state.newCategory,
      tags: [...state.newTags],
    };
    if (!input.category) return toast('请选择一个主分类', 'error');
    if (!input.tags.length) return toast('请至少选择一个标签', 'error');
    try {
      const created = await api('/api/articles', { method: 'POST', body: JSON.stringify(input) });
      closeNewModal({ restoreFocus: false });
      await loadArticles();
      state.current = created;
      state.currentSlug = created.slug;
      renderCurrent();
      toast('草稿已创建，可以开始写作', 'success');
    } catch (error) {
      toast(error.message, 'error');
    }
  }

  const markdownActions = {
    bold: ['**', '**', '粗体'],
    italic: ['*', '*', '强调'],
    code: ['`', '`', 'code'],
    codeblock: ['```\n', '\n```', 'code'],
    link: ['[', '](https://)', '链接文字'],
    image: ['![', '](../../assets/images/...)', '图片说明'],
  };

  function insertMarkdown(action) {
    const textarea = refs.editorBody;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end);
    const prefixes = { h2: '## ', h3: '### ', list: '- ', quote: '> ' };

    if (prefixes[action]) {
      const lineStart = textarea.value.lastIndexOf('\n', start - 1) + 1;
      textarea.setRangeText(prefixes[action], lineStart, lineStart, 'end');
    } else {
      const [before, after, placeholder] = markdownActions[action];
      const content = selected || placeholder;
      textarea.setRangeText(`${before}${content}${after}`, start, end, 'select');
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + content.length;
    }
    textarea.focus();
    setModified(true);
  }

  function focusableElements(container) {
    return [
      ...container.querySelectorAll(
        [
          'a[href]',
          'button:not([disabled])',
          'input:not([disabled])',
          'textarea:not([disabled])',
          'select:not([disabled])',
          'summary',
          '[tabindex]:not([tabindex="-1"])',
        ].join(','),
      ),
    ].filter((element) => element.offsetParent !== null && !element.closest('[inert]'));
  }

  function trapFocus(event, container) {
    const focusable = focusableElements(container);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    const outside = !container.contains(document.activeElement);
    if (event.shiftKey && (document.activeElement === first || outside)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || outside)) {
      event.preventDefault();
      first.focus();
    }
  }

  function openDrawer(drawer) {
    const returnFocus = document.activeElement;
    closeDrawers({ restoreFocus: false });
    state.drawerReturnFocus = returnFocus;
    drawer.removeAttribute('inert');
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    refs.drawerScrim.classList.add('open');
    window.requestAnimationFrame(() => focusableElements(drawer)[0]?.focus());
    if (drawer === refs.publishDrawer) runPublishChecks();
  }

  function openCategorySettings() {
    openDrawer(refs.settingsDrawer);
    window.requestAnimationFrame(() => {
      refs.settingsCategoryOptions.querySelector('[aria-pressed="true"]')?.focus();
    });
  }

  function openTagSettings() {
    openDrawer(refs.settingsDrawer);
    window.requestAnimationFrame(() => refs.settingsTagInput.focus());
  }

  function closeDrawers({ restoreFocus = true } = {}) {
    closeTagMenu('current', { clear: true });
    const openDrawers = $$('.drawer.open');
    openDrawers.forEach((drawer) => {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
      drawer.setAttribute('inert', '');
    });
    refs.drawerScrim.classList.remove('open');
    const returnFocus = state.drawerReturnFocus;
    state.drawerReturnFocus = null;
    if (restoreFocus && openDrawers.length) returnFocus?.focus();
    return openDrawers.length > 0;
  }

  function resetNewDraftForm() {
    closeTagMenu('new', { clear: true });
    refs.newArticleForm.reset();
    state.newCategory = '';
    state.newTags = new Set();
    updateTriggerValues();
  }

  function openNewModal() {
    if (state.modified && !window.confirm('当前文章还有未保存修改，仍要创建新草稿吗？')) return;
    state.newModalReturnFocus = document.activeElement;
    closeDrawers({ restoreFocus: false });
    resetNewDraftForm();
    refs.newArticleModal.hidden = false;
    window.requestAnimationFrame(() => $('#new-title').focus());
  }

  function closeNewModal({ restoreFocus = true } = {}) {
    if (refs.newArticleModal.hidden) return false;
    refs.newArticleModal.hidden = true;
    resetNewDraftForm();
    const returnFocus = state.newModalReturnFocus;
    state.newModalReturnFocus = null;
    if (restoreFocus) returnFocus?.focus();
    return true;
  }

  function applyWritingMode(mode, { persist = true, refresh = true } = {}) {
    state.writingMode = mode === 'focus' ? 'focus' : 'split';
    refs.studioShell.classList.toggle('is-focus', state.writingMode === 'focus');
    refs.studioShell.classList.toggle('is-split', state.writingMode === 'split');
    $$('[data-writing-mode]').forEach((button) => {
      button.classList.toggle('active', button.dataset.writingMode === state.writingMode);
    });
    if (persist) localStorage.setItem(WRITING_MODE_KEY, state.writingMode);
    if (state.writingMode === 'split') window.requestAnimationFrame(fitDesktopPreview);
    if (refresh && state.writingMode === 'split' && state.currentSlug) {
      refreshPreview({ saveModified: true });
    }
  }

  function fitDesktopPreview() {
    if (state.previewDevice !== 'desktop') {
      refs.previewShell.style.removeProperty('--preview-scale');
      refs.previewShell.style.removeProperty('height');
      return;
    }
    const availableWidth = refs.previewStage.clientWidth - 36;
    const availableHeight = refs.previewStage.clientHeight - 36;
    if (availableWidth <= 0 || availableHeight <= 0) return;
    const scale = Math.min(1, availableWidth / DESKTOP_PREVIEW_WIDTH);
    refs.previewShell.style.setProperty('--preview-scale', String(scale));
    refs.previewShell.style.height = `${Math.max(420, availableHeight / scale)}px`;
  }

  function applyPreviewDevice(device) {
    state.previewDevice = device === 'mobile' ? 'mobile' : 'desktop';
    refs.previewShell.classList.toggle('is-mobile', state.previewDevice === 'mobile');
    refs.previewShell.classList.toggle('is-desktop', state.previewDevice === 'desktop');
    $$('[data-preview-device]').forEach((button) => {
      button.classList.toggle('active', button.dataset.previewDevice === state.previewDevice);
    });
    localStorage.setItem(PREVIEW_DEVICE_KEY, state.previewDevice);
    window.requestAnimationFrame(fitDesktopPreview);
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    $('#btn-theme').setAttribute(
      'aria-label',
      theme === 'dark' ? '切换到浅色主题' : '切换到深色主题',
    );
  }

  function bindEvents() {
    $('#btn-save').addEventListener('click', handleSave);
    $('#btn-settings').addEventListener('click', () => openDrawer(refs.settingsDrawer));
    $('#btn-publish-check').addEventListener('click', () => openDrawer(refs.publishDrawer));
    $('#btn-confirm-publish').addEventListener('click', handlePublish);
    $('#btn-verify').addEventListener('click', handleVerify);
    $('#btn-new-article').addEventListener('click', openNewModal);
    $('#btn-empty-new').addEventListener('click', openNewModal);
    $('#btn-refresh-preview').addEventListener('click', () =>
      refreshPreview({ saveModified: true }),
    );
    $('#btn-open-preview').addEventListener('click', openPreviewWindow);
    refs.previewFrame.addEventListener('load', () => {
      refs.previewEmpty.hidden = true;
    });
    refs.previewFrame.addEventListener('error', () => {
      refs.previewEmpty.textContent = '真实预览加载失败，请重试或在新窗口打开。';
      refs.previewEmpty.hidden = false;
    });
    refs.metaCoverFile.addEventListener('change', uploadCover);

    refs.summaryCategoryButton.addEventListener('click', openCategorySettings);
    refs.summaryTagsButton.addEventListener('click', openTagSettings);
    refs.summaryCover.addEventListener('click', openCoverPanel);
    refs.drawerScrim.addEventListener('click', () => closeDrawers());
    $$('[data-close-drawer]').forEach((button) =>
      button.addEventListener('click', () => closeDrawers()),
    );

    // Settings drawer triggers
    refs.settingsAddCategory.addEventListener('click', () => addCategory('current'));
    refs.settingsCategoryInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addCategory('current');
      }
    });
    bindTagCombobox('current');
    $('#cover-select-trigger').addEventListener('click', openCoverPanel);

    // New draft triggers
    refs.newAddCategory.addEventListener('click', () => addCategory('new'));
    refs.newCategoryInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addCategory('new');
      }
    });
    bindTagCombobox('new');

    // Selection panel control
    refs.selectionScrim.addEventListener('click', closeSelectionPanel);
    refs.selectionClose.addEventListener('click', closeSelectionPanel);
    refs.selectionDone.addEventListener('click', closeSelectionPanel);

    $('#btn-toggle-library').addEventListener('click', () => {
      if (window.innerWidth <= 900) refs.studioShell.classList.toggle('library-open');
      else refs.studioShell.classList.toggle('library-collapsed');
    });

    refs.newArticleForm.addEventListener('submit', (event) => {
      event.preventDefault();
      createDraft(event.currentTarget);
    });
    $('#btn-close-new').addEventListener('click', () => closeNewModal());
    $('#btn-cancel-new').addEventListener('click', () => closeNewModal());
    refs.newArticleModal.addEventListener('click', (event) => {
      if (event.target === event.currentTarget) closeNewModal();
    });
    document.addEventListener('pointerdown', (event) => {
      ['current', 'new'].forEach((context) => {
        const { combobox, menu } = tagElements(context);
        if (!menu.hidden && !combobox.contains(event.target))
          closeTagMenu(context, { clear: true });
      });
    });

    $$('.filter-btn').forEach((button) =>
      button.addEventListener('click', () => {
        state.filter = button.dataset.filter;
        $$('.filter-btn').forEach((item) => {
          const active = item === button;
          item.classList.toggle('active', active);
          item.setAttribute('aria-pressed', String(active));
        });
        renderArticleList();
      }),
    );

    refs.search.addEventListener('input', () => {
      state.search = refs.search.value;
      renderArticleList();
    });

    [
      refs.editorTitle,
      refs.editorBody,
      refs.metaDescription,
      refs.metaPublishedAt,
      refs.metaUpdatedAt,
    ].forEach((element) =>
      element.addEventListener('input', () => {
        if (element === refs.editorTitle) autoResizeTitle();
        syncSummary();
        syncCurrentHeader();
        setModified(true);
      }),
    );
    refs.metaFeatured.addEventListener('change', () => setModified(true));

    $$('.tool-btn').forEach((button) =>
      button.addEventListener('click', () => insertMarkdown(button.dataset.markdown)),
    );
    $$('[data-writing-mode]').forEach((button) =>
      button.addEventListener('click', () => applyWritingMode(button.dataset.writingMode)),
    );
    $$('[data-preview-device]').forEach((button) =>
      button.addEventListener('click', () => applyPreviewDevice(button.dataset.previewDevice)),
    );

    $('#btn-theme').addEventListener('click', () => {
      applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    });
    $('#btn-restore-recovery').addEventListener('click', restoreRecovery);
    $('#btn-dismiss-recovery').addEventListener('click', () => clearRecovery());

    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        handleSave();
      }
      if (event.key === 'Tab') {
        const focusScope = !refs.selectionPanel.hidden
          ? $('#selection-sheet')
          : !refs.newArticleModal.hidden
            ? refs.newArticleForm
            : $('.drawer.open');
        if (focusScope) trapFocus(event, focusScope);
      }
      if (event.key === 'Escape') {
        const tagMenuOpen = !refs.settingsTagOptions.hidden || !refs.newTagOptions.hidden;
        if (tagMenuOpen) {
          closeTagMenu('current', { clear: true });
          closeTagMenu('new', { clear: true });
          return;
        }
        if (closeSelectionPanel()) return;
        if (closeNewModal()) return;
        if (closeDrawers()) return;
        refs.studioShell.classList.remove('library-open');
      }
    });

    window.addEventListener('resize', () => {
      ['current', 'new'].forEach((context) => {
        const { menu } = tagElements(context);
        if (!menu.hidden) positionTagMenu(context);
      });
    });

    window.addEventListener('beforeunload', (event) => {
      if (!state.modified) return;
      event.preventDefault();
    });
  }

  async function init() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    applyTheme(
      savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    );
    applyWritingMode(state.writingMode, { persist: false, refresh: false });
    applyPreviewDevice(state.previewDevice);
    bindEvents();
    if ('ResizeObserver' in window) {
      const previewResizeObserver = new window.ResizeObserver(fitDesktopPreview);
      previewResizeObserver.observe(refs.previewStage);
    } else {
      window.addEventListener('resize', fitDesktopPreview);
    }
    try {
      await ensureSession();
      await loadArticles();
      refs.connection.textContent = '本机已连接';
      const first = state.articles[0];
      if (first) await selectArticle(first.slug);
    } catch (error) {
      refs.connection.textContent = '连接失败';
      refs.articleList.innerHTML = `<div class="article-list-empty">${escapeHtml(error.message)}</div>`;
      toast(error.message, 'error');
    }
  }

  init();
})();
