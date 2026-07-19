function tagsWithMarker(html, tagName, marker) {
  const expression = new RegExp(`<${tagName}\\b[^>]*${marker}[^>]*>`, 'g');
  return html.match(expression) ?? [];
}

function attribute(markup, name) {
  return markup.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] ?? '';
}

function markedBlock(html, tagName, marker) {
  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedTagName = escapeRegExp(tagName);
  const escapedMarker = escapeRegExp(marker);
  const openingMatch = new RegExp(`<${escapedTagName}\\b[^>]*${escapedMarker}[^>]*>`).exec(html);

  if (!openingMatch || /\/\s*>$/.test(openingMatch[0])) return '';

  const tagExpression = new RegExp(`<\\/?${escapedTagName}\\b[^>]*>`, 'g');
  tagExpression.lastIndex = openingMatch.index;
  let depth = 0;
  let tagMatch;

  while ((tagMatch = tagExpression.exec(html))) {
    const tag = tagMatch[0];
    if (tag.startsWith('</')) {
      depth -= 1;
      if (depth === 0) return html.slice(openingMatch.index, tagExpression.lastIndex);
      if (depth < 0) return '';
    } else if (!/\/\s*>$/.test(tag)) {
      depth += 1;
    }
  }

  return '';
}

function tocTargets(markup) {
  return new Set(
    tagsWithMarker(markup, 'a', 'data-reading-toc-link')
      .map((link) => attribute(link, 'href'))
      .filter((href) => href.startsWith('#'))
      .map((href) => href.slice(1)),
  );
}

function recommendationLinks(markup) {
  return tagsWithMarker(markup, 'a', 'data-article-recommendation-link');
}

function compareTocTargets({ slug, label, headingIds, targets, failures }) {
  for (const id of headingIds) {
    if (!targets.has(id)) failures.push(`/notes/${slug}/ ${label} TOC is missing target #${id}.`);
  }
  for (const id of targets) {
    if (!headingIds.has(id)) {
      failures.push(`/notes/${slug}/ ${label} TOC links to missing heading #${id}.`);
    }
  }
}

export function checkGeneratedArticle({ slug, html }) {
  const failures = [];
  const bodyOpening = tagsWithMarker(html, 'div', 'data-article-body')[0] ?? '';
  const body = markedBlock(html, 'div', 'data-article-body');
  const bodyClasses = new Set(attribute(bodyOpening, 'class').split(/\s+/).filter(Boolean));
  const headingIds = new Set(
    [...body.matchAll(/<h[23]\b[^>]*\bid="([^"]+)"[^>]*>/g)].map((match) => match[1]),
  );
  const desktopNavigation = markedBlock(html, 'aside', 'article-reading-navigation--desktop');
  const mobileNavigation = markedBlock(html, 'details', 'article-reading-navigation--mobile');
  const desktopTocTargets = tocTargets(desktopNavigation);
  const mobileTocTargets = tocTargets(mobileNavigation);
  const desktopRecommendations = markedBlock(
    html,
    'section',
    'data-article-recommendations="desktop"',
  );
  const mobileRecommendations = markedBlock(
    html,
    'section',
    'data-article-recommendations="mobile"',
  );
  const desktopRecommendationLinks = recommendationLinks(desktopRecommendations);
  const mobileRecommendationLinks = recommendationLinks(mobileRecommendations);
  const desktopRecommendationCount = desktopRecommendationLinks.length;
  const mobileRecommendationCount = mobileRecommendationLinks.length;

  if (html.includes('data-reading-tab') || html.includes('data-reading-panel')) {
    failures.push(`/notes/${slug}/ must not render the removed mobile Category / article tabs.`);
  }

  if (headingIds.size > 0) {
    if (!desktopNavigation) {
      failures.push(`/notes/${slug}/ must render a desktop article TOC.`);
    }
    if (!mobileNavigation) {
      failures.push(`/notes/${slug}/ must render a native mobile article TOC.`);
    }
    compareTocTargets({
      slug,
      label: 'desktop',
      headingIds,
      targets: desktopTocTargets,
      failures,
    });
    compareTocTargets({
      slug,
      label: 'mobile',
      headingIds,
      targets: mobileTocTargets,
      failures,
    });
  } else {
    if (desktopTocTargets.size > 0 || mobileTocTargets.size > 0) {
      failures.push(`/notes/${slug}/ must not render TOC links without H2/H3 headings.`);
    }
    if (mobileNavigation) {
      failures.push(`/notes/${slug}/ must not render an empty mobile article TOC.`);
    }
  }

  if (desktopRecommendationCount > 3) {
    failures.push(`/notes/${slug}/ desktop Recommended must contain at most 3 articles.`);
  }
  if (mobileRecommendationCount > 2) {
    failures.push(`/notes/${slug}/ mobile Recommended must contain at most 2 articles.`);
  }
  if (desktopRecommendationCount !== mobileRecommendationCount) {
    const expectedMobileCount = Math.min(desktopRecommendationCount, 2);
    if (mobileRecommendationCount !== expectedMobileCount) {
      failures.push(`/notes/${slug}/ desktop and mobile Recommended lists must stay in sync.`);
    }
  }
  if (desktopRecommendations && desktopRecommendationCount === 0) {
    failures.push(`/notes/${slug}/ must not render an empty desktop Recommended section.`);
  }
  if (mobileRecommendations && mobileRecommendationCount === 0) {
    failures.push(`/notes/${slug}/ must not render an empty mobile Recommended section.`);
  }
  if (desktopRecommendationCount > 0 && !desktopNavigation.includes(desktopRecommendations)) {
    failures.push(`/notes/${slug}/ desktop Recommended must be inside the reading rail.`);
  }
  if (headingIds.size === 0 && desktopRecommendationCount === 0 && desktopNavigation) {
    failures.push(`/notes/${slug}/ must not render an empty desktop reading rail.`);
  }

  for (const recommendationLink of [...desktopRecommendationLinks, ...mobileRecommendationLinks]) {
    if (attribute(recommendationLink, 'href') === `/notes/${slug}/`) {
      failures.push(`/notes/${slug}/ must not recommend itself.`);
    }
  }

  const hero = tagsWithMarker(html, 'section', 'data-article-hero')[0] ?? '';
  const cover = markedBlock(html, 'div', 'data-article-cover');
  const coverImage = cover.match(/<img\b[^>]*>/)?.[0] ?? '';
  const hasOptimizedCover =
    coverImage &&
    ['srcset', 'sizes', 'width', 'height'].every(
      (name) => attribute(coverImage, name).trim() !== '',
    );
  const backLink = tagsWithMarker(html, 'a', 'data-article-back-link')[0] ?? '';

  if (!hero) failures.push(`/notes/${slug}/ must render the article hero.`);
  if (!hasOptimizedCover) {
    failures.push(`/notes/${slug}/ must render an optimized article cover.`);
  }
  if (!body) failures.push(`/notes/${slug}/ must mark the server-rendered article body.`);
  if (bodyClasses.has('prose') && bodyClasses.has('reveal')) {
    failures.push(`/notes/${slug}/ must not gate the whole article body behind Reveal.`);
  }
  if (attribute(backLink, 'href') !== '/notes/') {
    failures.push(`/notes/${slug}/ must provide a stable back link to /notes/.`);
  }

  return failures;
}
