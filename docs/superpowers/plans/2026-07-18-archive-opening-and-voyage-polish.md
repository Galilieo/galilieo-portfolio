# Archive Opening and Voyage Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the oversized archive panel opening and circular month badge with a compact route-log header and coordinate plate, then soften the voyage entry and publish final copy without changing image loading or timeline cards.

**Architecture:** Keep the existing Astro archive panels, tab controller, content collections, and `ArchiveVoyage.astro` image sources. Change only server-rendered labels, the focused archive CSS block, generated-output contracts, and the maintenance note; prove the final HTML first, then verify responsive rendering in the production preview.

**Tech Stack:** Astro 7, TypeScript, Astro Assets, native CSS, generated-site Node contracts, Playwright browser verification.

---

### Task 1: Add the failing generated archive contract

**Files:**

- Modify: `scripts/check-site-contracts.mjs:103-118`

- [x] **Step 1: Require the approved coordinate and copy markers**

Add the coordinate class to the existing archive marker loop and assert the three final copy strings:

```js
for (const marker of [
  'data-archive-course',
  'class="archive-chain__chapter"',
  'class="archive-chain__coordinate"',
  'class="archive-chain__track"',
  'class="archive-chain__beacon"',
  'data-archive-voyage',
  'data-archive-voyage-day',
  'data-archive-voyage-night',
  'NEXT COORDINATE',
  '下一程，仍在航行',
  '把走过的路留在这里，新的坐标仍在海面上亮起。',
]) {
  if (!archive.includes(marker)) failures.push(`Archive must render ${marker}.`);
}
```

- [x] **Step 2: Build the current site**

Run: `pnpm.cmd run build`

Expected: PASS and regenerate `dist/archive/index.html` from the current implementation.

- [x] **Step 3: Prove the new contract fails before implementation**

Run: `pnpm.cmd run check:site`

Expected: FAIL for `class="archive-chain__coordinate"`, `NEXT COORDINATE`, and the two new Chinese strings.

### Task 2: Render compact coordinate labels and final voyage copy

**Files:**

- Modify: `src/pages/archive/index.astro:79-88,141-149`
- Modify: `src/components/archive/ArchiveVoyage.astro:52-55`

- [x] **Step 1: Give each blog month an explicit coordinate plate**

Accept the map index and render a compact primary/secondary label:

```astro
{
  Object.entries(grouped).map(([month, entries], monthIndex) => (
    <section class="archive-chain__month">
      <header class="archive-chain__chapter">
        <h3 class="archive-chain__coordinate">
          <strong>{month.replace('-', '.')}</strong>
          <span>LOG {String(monthIndex + 1).padStart(2, '0')}</span>
        </h3>
      </header>
      {/* Preserve the current archive-chain__list block without edits. */}
    </section>
  ))
}
```

- [x] **Step 2: Replace the personal circular chapter label**

Render the approved ongoing coordinate while leaving personal entries unchanged:

```astro
<header class="archive-chain__chapter">
  <h3 class="archive-chain__coordinate">
    <strong>2024 — NOW</strong>
    <span>ONGOING</span>
  </h3>
</header>
```

- [x] **Step 3: Replace implementation copy with final portfolio copy**

Keep all four `<Image>` elements and every `loading="lazy"` attribute unchanged. Replace only the copy block:

```astro
<div class="archive-voyage__copy">
  <p>NEXT COORDINATE</p>
  <h2 id="archive-voyage-title">下一程，仍在航行</h2>
  <span>把走过的路留在这里，新的坐标仍在海面上亮起。</span>
</div>
```

- [x] **Step 4: Format the two Astro files**

Run:

```powershell
.\node_modules\.bin\prettier.cmd --write src/pages/archive/index.astro src/components/archive/ArchiveVoyage.astro
```

Expected: both files format cleanly and the voyage component still contains four `loading="lazy"` attributes.

### Task 3: Implement the compact opening and blended voyage transition

**Files:**

- Modify: `src/styles/interior.css:778-907,1196-1338,2171-2357`

- [x] **Step 1: Compact the active panel heading**

Keep the existing markup but remove the dashboard-scale divider treatment:

```css
.archive-timeline-panel__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  max-width: 1060px;
  margin: 0 auto;
  padding-bottom: 10px;
  border-bottom: 0;
}

.archive-timeline-panel__heading > div {
  display: flex;
  align-items: baseline;
  gap: 14px;
}

.archive-timeline-panel__heading h2 {
  margin: 0;
  font-size: clamp(24px, 2.25vw, 32px);
}

.archive-timeline-panel__heading > span {
  padding-left: 12px;
  border-left: 1px solid var(--interior-border-strong);
}
```

- [x] **Step 2: Replace the circle and crossbars with a coordinate plate**

Remove the current `.archive-chain__chapter::before`, `.archive-chain__chapter::after`, and `.archive-chain__month-title*` presentation. Style the new element in the center lane:

