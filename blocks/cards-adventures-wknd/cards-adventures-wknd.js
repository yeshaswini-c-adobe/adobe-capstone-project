import { loadCSS, createOptimizedPicture } from '../../scripts/aem.js';
import decorateCardsTeaser from '../cards-teaser/cards-teaser.js';

/*
 * Cards (Adventures WKND) block.
 *
 * A sheet-driven adventures listing: reads a hand-authored DA data sheet
 * (e.g. /us/en/adventures/query-index.json) with columns
 * path | title | description | image | category, renders every row as a teaser
 * card, and builds a category filter tab bar (All + each distinct category)
 * that shows/hides cards client-side — matching the original Adventures page UX.
 *
 * Reuses cards-teaser for card styling/decoration and the site's existing
 * .adventure-tabs / .adventure-tab styles for the filter bar, so nothing new
 * needs styling. Authors control the cards AND the categories entirely from the
 * sheet — add a row (with a category) and it appears under the right tab.
 */

/**
 * Fetches the data sheet by URL/path, returning rows in authored order.
 * Per-minute cache-buster so author edits surface promptly past the CDN.
 * @param {string} src A `.json` URL or site-absolute path
 * @returns {Promise<Array>} sheet rows, or [] on failure
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
 * Builds one cards-teaser row (image cell + body cell) for a sheet record,
 * tagging the resulting card list item with its category via a data attribute.
 * @param {object} row sheet record (path, title, description, image, category)
 * @returns {HTMLElement} the row element cards-teaser expects
 */
function buildRow(row) {
  const rowEl = document.createElement('div');
  if (row.category) rowEl.dataset.category = row.category;

  const imageCell = document.createElement('div');
  if (row.image) {
    imageCell.append(createOptimizedPicture(row.image, row.title || '', false, [{ media: '(min-width: 900px)', width: '600' }, { width: '750' }]));
  }

  const bodyCell = document.createElement('div');
  const link = document.createElement('a');
  link.href = row.path;
  link.textContent = row.title || row.path;
  bodyCell.append(link);
  if (row.description) bodyCell.append(document.createTextNode(row.description));

  rowEl.append(imageCell, bodyCell);
  return rowEl;
}

/**
 * Builds the category filter tab bar and wires show/hide filtering over the
 * card list items. "All" shows everything; each category shows only its cards.
 * @param {Element} block The block (already decorated into a cards-teaser grid)
 * @param {string[]} categories distinct categories, in first-seen order
 * @param {HTMLLIElement[]} items the card <li>s (carry data-category)
 */
function buildTabs(block, categories, items) {
  const tabs = document.createElement('div');
  tabs.className = 'adventure-tabs';
  tabs.setAttribute('role', 'tablist');

  const labels = ['All', ...categories];
  const buttons = labels.map((label, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'adventure-tab';
    btn.textContent = label;
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    tabs.append(btn);
    return btn;
  });

  const show = (label) => {
    items.forEach((li) => {
      const match = label === 'All' || li.dataset.category === label;
      li.classList.toggle('cards-adventures-hidden', !match);
    });
  };
  buttons.forEach((btn) => btn.addEventListener('click', () => {
    buttons.forEach((b) => b.setAttribute('aria-selected', b === btn ? 'true' : 'false'));
    show(btn.textContent);
  }));

  // insert the tab bar above the grid
  block.prepend(tabs);
}

/**
 * loads and decorates the sheet-driven adventures listing
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  // reuse cards-teaser styling
  loadCSS(`${window.hlx.codeBasePath}/blocks/cards-teaser/cards-teaser.css`);

  // config: single cell / `source` key with the sheet URL
  let source = '';
  [...block.children].forEach((r) => {
    const cells = [...r.children];
    if (cells.length >= 2 && cells[0].textContent.trim().toLowerCase() === 'source') source = cells[1].textContent.trim();
    else if (cells.length === 1 && !source) source = cells[0].textContent.trim();
  });

  block.textContent = '';
  block.classList.add('cards-teaser');

  const rows = await loadSheet(source);
  if (!rows.length) {
    const empty = document.createElement('p');
    empty.className = 'cards-adventures-empty';
    empty.textContent = 'No adventures found.';
    block.append(empty);
    return;
  }

  // build cards + decorate via cards-teaser (row → ul/li, images, links)
  rows.forEach((row) => block.append(buildRow(row)));
  // carry data-category onto the <li> cards-teaser creates: cards-teaser moves
  // each row's children into a new <li>, so tag the row first, then map after.
  const categories = [...new Set(rows.map((r) => r.category).filter(Boolean))];
  decorateCardsTeaser(block);

  // cards-teaser rebuilt rows into <li>s (in order); re-apply category tags
  const items = [...block.querySelectorAll('ul > li')];
  items.forEach((li, i) => { if (rows[i]?.category) li.dataset.category = rows[i].category; });

  if (categories.length > 1) buildTabs(block, categories, items);
}
