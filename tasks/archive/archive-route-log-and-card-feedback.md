# Archive Route Log and Card Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved archive route-log timeline, responsive day/night paper-boat ending, and consistent feedback for real whole-card links.

**Architecture:** Keep Astro content rendering and the existing archive tab controller unchanged. Add one focused `ArchiveVoyage.astro` presentation component, reshape archive markup into a three-column CSS grid, and reuse existing semantic tokens for motion and focus feedback. Add generated-output contract checks before implementation so the build proves the archive structure remains server-rendered and progressively enhanced.

**Tech Stack:** Astro 7, TypeScript, Astro Assets, native CSS, existing browser TypeScript, Node generated-site contracts, Playwright browser verification.

---

### Task 1: Add the failing archive structure contract

**Files:**

- Modify: `scripts/check-site-contracts.mjs`

- [x] **Step 1: Add generated archive assertions**

After the public-page shell loop, read `dist/archive/index.html` and require the approved server-rendered markers:

```js
const archive = readDist('archive', 'index.html');
for (const marker of [
  'data-archive-course',
  'class="archive-chain__chapter"',
  'class="archive-chain__track"',
  'class="archive-chain__beacon"',
  'data-archive-voyage',
  'data-archive-voyage-day',
  'data-archive-voyage-night',
]) {
  if (!archive.includes(marker)) failures.push(`Archive must render ${marker}.`);
}
if (count(archive, 'data-archive-voyage') !== 1) {
  failures.push('Archive must render exactly one voyage ending.');
}
```

- [x] **Step 2: Build the current site**

Run: `pnpm run build`

Expected: PASS and generate the current archive HTML.

- [x] **Step 3: Prove the new contract fails before implementation**

Run: `pnpm run check:site`

Expected: FAIL with missing `data-archive-course` and `data-archive-voyage` markers.

### Task 2: Add optimized archive voyage assets and component

**Files:**

- Create: `src/assets/images/archive/archive-voyage-day.png`
- Create: `src/assets/images/archive/archive-voyage-night.png`
- Create: `src/components/archive/ArchiveVoyage.astro`

- [x] **Step 1: Copy the approved original image outputs into source assets**

Copy exactly:

```text
C:/Users/29303/.codex/generated_images/019f7498-16cf-7ee0-bde1-afb1afeeda20/exec-dde15352-67d9-4551-8fd4-7d52088de8ab.png
  -> src/assets/images/archive/archive-voyage-day.png
C:/Users/29303/.codex/generated_images/019f7498-16cf-7ee0-bde1-afb1afeeda20/exec-12ed4352-444f-405b-92e0-1c1b318bec60.png
  -> src/assets/images/archive/archive-voyage-night.png
```

- [x] **Step 2: Implement the isolated voyage component**

The component imports `Image` plus both source images and renders one transition, one media stack, and one text block:

```astro
---
import { Image } from 'astro:assets';
import dayVoyage from '../../assets/images/archive/archive-voyage-day.png';
import nightVoyage from '../../assets/images/archive/archive-voyage-night.png';
---

<section class="archive-voyage" data-archive-voyage aria-labelledby="archive-voyage-title">
  <div class="archive-voyage__transition" aria-hidden="true">
    <span class="archive-voyage__line"></span>
    <span class="archive-voyage__lights"><i></i><i></i><i></i><i></i><i></i></span>
    <span class="archive-voyage__ripples"></span>
  </div>
  <div class="archive-voyage__scene">
    <div class="archive-voyage__media" aria-hidden="true">
      <Image class="archive-voyage__image archive-voyage__image--day archive-voyage__image--base" data-archive-voyage-day src={dayVoyage} alt="" widths={[720, 1180, 1440]} sizes="(max-width: 1180px) 100vw, 1180px" loading="lazy" />
      <Image class="archive-voyage__image archive-voyage__image--day archive-voyage__image--focus" src={dayVoyage} alt="" widths={[720, 1180, 1440]} sizes="(max-width: 1180px) 100vw, 1180px" loading="lazy" />
      <Image class="archive-voyage__image archive-voyage__image--night archive-voyage__image--base" data-archive-voyage-night src={nightVoyage} alt="" widths={[720, 1180, 1440]} sizes="(max-width: 1180px) 100vw, 1180px" loading="lazy" />
      <Image class="archive-voyage__image archive-voyage__image--night archive-voyage__image--focus" src={nightVoyage} alt="" widths={[720, 1180, 1440]} sizes="(max-width: 1180px) 100vw, 1180px" loading="lazy" />
    </div>
    <div class="archive-voyage__copy">
      <p>Continue the voyage</p>
      <h2 id="archive-voyage-title">下一段，仍在航行</h2>
      <span>只留下一个轻量的视觉句号，不把归档页变成第二个首页。</span>
    </div>
    <span class="archive-voyage__glint" aria-hidden="true"></span>
  </div>
</section>
```

