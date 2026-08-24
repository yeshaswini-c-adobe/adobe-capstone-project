# Block Library Governance

How the block library is organised, standardised, versioned, and extended.

## Where the library lives

Blocks are **code** in the GitHub repo under [`/blocks`](../blocks); in a page a
block is just a named table (e.g. a table whose first cell says
`cards-articles-wknd`). The canonical library *is* the `/blocks` folder, and
versioning is Git history + each block's `metadata.json`.

For authors, the **Sidekick Block Library** panel surfaces this library inside
the da.live authoring experience: it lists every approved block and lets authors
preview and insert one without knowing its table markup (see below). da.live
itself still stores only content — the panel is served from the repo's
`tools/sidekick/` and rendered by AEM Sidekick on top of da.live.

## Inventory (17 blocks)

- **Base:** `cards` (shared card skeleton; also `header`, `footer`, `fragment`,
  `widget` are structural/infra).
- **Design variants:** `cards-teaser`, `cards-profile`, `cards-index`,
  `hero-banner`, `columns-featured`, `table-facts`, `accordion-faq`,
  `carousel-hero`.
- **Sheet-driven wrappers (WKND):** `cards-articles-wknd`,
  `cards-adventures-wknd`, `faq-wknd`, `profiles-wknd` — thin wrappers that read
  a DA sheet and delegate to a base block (see
  [dynamic-rendering.md](./post-migration-analysis/dynamic-rendering.md) and
  [block-reusability-audit.md](./post-migration-analysis/block-reusability-audit.md)).

## Naming conventions

- Base → variant: `base` → `base-variant` (e.g. `cards` → `cards-teaser`).
- Sheet-driven wrappers use a `-wknd` suffix.
- A block folder name equals its JS/CSS filenames (EDS requirement):
  `blocks/<name>/<name>.js` + `<name>.css`.
- Block classes scoped to the block (`.<name> .<name>-part`), tokens in
  `styles.css` `:root`.

## Versioning & metadata

- **Every block carries `metadata.json`** with `version` (semver, currently
  `1.0.0`), `baseBlock`, `contentPattern`, and `reuseGuidance`. This is the
  per-block record of lineage and intended use.
- **Version control is Git**: `main` (production) mirrored to the serving branch
  `wknd-design`; history/commits are the change log. No separate release system.

## Add / modify process

1. Branch from `main`.
2. Build the block from a Block Collection base where possible; reuse an
   existing block rather than duplicating (wrappers delegate, they don't copy).
3. Add/update `metadata.json` (bump `version` on behaviour changes).
4. `npm run lint` (JS + CSS) must pass.
5. Verify on the preview URL (and the affected pages).
6. Open a PR; a reviewer checks it; Code Sync deploys on merge.
7. Update the relevant `docs/` entry.

## Approved blocks (Sidekick Library)

The Sidekick Block Library (`tools/sidekick/`) gives authors an in-editor panel
to insert approved blocks. It is registered as a `library` edit-mode plugin in
`tools/sidekick/config.json` (URL `→ /tools/sidekick/library.html`), which loads
the `sidekick-library` component against `/tools/sidekick/library.json`.

`library.json` is a single-sheet `blocks` list of `name` / `path` rows — one per
approved block — and covers **all 13 author-insertable blocks** (the 8 base/design
blocks plus the 4 `-wknd` wrappers, excluding infra blocks `header`, `footer`,
`fragment`, `widget`). Each `path` points at a demo page under
`/tools/sidekick/blocks/<name>` that shows the block's expected table structure
with sample content (variants authored as separate sections). Authors open the
panel, preview a block, and copy it into their page.

For the panel to be visible in da.live, `library.json` and every demo page must
be **previewed/published in Document Authoring** (they are served content, not
just repo code).

> **Note:** authors are **not hard-restricted** to approved blocks — da.live
> lets any block name be typed, and an unknown name renders as plain content.
> The Sidekick Library is *soft* governance (a curated insert menu). A hard
> allow-list is not part of the EDS model.

## SEO & accessibility standards

- **SEO:** every page carries a `metadata` block (title/description/OG),
  `head.html` sets canonical + meta, and `helix-query.yaml` indexes SEO fields.
- **Accessibility:** target WCAG 2.1 AA; blocks use semantic elements, ARIA
  roles/labels, alt text, and keyboard support (native `<details>` for FAQ,
  `role="tablist"` tabs). Lighthouse Accessibility = 100.

## Reuse & duplication

Most-reused: `hero-banner` (6 pages), then `table-facts` / `columns-featured` /
`cards-index` (2 each); `cards-teaser` is reused indirectly by 3 blocks.
Duplication was reduced in the reusability audit (dead blocks removed, card loop
DRY'd into a shared `buildCardList`); new blocks reuse bases rather than
duplicate them.
