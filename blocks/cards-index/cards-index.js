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
 * Content model (block table): a single optional cell holding the section path
 * prefix to list, e.g. `/us/en/magazine`. When empty, the block derives the
 * prefix from the current page's path (its own section), so the same block is
 * reusable on any section landing page without configuration.
 */

// cached site index (fetched once, shared across blocks on the page)
let indexPromise = null;

/**
 * Fetches and caches query-index.json.
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
      .catch(() => []);
  }
  return indexPromise;
}

/**
 * Resolves the section prefix to list: an authored value if present, otherwise
 * the current page's own section path (`/{country}/{lang}/{section}`).
 * @param {string} authored The trimmed authored prefix (may be empty)
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
 * Builds one cards-teaser row (image div + body div) for an index record.
 * @param {object} row A query-index record (path, title, description, image)
 * @returns {HTMLElement} the row element cards-teaser expects
 */
function buildRow(row) {
  const rowEl = document.createElement('div');

  // image cell — optimized <picture>; omitted when the row has no image
  const imageCell = document.createElement('div');
  if (row.image) {
    imageCell.append(createOptimizedPicture(row.image, row.title || '', false, [{ width: '750' }]));
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

  // 2. Extract configuration (optional authored path prefix)
  const authored = block.textContent.trim();
  const prefix = resolvePrefix(authored);

  // 3. Load the index and select this section's child pages, excluding the
  //    landing page itself (path === prefix) so it doesn't list itself.
  block.textContent = '';
  block.classList.add('cards-teaser'); // inherit cards-teaser styling
  const rows = (await loadIndex())
    .filter((r) => r.path && r.path.startsWith(`${prefix}/`) && r.path !== prefix)
    .sort((a, b) => (a.title || '').localeCompare(b.title || ''));

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