- [x] **Step 3: Format the new component**

Run: `pnpm exec prettier --write src/components/archive/ArchiveVoyage.astro`

Expected: one formatted Astro component with no generated directories changed.

### Task 3: Reshape archive markup into the route-log grid

**Files:**

- Modify: `src/pages/archive/index.astro`

- [x] **Step 1: Import and render the voyage component once**

Add `ArchiveVoyage` beside the existing imports, then render `<ArchiveVoyage />` after both tab panels but inside `data-archive-timeline`. This preserves one ending with JavaScript enabled or disabled.

- [x] **Step 2: Replace month pills with chapter rows**

For every blog month and for the personal range, replace the standalone title with:

```astro
<header class="archive-chain__chapter">
  <h3 class="archive-chain__month-title">
    <strong>{month}</strong>
    <span>Current course</span>
  </h3>
</header>
```

The personal label uses `2024 — Present` and `Personal course`.

- [x] **Step 3: Add semantic track markup to every record**

Keep the full card anchor unchanged and append this decorative sibling inside each `<li>`:

```astro
<span class="archive-chain__track" aria-hidden="true">
  <i class="archive-chain__beacon"></i>
</span>
```

Add `data-archive-course` to both `.archive-chain` containers. Do not copy titles, descriptions, categories, tags, destinations, or routes into client code.

- [x] **Step 4: Format the archive page**

Run: `pnpm exec prettier --write src/pages/archive/index.astro`

Expected: Astro markup remains content-driven and both tab panels retain their roles and labels.

### Task 4: Implement timeline, voyage, responsive, and motion styling

**Files:**

- Modify: `src/styles/interior.css`

- [x] **Step 1: Replace offset positioning with the three-column course grid**

Implement these layout anchors in the archive section:

```css
.archive-chain__chapter,
.archive-chain__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 92px minmax(0, 1fr);
}

.archive-chain__item:nth-child(odd) .archive-chain__card {
  grid-column: 1;
}

.archive-chain__item:nth-child(even) .archive-chain__card {
  grid-column: 3;
}

.archive-chain__track {
  position: relative;
  grid-column: 2;
  grid-row: 1;
}
```

Set the card minimum height to `232px`. Place the beacon center on the meta row and give both connectors `46px` length.

- [x] **Step 2: Add coordinated whole-card feedback**

Use `.archive-chain__item:hover` and `.archive-chain__card:focus-visible` to produce the approved `3px` lift, top accent line, connector activation, beacon fill, one-time outer ring, and `4px` arrow movement. Keep default nodes static.

- [x] **Step 3: Implement the chapter marker and personal color variant**

The chapter is a `1fr / 92px / 1fr` row with fading side rules. Blog uses `--home-accent`; personal uses `--timeline-personal` and `--timeline-personal-soft`.

- [x] **Step 4: Implement the approved voyage dimensions and opacity layers**

Use these exact responsive values:

```css
.archive-voyage__transition { height: 232px; margin-bottom: -24px; }
.archive-voyage__scene { height: clamp(270px, 29vw, 370px); }
.archive-voyage__image--night.archive-voyage__image--base { opacity: .76; }
.archive-voyage__image--night.archive-voyage__image--focus { opacity: .14; }
.archive-voyage__image--day { opacity: 0; }
html:not([data-theme='dark']) .archive-voyage__image--day.archive-voyage__image--base { opacity: .68; }
html:not([data-theme='dark']) .archive-voyage__image--day.archive-voyage__image--focus { opacity: .16; }
html:not([data-theme='dark']) .archive-voyage__image--night { opacity: 0; }
```

