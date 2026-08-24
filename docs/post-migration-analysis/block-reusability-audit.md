# Block Reusability Audit

A review of the project's blocks against reusability best practices: existing
library usage, reusable-over-custom, consolidated patterns, no duplicate blocks,
and configuration over code duplication.

Context: the migration assessment (§07) reported 225 source block instances
rolled up into 31 variants across 10 base types (87% reuse). That describes the
**source site**; what shipped in this repo is a lean block set summarised below.

## Blocks shipped

| Block | Base (per metadata) | Used in content | Notes |
|-------|---------------------|-----------------|-------|
| `hero-banner` | hero | 10 pages | Adventure/section hero |
| `table-facts` | table | 3 pages | Adventure fact sheet (label/value) |
| `cards-index` | cards-teaser | 3 pages | **Dynamic** grid from query-index |
| `cards-teaser` | cards | 2 pages | Teaser card grid |
| `cards-profile` | cards | 2 pages (About Us) | Profile cards + social row |
| `columns-featured` | columns | 2 pages | Featured split layout |
| `carousel-hero` | carousel | 1 page | Homepage hero carousel |
| `accordion-faq` | accordion | 1 page | FAQ accordion (native `<details>`) |
| `header`, `footer`, `fragment`, `widget` | — | global/infra | Nav, fragments, widget loader |
| `cards` | — | 0 (shared code) | Base card skeleton reused by variants |

## Findings

### ✅ Strengths
- **Library-based:** every block derives from an AEM Block Collection base
  (recorded in each block's `metadata.json` `baseBlock`).
- **Reusable over custom:** the assessment's "unknown — custom heading/image/CTA"
  compositions were absorbed into `hero-banner` / `columns-featured` / default
  content — **no bespoke one-off blocks** were created for them.
- **Config over duplication:** `table-facts`, `cards-index` (prefix/sort/limit),
  and the adventure/article layouts are content-structure driven — new pages
  need no code (see [dynamic-rendering.md](./dynamic-rendering.md)).
- **No functional duplicates:** the `cards-*` family are genuine variants, not
  redundant copies of the same behaviour.

### 🔧 Cleanups applied (this audit)
- **Dead base blocks removed:** `columns`, `table`, and `hero` had **0 content
  instances** across all pages and were imported by nothing — deleted. Their
  variants (`columns-featured`, `table-facts`, `hero-banner`) are the ones used.
- **Card row-mapping consolidated (DRY):** the base `cards` block now exports a
  shared `buildCardList(block, prefix, width)` helper. `cards-profile` reuses it
  (then appends its social row) instead of re-implementing the row→`<ul>/<li>`
  loop. `cards-index` already reused `cards-teaser`. So `cards` is kept —
  intentionally — as the shared implementation rather than dead code.

### Deliberately left as-is
- **`cards-teaser`** keeps its own loop: it interleaves locked-card handling,
  description-span wrapping, and clickable image links inside the row loop, so
  forcing it through the shared helper would add risk for little gain. Flagged
  here as a possible future refactor if that logic simplifies.

## Block dependency chains — do NOT delete base blocks

The sheet-driven blocks are **thin wrappers** that reuse a base block for all
rendering/styling (import its `decorate`, add its class, load its CSS). The base
blocks are therefore load-bearing dependencies, not dead code — deleting one
breaks its wrapper. Current chains:

| Wrapper (sheet-driven) | depends on | which depends on |
|------------------------|-----------|------------------|
| `cards-articles-wknd`  | `cards-index` | `cards-teaser` |
| `cards-adventures-wknd`| `cards-teaser` | — |
| `faq-wknd`             | `accordion-faq` | — |
| `profiles-wknd`        | `cards-profile` | `cards` |

Also still used directly in content: `cards-index` (homepage grids),
`cards-teaser` (magazine featured), `carousel-hero`, `hero-banner`,
`columns-featured`, `table-facts`, `header`, `footer`, `fragment`, and `widget`
(auto-blocked in scripts.js). **Every block in `blocks/` is either used on a
live page or imported by a block that is** — there is no remaining dead block to
remove (the only dead blocks, `columns`/`table`/`hero`, were already deleted).

## Verdict
The block set is well-consolidated: no custom blocks that should be library
blocks, no duplicate blocks for the same job, and configuration is used instead
of per-page code. The two cleanups above remove dead code and the one real
instance of copy-pasted logic. New sheet-driven blocks reuse existing bases
rather than duplicating them.
