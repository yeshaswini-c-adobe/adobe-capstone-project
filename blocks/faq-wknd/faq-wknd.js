import { loadCSS } from '../../scripts/aem.js';
import decorateAccordionFaq from '../accordion-faq/accordion-faq.js';

/*
 * FAQ (WKND) block.
 *
 * Sheet-driven FAQ accordion: reads a hand-authored DA data sheet
 * (e.g. /us/en/faqs/query-index.json) with columns question | answer, builds
 * one 2-cell row per entry, and delegates to the accordion-faq block for the
 * native <details> accordion markup, styling and behaviour. Authors manage the
 * FAQ list in the sheet grid — add a row and it appears.
 */

/**
 * Fetches the data sheet by URL/path (per-minute cache-buster).
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
 * loads and decorates the sheet-driven FAQ accordion
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  // reuse accordion-faq styling (EDS only auto-loads this block's own CSS)
  loadCSS(`${window.hlx.codeBasePath}/blocks/accordion-faq/accordion-faq.css`);

  // config: single cell / `source` key with the sheet URL
  let source = '';
  [...block.children].forEach((r) => {
    const cells = [...r.children];
    if (cells.length >= 2 && cells[0].textContent.trim().toLowerCase() === 'source') source = cells[1].textContent.trim();
    else if (cells.length === 1 && !source) source = cells[0].textContent.trim();
  });

  block.textContent = '';
  block.classList.add('accordion-faq'); // inherit accordion styling

  // Placeholder: reserved-space skeleton rows while the sheet loads.
  const skeleton = document.createElement('div');
  skeleton.className = 'faq-wknd-skeleton';
  skeleton.setAttribute('aria-hidden', 'true');
  skeleton.innerHTML = '<span></span><span></span><span></span><span></span>';
  block.append(skeleton);

  const rows = await loadSheet(source);
  skeleton.remove();
  if (!rows.length) {
    const empty = document.createElement('p');
    empty.className = 'faq-wknd-empty';
    empty.textContent = 'No FAQs found.';
    block.append(empty);
    return;
  }

  // build one question/answer row per entry, then delegate to accordion-faq
  rows.forEach((row) => {
    const rowEl = document.createElement('div');
    const q = document.createElement('div');
    q.textContent = row.question || '';
    const a = document.createElement('div');
    a.textContent = row.answer || '';
    rowEl.append(q, a);
    block.append(rowEl);
  });
  decorateAccordionFaq(block);
}
