# Block Library Governance

How the block library is organised, standardised, versioned, and extended.

## Where the library lives

**There is no block-library UI or version indicator inside da.live.** In Edge
Delivery + Document Authoring, da.live holds **content**; blocks are **code** in
the GitHub repo under [`/blocks`](../blocks). In a page, a block is just a named
table (e.g. a table whose first cell says `cards-articles-wknd`) — da.live does
not show what a block does, its variants, or a version. The library *is* the
`/blocks` folder; versioning is Git history + each block's `metadata.json`.

Authors can browse/insert approved blocks via the **Sidekick Block Library**
panel (see below), which is the closest thing to an in-authoring library.

## Inventory (17 blocks)

- **Base:** `cards` (shared card skeleton; also `header`, `footer`, `fragment`,
  `widget` are structural/infra).
- **Design variants:** `cards-teaser`, `cards-profile`, `cards-index`,
  `hero-banner`, `columns-featured`, `table-facts`, `accordion-faq`,
  `carousel-hero`.
- **Sheet-driven wrappers (WKND):** `cards-articles-wknd`,
  `cards-adventures-wknd`, `faq-wknd`, `profiles-wknd` — thin wrappers that read
  a DA sheet and delegate to a base block (see
  [dynamic-rendering.md](./dynamic-rendering.md) and
  [block-reusability-audit.md](./block-reusability-audit.md)).

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
to insert approved blocks. Config: `library.html` + `library.json` (a `blocks`
sheet of name/path rows) + demo pages under `/tools/sidekick/blocks/`, and the
plugin registered in `tools/sidekick/config.json`.

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
