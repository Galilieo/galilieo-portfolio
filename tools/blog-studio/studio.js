(() => {
  'use strict';

  const WRITING_MODE_KEY = 'galilieo-studio-writing-mode';
  const PREVIEW_DEVICE_KEY = 'galilieo-studio-preview-device';
  const THEME_KEY = 'galilieo-studio-theme';
  const RECOVERY_PREFIX = 'galilieo-studio-recovery:';

  const state = {
    articles: [],
    categories: [],
    tags: [],
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
  };

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const refs = {
    articleCount: $('#article-count'),
    articleList: $('#article-list'),
    btnConfirmPublish: $('#btn-confirm-publish'),
    categoryOptions: $('#category-options'),
    categorySuggestions: $('#category-suggestions'),
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
    metaCategory: $('#meta-category'),
    metaCoverFile: $('#meta-cover-file'),
    metaDescription: $('#meta-description'),
    metaFeatured: $('#meta-featured'),
    metaFields: $('#meta-fields'),
    metaPublishedAt: $('#meta-publishedAt'),
    metaSlug: $('#meta-slug'),
    metaTags: $('#meta-tags'),
    metaUpdatedAt: $('#meta-updatedAt'),
    previewEmpty: $('#preview-empty'),
    previewFrame: $('#preview-frame'),
    previewPanel: $('#preview-panel'),
    previewShell: $('#preview-shell'),
    publishDrawer: $('#publish-drawer'),
    publishCheckStatus: $('#publish-check-status'),
    readOnlyBadge: $('#read-only-badge'),
    readingTimeDisplay: $('#reading-time-display'),
    recoveryBanner: $('#recovery-banner'),
    search: $('#search-articles'),
    settingsDrawer: $('#settings-drawer'),
    studioShell: $('#studio-shell'),
    summaryCategory: $('#summary-category strong'),
    summaryCategoryButton: $('#summary-category'),
    summaryCover: $('#summary-cover'),
    summaryTags: $('#summary-tags strong'),
    summaryTagsButton: $('#summary-tags'),
    tagOptions: $('#tag-options'),
    tagSuggestions: $('#tag-suggestions'),
    toast: $('#toast'),
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
    toast.timer = window.setTimeout(() => { refs.toast.hidden = true; }, 3200);
  }

  function localDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function estimateReadingTime(body = refs.editorBody.value) {
    const content = String(body).replace(/```[\s\S]*?```/g, ' ').trim();
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
      category: refs.metaCategory.value,
      tags: refs.metaTags.value,
      publishedAt: refs.metaPublishedAt.value,
      updatedAt: refs.metaUpdatedAt.value,
      featured: refs.metaFeatured.checked,
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
    $$('[data-editable-control], .tool-btn, #btn-save, #btn-upload-cover, #btn-confirm-publish')
      .forEach((element) => { element.disabled = !editable; });
    refs.readOnlyBadge.hidden = editable;
  }

  function optionList(element, values) {
    element.innerHTML = values.map((value) => `<option value="${escapeHtml(value)}"></option>`).join('');
  }

  function updateTaxonomySuggestionState() {
    const category = refs.metaCategory.value.trim();
    const tags = new Set(refs.metaTags.value.split(',').map((tag) => tag.trim()).filter(Boolean));
    refs.categorySuggestions.querySelectorAll('[data-value]').forEach((button) => {
      button.classList.toggle('active', button.dataset.value === category);
    });
    refs.tagSuggestions.querySelectorAll('[data-value]').forEach((button) => {
      button.classList.toggle('active', tags.has(button.dataset.value));
    });
  }

  function renderTaxonomySuggestions() {
    const currentCategory = refs.metaCategory.value.trim();
    const selectedTags = refs.metaTags.value.split(',').map((tag) => tag.trim()).filter(Boolean);
    const categories = [currentCategory, ...state.categories].filter((value, index, values) => value && values.indexOf(value) === index);
    const tags = [...selectedTags, ...state.tags].filter((value, index, values) => value && values.indexOf(value) === index);
    refs.categorySuggestions.innerHTML = categories.slice(0, 6)
      .map((value) => `<button class="taxonomy-suggestion" type="button" data-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`)
      .join('');
    refs.tagSuggestions.innerHTML = tags.slice(0, 10)
      .map((value) => `<button class="taxonomy-suggestion" type="button" data-value="${escapeHtml(value)}">${escapeHtml(value)}</button>`)
      .join('');

    refs.categorySuggestions.querySelectorAll('[data-value]').forEach((button) => {
      button.addEventListener('click', () => {
        refs.metaCategory.value = button.dataset.value;
        syncSummary();
        setModified(true);
      });
    });
    refs.tagSuggestions.querySelectorAll('[data-value]').forEach((button) => {
      button.addEventListener('click', () => {
        const selected = new Set(refs.metaTags.value.split(',').map((tag) => tag.trim()).filter(Boolean));
        if (selected.has(button.dataset.value)) selected.delete(button.dataset.value);
        else selected.add(button.dataset.value);
        refs.metaTags.value = [...selected].join(', ');
        syncSummary();
        setModified(true);
      });
    });
    updateTaxonomySuggestionState();
  }

  function renderArticleList() {
    const query = state.search.trim().toLowerCase();
    const articles = state.articles.filter((article) => {
      if (state.filter === 'draft' && !article.draft) return false;
      if (state.filter === 'published' && article.draft) return false;
      if (!query) return true;
      return [article.title, article.description, article.slug]
        .some((value) => String(value ?? '').toLowerCase().includes(query));
    });

    refs.articleCount.textContent = `${articles.length} 篇`;
    if (!articles.length) {
      refs.articleList.innerHTML = '<div class="article-list-empty">没有匹配的文章</div>';
      return;
    }

    refs.articleList.innerHTML = articles.map((article) => {
      const active = article.slug === state.currentSlug;
      const status = article.parseError ? '需修复' : article.draft ? '草稿' : '已发布';
      const statusClass = article.parseError ? 'error' : article.draft ? '' : 'published';
      const meta = article.publishedAt || (article.draft ? '本地草稿' : '未填写日期');
      return `<button class="article-item${active ? ' active' : ''}" type="button" data-slug="${escapeHtml(article.slug)}" aria-current="${active ? 'true' : 'false'}" title="${escapeHtml(article.title || article.slug)}">
        <span class="article-rail${article.draft ? '' : ' published'}"></span>
        <span class="article-copy"><strong>${escapeHtml(article.title || article.slug)}</strong><small>${escapeHtml(meta)} · ${escapeHtml(article.category || '未分类')}${article.isMdx ? ' · MDX' : ''}</small></span>
        <span class="article-status ${statusClass}">${status}</span>
      </button>`;
    }).join('');

    refs.articleList.querySelectorAll('[data-slug]').forEach((button) => {
      button.addEventListener('click', () => selectArticle(button.dataset.slug));
    });
  }

  async function loadArticles() {
    const data = await api('/api/articles');
    state.articles = data.articles;
    state.categories = data.categories;
    state.tags = data.tags;
    state.previewOrigin = data.previewOrigin;
    optionList(refs.categoryOptions, state.categories);
    optionList(refs.tagOptions, state.tags);
    renderTaxonomySuggestions();
    renderArticleList();
  }

  function syncSummary() {
    const category = refs.metaCategory.value.trim();
    const tags = refs.metaTags.value.split(',').map((tag) => tag.trim()).filter(Boolean);
    refs.summaryCategory.textContent = category || '未设置';
    refs.summaryTags.textContent = tags.length ? tags.join(' · ') : '未设置';
    refs.summaryCover.textContent = state.current?.cover ? '✓ 已设置封面' : '＋ 设置封面';
    updateTaxonomySuggestionState();
  }

  function syncCurrentHeader() {
    const article = state.current;
    refs.currentTitle.textContent = refs.editorTitle.value.trim() || article?.title || '未命名文章';
    refs.currentState.textContent = article?.draft === false ? '已发布' : '草稿';
    refs.currentSlug.textContent = state.currentSlug;
    refs.derivedState.textContent = article?.draft === false ? '已发布' : '草稿';
    refs.derivedOrder.textContent = Number.isInteger(article?.order) ? String(article.order) : '自动';
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
    const fields = ['title', 'body', 'description', 'category', 'tags', 'publishedAt', 'updatedAt', 'featured'];
    refs.recoveryBanner.hidden = !fields.some((field) => recovery[field] !== disk[field]);
  }

  function restoreRecovery() {
    const recovery = readRecovery();
    if (!recovery) return;
    refs.editorTitle.value = recovery.title ?? refs.editorTitle.value;
    refs.editorBody.value = recovery.body ?? refs.editorBody.value;
    refs.metaDescription.value = recovery.description ?? refs.metaDescription.value;
    refs.metaCategory.value = recovery.category ?? refs.metaCategory.value;
    refs.metaTags.value = recovery.tags ?? refs.metaTags.value;
    refs.metaPublishedAt.value = recovery.publishedAt ?? refs.metaPublishedAt.value;
    refs.metaUpdatedAt.value = recovery.updatedAt ?? refs.metaUpdatedAt.value;
    refs.metaFeatured.checked = recovery.featured ?? refs.metaFeatured.checked;
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
    refs.metaCategory.value = article.category ?? '';
    refs.metaTags.value = (article.tags ?? []).join(', ');
    refs.metaPublishedAt.value = article.publishedAt ?? '';
    refs.metaUpdatedAt.value = article.updatedAt ?? '';
    refs.metaFeatured.checked = article.featured ?? false;
    $('#cover-status').textContent = article.cover ? '已设置，上传新图片可替换' : '未设置';
    renderTaxonomySuggestions();
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
    if (state.modified && !window.confirm('当前文章尚未写入 Markdown，仍要切换吗？恢复副本会继续保留。')) return;
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
      category: refs.metaCategory.value.trim(),
      tags: refs.metaTags.value.split(',').map((tag) => tag.trim()).filter(Boolean),
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
    const saved = await api(`/api/articles/${state.currentSlug}`, {
      method: 'PUT',
      body: JSON.stringify(collectCurrent()),
    });
    state.current = saved;
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
    const levels = String(body).split('\n').flatMap((line) => {
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
    const category = refs.metaCategory.value.trim();
    const tags = refs.metaTags.value.split(',').map((tag) => tag.trim()).filter(Boolean);
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
    refs.btnConfirmPublish.disabled = !passed || !editable;
    refs.publishCheckStatus.classList.toggle('blocked', !passed || !editable);
    refs.publishCheckStatus.textContent = !editable
      ? '当前内容为只读 MDX，不能由 Studio 修改发布状态。'
      : passed
        ? '全部检查通过，可以安全更新本地公开状态。'
        : '仍有未通过项目，修正后才能标记为公开。';
    return passed && editable;
  }

  async function handlePublish() {
    if (!runPublishChecks()) {
      toast('发布检查未通过，请先补全标记项目', 'error');
      return;
    }
    try {
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
      toast('已标记为公开文章；部署前请运行完整验证', 'success');
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
    $('#cover-status').textContent = '正在压缩…';
    try {
      const data = await api(`/api/articles/${state.currentSlug}/cover`, { method: 'POST', body: form });
      state.current.cover = data.cover;
      $('#cover-status').textContent = '已压缩为 WebP';
      syncSummary();
      refreshPreview({ saveModified: false });
      toast('封面已写入文章资源目录', 'success');
    } catch (error) {
      $('#cover-status').textContent = '上传失败';
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
      category: String(values.get('category') ?? '').trim(),
      tags: String(values.get('tags') ?? '').split(',').map((tag) => tag.trim()).filter(Boolean),
    };
    try {
      const created = await api('/api/articles', { method: 'POST', body: JSON.stringify(input) });
      $('#new-article-modal').hidden = true;
      form.reset();
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

  function openDrawer(drawer) {
    closeDrawers();
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    refs.drawerScrim.classList.add('open');
    if (drawer === refs.publishDrawer) runPublishChecks();
  }

  function closeDrawers() {
    $$('.drawer.open').forEach((drawer) => {
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
    });
    refs.drawerScrim.classList.remove('open');
  }

  function openNewModal() {
    $('#new-article-modal').hidden = false;
    $('#new-title').focus();
  }

  function closeNewModal() {
    $('#new-article-modal').hidden = true;
  }

  function applyWritingMode(mode, { persist = true, refresh = true } = {}) {
    state.writingMode = mode === 'focus' ? 'focus' : 'split';
    refs.studioShell.classList.toggle('is-focus', state.writingMode === 'focus');
    refs.studioShell.classList.toggle('is-split', state.writingMode === 'split');
    $$('[data-writing-mode]').forEach((button) => {
      button.classList.toggle('active', button.dataset.writingMode === state.writingMode);
    });
    if (persist) localStorage.setItem(WRITING_MODE_KEY, state.writingMode);
    if (refresh && state.writingMode === 'split' && state.currentSlug) {
      refreshPreview({ saveModified: true });
    }
  }

  function applyPreviewDevice(device) {
    state.previewDevice = device === 'mobile' ? 'mobile' : 'desktop';
    refs.previewShell.classList.toggle('is-mobile', state.previewDevice === 'mobile');
    $$('[data-preview-device]').forEach((button) => {
      button.classList.toggle('active', button.dataset.previewDevice === state.previewDevice);
    });
    localStorage.setItem(PREVIEW_DEVICE_KEY, state.previewDevice);
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    $('#btn-theme').setAttribute('aria-label', theme === 'dark' ? '切换到浅色主题' : '切换到深色主题');
  }

  function bindEvents() {
    $('#btn-save').addEventListener('click', handleSave);
    $('#btn-settings').addEventListener('click', () => openDrawer(refs.settingsDrawer));
    $('#btn-publish-check').addEventListener('click', () => openDrawer(refs.publishDrawer));
    $('#btn-confirm-publish').addEventListener('click', handlePublish);
    $('#btn-verify').addEventListener('click', handleVerify);
    $('#btn-new-article').addEventListener('click', openNewModal);
    $('#btn-empty-new').addEventListener('click', openNewModal);
    $('#btn-refresh-preview').addEventListener('click', () => refreshPreview({ saveModified: true }));
    $('#btn-open-preview').addEventListener('click', openPreviewWindow);
    refs.previewFrame.addEventListener('load', () => { refs.previewEmpty.hidden = true; });
    refs.previewFrame.addEventListener('error', () => {
      refs.previewEmpty.textContent = '真实预览加载失败，请重试或在新窗口打开。';
      refs.previewEmpty.hidden = false;
    });
    $('#btn-upload-cover').addEventListener('click', () => refs.metaCoverFile.click());
    refs.metaCoverFile.addEventListener('change', uploadCover);
    refs.summaryCategoryButton.addEventListener('click', () => openDrawer(refs.settingsDrawer));
    refs.summaryTagsButton.addEventListener('click', () => openDrawer(refs.settingsDrawer));
    refs.summaryCover.addEventListener('click', () => openDrawer(refs.settingsDrawer));
    refs.drawerScrim.addEventListener('click', closeDrawers);
    $$('[data-close-drawer]').forEach((button) => button.addEventListener('click', closeDrawers));

    $('#btn-toggle-library').addEventListener('click', () => {
      if (window.innerWidth <= 900) refs.studioShell.classList.toggle('library-open');
      else refs.studioShell.classList.toggle('library-collapsed');
    });

    $('#new-article-form').addEventListener('submit', (event) => {
      event.preventDefault();
      createDraft(event.currentTarget);
    });
    $('#btn-close-new').addEventListener('click', closeNewModal);
    $('#btn-cancel-new').addEventListener('click', closeNewModal);
    $('#new-article-modal').addEventListener('click', (event) => {
      if (event.target === event.currentTarget) closeNewModal();
    });

    $$('.filter-btn').forEach((button) => button.addEventListener('click', () => {
      state.filter = button.dataset.filter;
      $$('.filter-btn').forEach((item) => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      renderArticleList();
    }));

    refs.search.addEventListener('input', () => {
      state.search = refs.search.value;
      renderArticleList();
    });

    [refs.editorTitle, refs.editorBody, refs.metaDescription, refs.metaCategory, refs.metaTags,
      refs.metaPublishedAt, refs.metaUpdatedAt].forEach((element) => element.addEventListener('input', () => {
      if (element === refs.editorTitle) autoResizeTitle();
      syncSummary();
      syncCurrentHeader();
      setModified(true);
    }));
    refs.metaFeatured.addEventListener('change', () => setModified(true));

    $$('.tool-btn').forEach((button) => button.addEventListener('click', () => insertMarkdown(button.dataset.markdown)));
    $$('[data-writing-mode]').forEach((button) => button.addEventListener('click', () => applyWritingMode(button.dataset.writingMode)));
    $$('[data-preview-device]').forEach((button) => button.addEventListener('click', () => applyPreviewDevice(button.dataset.previewDevice)));

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
      if (event.key === 'Escape') {
        closeDrawers();
        closeNewModal();
        refs.studioShell.classList.remove('library-open');
      }
    });

    window.addEventListener('beforeunload', (event) => {
      if (!state.modified) return;
      event.preventDefault();
    });
  }

  async function init() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    applyTheme(savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    applyWritingMode(state.writingMode, { persist: false, refresh: false });
    applyPreviewDevice(state.previewDevice);
    bindEvents();
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
