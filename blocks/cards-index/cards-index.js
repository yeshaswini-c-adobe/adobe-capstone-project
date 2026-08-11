import { createOptimizedPicture, loadCSS } from '../../scripts/aem.js';
import decorateCardsTeaser from '../cards-teaser/cards-teaser.js';

/*
 * Cards (index) block — a dynamic, data-driven teaser grid.
 *
 * Instead of hand-authored cards, this block reads the site's query-index.json
 * (built by helix-query.yaml), filters the rows to a section, and renders a
 * teaser card per page. Add or remove a page in the section and the grid
 * updates automatically once the index rebuilds — no page edit required.
 *
 * It reuses the `cards-teaser` block for all styling and decoration: this block
 * only builds the initial cards-teaser DOM (image + linked title + description
 * per row) and delegates to cards-teaser's decorate().
 *
 * Two data-source modes, chosen by the authored value:
 *   1. DATA SHEET (value ends in `.json`) — fetch that file directly and render
 *      its rows in authored order. Use for hand-curated lists maintained in a
 *      DA sheet, e.g. `/us/en/magazine/query-index.json`. No prefix filter, no
 *      sort/self-exclusion (the sheet author controls order and contents).
 *   2. SECTION PREFIX (a path/section) — fetch the site query-index.json and
 *      filter to pages under that prefix, excluding the landing page itself.
 *
 * Content model (block table). All rows optional:
 *   - a single-cell row with a `.json` URL      → data-sheet mode
 *   - a single-cell row with a path             → section-prefix shorthand
 *   - two-cell key/value rows for options:
 *       | source | /us/en/magazine/query-index.json |  (a .json data sheet)
 *       | prefix | /us/en/magazine |   (alias: path, section)
 *       | sort   | newest |            (prefix mode only; or `title`)
 *       | limit  | 4 |                 (max cards; default all)
 * When neither is given, the block derives a section prefix from the current
 * page's path, so it stays reusable on any section landing page.
 */

// cached site index (fetched once, shared across blocks on the page). Only a
// non-empty result is cached, so a transient empty/stale response is retried by
// the next block rather than poisoning every grid on the page.
let indexPromise = null;

/**
 * Fetches query-index.json, caching only non-empty results.
 * @returns {Promise<Array>} the index rows, or [] on failure
 */
function loadIndex() {
  if (!indexPromise) {
    // Time-bucketed cache-buster (changes each minute): the CDN can still cache
    // the index for up to a minute, but a newly published/removed page shows up
    // promptly instead of waiting on a stale edge copy.
    const bucket = Math.floor(Date.now() / 60000);
    indexPromise = fetch(`${window.hlx.codeBasePath}/query-index.json?ts=${bucket}`)
      .then((resp) => (resp.ok ? resp.json() : { data: [] }))
      .then((json) => (Array.isArray(json.data) ? json.data : []))
      .then((rows) => {
        // don't cache an empty result — let the next block retry the fetch
        if (!rows.length) indexPromise = null;
        return rows;
      })
      .catch(() => {
        indexPromise = null;
        return [];
      });
  }
  return indexPromise;
}

/**
 * Reads the block's config from its table rows. A single value that ends in
 * `.json` is treated as a direct data-sheet source; otherwise it's a section
 * prefix. Two-cell key/value rows set source/prefix/sort/limit explicitly.
 * @param {Element} block The cards-index block element
 * @returns {{ source: string, prefix: string, sort: string, limit: number }}
 */
function readConfig(block) {
  const cfg = {
    source: '', prefix: '', sort: 'title', limit: 0,
  };
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length >= 2) {
      const key = cells[0].textContent.trim().toLowerCase();
      const value = cells[1].textContent.trim();
      if (key === 'source') cfg.source = value;
      else if (['prefix', 'path', 'section'].includes(key)) cfg.prefix = value;
      else if (key === 'sort') cfg.sort = value.toLowerCase();
      else if (key === 'limit') cfg.limit = parseInt(value, 10) || 0;
    } else if (cells.length === 1) {
      // single-cell shorthand: a .json URL is a data sheet, else a prefix
      const value = cells[0].textContent.trim();
      if (/\.json(\?|$)/i.test(value)) { if (!cfg.source) cfg.source = value; } else if (!cfg.prefix) cfg.prefix = value;
    }
  });
  return cfg;
}

/**
 * Fetches a data-sheet JSON by URL (or path), returning its rows in order.
 * Adds a per-minute cache-buster so edits surface promptly past the CDN.
 * @param {string} src A `.json` URL or site-absolute path
 * @returns {Promise<Array>} the sheet rows, or [] on failure
 */