The focus layer uses `clip-path: ellipse(30% 68% at 76% 58%)`. The scene has no border, radius, or card shadow.

- [x] **Step 5: Add the mobile left-axis layout**

At `760px` and below, use a `68px` left rail, place the axis and beacon at `34px`, make every card one column, set transition height to `196px`, and scene height to `360px`. At `580px` and below, keep the existing no-backdrop-filter fallback.

- [x] **Step 6: Add Reduced Motion rules**

Disable archive entry transforms, beacon-ring motion, voyage drift, light drift, and glint animation inside the existing `prefers-reduced-motion: reduce` block while preserving static focus indication.

- [x] **Step 7: Format the stylesheet**

Run: `pnpm exec prettier --write src/styles/interior.css`

Expected: Prettier completes without changing unrelated generated files.

### Task 5: Unify feedback for existing whole-card links

**Files:**

- Modify: `src/styles/home/sections.css`
- Modify: `src/styles/home/responsive.css`
- Modify: `src/styles/interior.css`

- [x] **Step 1: Make homepage section-link feedback visible on the containing panel**

Add parent-state selectors without making information panels clickable:

```css
.home-carousel:has(.home-carousel__section-link:hover),
.home-carousel:has(.home-carousel__section-link:focus-visible) {
  border-color: var(--home-accent-border);
  box-shadow: var(--home-panel-shadow), 0 18px 44px var(--home-glow);
  transform: translateY(-2px);
}
```

Keep the inner project/article slide link as the only moving layer when it is the hovered target. Preserve the focus outline on `.home-carousel__section-link`.

- [x] **Step 2: Complete project and article list focus feedback**

Add explicit `:focus-visible` outlines to `.project-matrix-card__link` and `.article-matrix-card__link`, retain the existing card lift and cover scale, and add one restrained top highlight line. Do not change card routes or markup.

- [x] **Step 3: Remove motion at mobile and Reduced Motion breakpoints**

Extend the existing responsive / Reduced Motion selectors so outer panels and list cards keep border and outline feedback but do not translate or scale.

- [x] **Step 4: Format all three stylesheets**

Run: `pnpm exec prettier --write src/styles/home/sections.css src/styles/home/responsive.css src/styles/interior.css`

Expected: all files format cleanly.

### Task 6: Prove contracts, update the maintenance guide, and finish the task record

**Files:**

- Modify: `docs/design-guide.md`
- Move: `tasks/active/archive-route-log-and-card-feedback.md` to `tasks/archive/archive-route-log-and-card-feedback.md`

- [x] **Step 1: Build and prove the archive contract now passes**

Run: `pnpm run build`

Expected: PASS and optimized day/night archive assets under `dist/_astro/`.

Run: `pnpm run check:site`

Expected: PASS with one voyage ending and both course structures.

- [x] **Step 2: Document the maintained visual boundary**

Add a concise archive section to `docs/design-guide.md` recording the three-column desktop / left-axis mobile structure, the one-instance voyage ending, generated-asset locations, whole-card-link scope, and Reduced Motion requirement.

- [x] **Step 3: Run the complete quality gate**

Run: `node scripts/verify.mjs`

Expected: all nine verification stages pass, Astro reports zero errors, and the production build contains the archive page.

- [x] **Step 4: Run browser verification**

Start `pnpm run preview` and inspect `/archive/` at `1440×1000`, `1024×768`, and `390×844` in light / dark themes. Verify blog / personal tabs, `?view=personal`, hover, Tab focus, arrow keys, Reduced Motion, JavaScript disabled, image failure fallback, console, and horizontal overflow.

- [x] **Step 5: Archive the completed plan**

Move this file to `tasks/archive/archive-route-log-and-card-feedback.md` after all checks pass, preserving its completed checkboxes as the implementation record.

- [x] **Step 6: Commit and push the verified groups**

Create focused commits for assets/component, archive implementation, card feedback, and verification/docs. Push `main` only after `node scripts/verify.mjs` and browser verification pass.
