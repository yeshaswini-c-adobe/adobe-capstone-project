# Dynamic Rendering (Data-Driven Content)

Most content lists on this site are **data-driven** rather than hand-placed:
blocks fetch a JSON data source and render from it, so the lists stay current
without editing the page markup. There are **two data-source models**:

1. **Auto query-index** — AEM auto-generates `/query-index.json` from published
   pages (per `helix-query.yaml`). Lists auto-update as pages are added/removed.
   Same mechanism the header search uses.
2. **Hand-authored DA sheet** — an author maintains a spreadsheet ("sheet") in
   da.live, served as JSON (`:type: sheet`, no `.xlsx`). Full curation control
   over items/order/grouping; lists do **not** auto-update (author edits a row).

## Where it's used

| # | Location | Model | Source | Block |
|---|----------|-------|--------|-------|
| 1 | **Magazine → All Articles** | sheet | `/us/en/magazine/query-index.json` | `cards-articles-wknd` → `cards-index` |
| 2 | **Homepage → Recent Articles** | sheet | `/us/en/magazine/query-index.json` (`limit 4`) | `cards-articles-wknd` |
| 3 | **Homepage → Where do you want to go?** | sheet | `/us/en/adventures/query-index.json` (`limit 4`) | `cards-articles-wknd` |
| 4 | **Adventures → Current Adventures** (+ category tabs) | sheet | `/us/en/adventures/query-index.json` (`category` col) | `cards-adventures-wknd` → `cards-teaser` |
| 5 | **FAQ → questionnaire accordion** | sheet | `/us/en/faqs/query-index.json` (`question`, `answer`) | `faq-wknd` → `accordion-faq` |
| 6 | **About Us → contributor/guide profiles** | sheet | `/us/en/about-us/query-index.json` (`name`, `role`, `image`, `group`, `intro`) | `profiles-wknd` → `cards-profile` |
| 7 | **Every article → "Share this story" related list** | auto index | `/query-index.json` (same section, exclude self, newest, 4) | `scripts.js` |
| 8 | **Header search** (all pages) | auto index | `/query-index.json` (section-scoped) | `header.js` |

> Homepage grids (2, 3) were originally auto-index (newest 4) and later switched
> to the curated sheets. The related list (7) and search (8) remain auto-index.

## The two source modes in `cards-index`

`cards-index` chooses its source from the authored value:

- **Section prefix** (e.g. `/us/en/adventures`) → fetches the auto
  `/query-index.json`, filters to that section, sorts, excludes the landing
  page. Auto-syncs.
- **Data sheet** (a value ending in `.json`, or a `source` key) → fetches that
  DA sheet directly and renders its rows in authored order. Curated.

Block-table config (all rows optional): `source` (a `.json` sheet) **or**
`prefix`/`path`/`section`; plus `sort` (`title` | `newest`, prefix mode) and
`limit` (max cards). A single cell is shorthand: a `.json` value = sheet, else a
prefix.

## Sheet-driven blocks (thin wrappers)

Each `*-wknd` block is a small wrapper that fetches its sheet and **delegates
rendering to a base block** (reusing its markup, CSS and behaviour — no
duplication):

| Block | Sheet columns | Delegates to |
|-------|---------------|--------------|
| `cards-articles-wknd` | path, title, description, image | `cards-index` (→ `cards-teaser`) |
| `cards-adventures-wknd` | path, title, description, image, **category** | `cards-teaser` + builds category tabs |
| `faq-wknd` | question, answer | `accordion-faq` |
| `profiles-wknd` | name, role, image, group, intro | `cards-profile`, one grid per group |

The base blocks are therefore load-bearing dependencies — see
[`block-reusability-audit.md`](./block-reusability-audit.md).

## DA sheet format

A DA "sheet" is created in the da.live editor as an editable grid with column
headers in row 1 (there is **no `.xlsx`** in Document Authoring). On publish it
is served as JSON in the standard envelope: `{ total, offset, limit, data: [ … ],
":type": "sheet" }`. To edit content, open the sheet in da.live and add/edit
rows — no code change.

## `scripts.js` — article related list (location 7)

`decorateArticleTeasers()` detects the article sidebar's related list and calls
`populateRelatedArticles()`, which refills it from the auto index (same section,
current page excluded, newest, limit 4) — fixing the source's self-linking bug.
The authored list is kept as a fallback if the index can't be loaded.

## Not applied (by design)

- **Article / adventure detail pages** — no card/list grid to convert (hero +
  body + facts + related list only).

## Dates & newest-first (auto-index mode)

`sort=newest` and related-list dates use the index's `lastModified`, populated in
[`helix-query.yaml`](../helix-query.yaml) via
`parseTimestamp(headers["last-modified"], "ddd, DD MMM YYYY hh:mm:ss GMT")`.
Note the **square-bracket** header accessor (`headers[...]`) — the function-call
form `headers(...)` silently returns nothing. `lastModified` is the page's last
**publish** time (UNIX seconds); pages published together share a value, so
`sort=newest` tiebreaks to title order and spreads out as pages are edited
individually. When absent, the code degrades gracefully (date omitted, sort
falls back to title).

## Robustness

The sheet/index fetches use a per-minute cache-buster so author edits surface
promptly past the CDN, and an **empty** result is not cached (a transient
stale-CDN response won't blank a grid).