function loadSheet(src) {
  const path = src.startsWith('http') ? new URL(src).pathname : src;
  const url = `${window.hlx.codeBasePath}${path}?ts=${Math.floor(Date.now() / 60000)}`;
  return fetch(url)
    .then((resp) => (resp.ok ? resp.json() : { data: [] }))
    .then((json) => (Array.isArray(json.data) ? json.data : []))
    .catch(() => []);
}

/**
 * Resolves the section prefix to list: an authored value if present, otherwise
 * the current page's own section path (`/{country}/{lang}/{section}`).
 * @param {string} authored The authored prefix (may be empty)
 * @returns {string} the path prefix used to filter index rows
 */
function resolvePrefix(authored) {
  if (authored) {
    try {
      // accept a full URL or a bare path; normalise to a trailing-slash-free path
      const path = authored.startsWith('http') ? new URL(authored).pathname : authored;
      return path.replace(/\/$/, '');
    } catch {
      return authored.replace(/\/$/, '');
    }
  }
  // auto-detect: keep the first three segments (country/lang/section)
  const segments = window.location.pathname.split('/').filter(Boolean);
  return `/${segments.slice(0, 3).join('/')}`;
}

/**
 * Builds the comparator for the requested sort order.
 * @param {string} sort `newest` (by lastModified desc) or `title` (A→Z)
 * @returns {(a: object, b: object) => number} a sort comparator
 */
function comparator(sort) {
  const byTitle = (a, b) => (a.title || '').localeCompare(b.title || '');
  if (sort === 'newest') {
    // lastModified is a UNIX timestamp (seconds) from the index; newest first,
    // falling back to title order (so the grid is still deterministic when the
    // index has no dates yet — true newest-first kicks in once it populates).
    return (a, b) => {
      const byDate = (Number(b.lastModified) || 0) - (Number(a.lastModified) || 0);
      return byDate || byTitle(a, b);
    };
  }
  return byTitle;
}

/**
 * Builds one cards-teaser row (image div + body div) for an index record.
 * @param {object} row A query-index record (path, title, description, image)
 * @returns {HTMLElement} the row element cards-teaser expects
 */
function buildRow(row) {
  const rowEl = document.createElement('div');

  // image cell — optimized <picture>; omitted when the row has no image.
  // Responsive widths match cards-teaser (smaller image in the 4-up desktop
  // grid). NB: cards-teaser.decorate() re-optimizes these too, but keep the
  // breakpoints here so the builder is correct on its own.
  const imageCell = document.createElement('div');
  if (row.image) {
    imageCell.append(createOptimizedPicture(row.image, row.title || '', false, [{ media: '(min-width: 900px)', width: '600' }, { width: '750' }]));
  }

  // body cell — linked title followed by the description text
  const bodyCell = document.createElement('div');
  const link = document.createElement('a');
  link.href = row.path;
  link.textContent = row.title || row.path;
  bodyCell.append(link);
  if (row.description) {
    bodyCell.append(document.createTextNode(row.description));
  }

  rowEl.append(imageCell, bodyCell);
  return rowEl;
}

/**
 * loads and decorates the dynamic cards index
 * @param {Element} block The cards-index block element
 */
export default async function decorate(block) {
  // 1. Load dependencies — reuse cards-teaser's styles (EDS only auto-loads
  //    this block's own CSS, so pull in cards-teaser.css explicitly).
  loadCSS(`${window.hlx.codeBasePath}/blocks/cards-teaser/cards-teaser.css`);

  // 2. Extract configuration from the block table
  const {
    source, prefix: authored, sort, limit,
  } = readConfig(block);

  block.textContent = '';
  block.classList.add('cards-teaser'); // inherit cards-teaser styling

  // 3. Load rows from the chosen source:
  //    - data sheet (source .json): render its rows in authored order as-is
  //    - section prefix: filter the site index and sort, excluding the landing
  let rows;
  if (source) {
    rows = await loadSheet(source);
  } else {
    const prefix = resolvePrefix(authored);
    rows = (await loadIndex())
      .filter((r) => r.path && r.path.startsWith(`${prefix}/`) && r.path !== prefix)
      .sort(comparator(sort));
  }
  if (limit > 0) rows = rows.slice(0, limit);

  // 4. Empty state — nothing indexed under this prefix yet
  if (!rows.length) {
    const empty = document.createElement('p');
    empty.className = 'cards-index-empty';
    empty.textContent = 'No articles found.';
    block.append(empty);
    return;
  }

  // 5. Build the cards-teaser DOM and delegate decoration (styling reuse)
  rows.forEach((row) => block.append(buildRow(row)));
  decorateCardsTeaser(block);
}