```css
.archive-chain__chapter {
  position: relative;
  z-index: 2;
  min-height: 48px;
  align-items: center;
  margin-bottom: 24px;
}

.archive-chain__coordinate {
  position: relative;
  width: 78px;
  min-height: 46px;
  display: grid;
  grid-column: 2;
  place-items: center;
  align-content: center;
  gap: 3px;
  margin: 0 auto;
  padding: 6px 8px;
  border: 1px solid color-mix(in srgb, var(--archive-course-accent) 38%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--interior-surface-strong) 88%, transparent);
  box-shadow: inset 3px 0 0 color-mix(in srgb, var(--archive-course-accent) 72%, transparent);
  color: var(--archive-course-accent);
  font-family: var(--mono);
  text-align: center;
}

.archive-chain__coordinate strong {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.055em;
}

.archive-chain__coordinate span {
  color: var(--home-text-muted);
  font-size: 6px;
  letter-spacing: 0.13em;
}
```

- [x] **Step 3: Blend the route lights into the voyage scene**

Keep the current scene height, image opacity, crop, and lazy-loading behavior. Increase overlap and use intersecting edge/vertical masks:

```css
.archive-voyage__transition {
  height: 268px;
  margin: 0 auto -84px;
}

.archive-voyage__media {
  mask-image:
    linear-gradient(180deg, transparent 0%, #000 27%, #000 84%, transparent 100%),
    linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%);
  mask-composite: intersect;
  -webkit-mask-image:
    linear-gradient(180deg, transparent 0%, #000 27%, #000 84%, transparent 100%),
    linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%);
  -webkit-mask-composite: source-in;
}

.archive-voyage__copy {
  padding-top: 116px;
}
```

- [x] **Step 4: Preserve the mobile left rail and soften the mobile scene**

At `760px` and below, place the coordinate in the rail and use a shorter overlap:

```css
.archive-chain__chapter {
  grid-template-columns: 68px minmax(0, 1fr);
  margin-left: -68px;
}

.archive-chain__coordinate {
  width: 58px;
  min-height: 44px;
  grid-column: 1;
  grid-row: 1;
  padding-inline: 4px;
}

.archive-voyage__transition {
  height: 220px;
  margin-bottom: -64px;
}

.archive-voyage__media {
  mask-image:
    linear-gradient(180deg, transparent 0%, #000 22%, #000 88%, transparent 100%),
    linear-gradient(90deg, transparent 0%, #000 7%, #000 93%, transparent 100%);
  mask-composite: intersect;
  -webkit-mask-image:
    linear-gradient(180deg, transparent 0%, #000 22%, #000 88%, transparent 100%),
    linear-gradient(90deg, transparent 0%, #000 7%, #000 93%, transparent 100%);
  -webkit-mask-composite: source-in;
}

.archive-voyage__copy {
  padding-top: 96px;
}
```

The existing mobile image `object-position: right center`, `360px` scene height, and zero-overflow full bleed must remain.

- [x] **Step 5: Format the stylesheet**

Run: `.\node_modules\.bin\prettier.cmd --write src/styles/interior.css`

Expected: PASS without modifying generated directories.

### Task 4: Document and verify the finished behavior

**Files:**

- Modify: `docs/design-guide.md:96-98`

- [x] **Step 1: Update the archive maintenance boundary**

Record that the opening uses a compact panel header and axis coordinate plate, and that the voyage scene uses an overlapping edge/vertical fade while preserving lazy loading and the approved assets.

- [x] **Step 2: Prove the generated contract passes**

Run:

```powershell
pnpm.cmd run build
pnpm.cmd run check:site
```

Expected: both PASS and `dist/archive/index.html` contains one voyage, coordinate plates, and the final copy.

- [x] **Step 3: Run the complete quality gate**

Run: `node scripts/verify.mjs`

Expected: all nine stages pass, Astro reports zero diagnostics, and all Node tests pass.

- [x] **Step 4: Run production-preview browser verification**

Start `pnpm.cmd run preview -- --host 127.0.0.1 --port 4322`, then inspect `/archive/` at `1440×1000`, `1024×768`, and `390×844` in both themes. Verify Blog / Personal tabs, coordinate alignment, no rectangular voyage edge, final copy, Reduced Motion, no JavaScript, console, and zero horizontal overflow.

- [x] **Step 5: Commit and push the verified implementation**

Create focused commits:

```powershell
git add scripts/check-site-contracts.mjs src/pages/archive/index.astro src/components/archive/ArchiveVoyage.astro src/styles/interior.css
git commit -m "fix: 打磨归档开场与航行过渡 / polish archive opening and voyage transition"
git add docs/design-guide.md docs/superpowers/plans/2026-07-18-archive-opening-and-voyage-polish.md
git commit -m "docs: 记录归档开场维护边界 / document archive opening boundaries"
git push origin main
```
