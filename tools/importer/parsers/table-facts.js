/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: table-facts
 * Base block: table
 * Source: https://wknd.site/us/en/adventures/bali-surf-camp.html
 *         (div.contentfragment.cmp-contentfragment--elements)
 * Generated: 2026-08-07
 *
 * Block table (from library-description.txt + authoring-analysis):
 *   Table block. 2 columns. Row 1 = block name "table-facts".
 *   Each subsequent row = one fact: cell 1 = label, cell 2 = value.
 *
 * Source structure: an AEM Content Fragment. The fact pairs live in a
 * `<dl class="cmp-contentfragment__elements">` where each fact is a
 * `<div class="cmp-contentfragment__element cmp-contentfragment__element--{key}">`
 * containing a `<dt class="cmp-contentfragment__element-title">` (label) and a
 * `<dd class="cmp-contentfragment__element-value">` (value). The WKND adventure
 * fact sheet has 6 facts (Activity, Adventure Type, Trip Length, Group Size,
 * Difficulty, Price) but we iterate ALL element pairs found — never hardcode 6.
 *
 * Defensive:
 *   - Skip pairs missing a title or a value (or with empty content).
 *   - Preserve value HTML (some values may contain markup).
 *   - If no pairs are found, unwrap the element rather than emit a broken block.
 */
export default function parse(element, { document }) {
  const cells = [];

  // Build one 2-column row (label | value) from a title/value element pair.
  const addRow = (titleEl, valueEl) => {
    if (!titleEl || !valueEl) return; // skip pairs missing a title or value
    const label = titleEl.textContent.trim();
    const valueHtml = valueEl.innerHTML.trim();
    if (!label || !valueHtml) return; // skip pairs with empty content

    // Preserve the value's inner markup (drop the <dd> wrapper) by copying its
    // HTML into a neutral container element used as the cell content.
    const valueCell = document.createElement('div');
    valueCell.innerHTML = valueHtml;

    cells.push([label, valueCell]); // 2 columns: label | value
  };

  // Primary: each fact is a labeled element wrapper.
  const pairEls = Array.from(element.querySelectorAll('.cmp-contentfragment__element'));
  if (pairEls.length > 0) {
    pairEls.forEach((pair) => {
      const titleEl = pair.querySelector('.cmp-contentfragment__element-title, dt');
      const valueEl = pair.querySelector('.cmp-contentfragment__element-value, dd');
      addRow(titleEl, valueEl);
    });
  } else {
    // Fallback: consecutive <dt>/<dd> pairs directly inside a definition list.
    Array.from(element.querySelectorAll('dt')).forEach((dt) => {
      const next = dt.nextElementSibling;
      const valueEl = next && next.tagName && next.tagName.toLowerCase() === 'dd'
        ? next
        : null;
      addRow(dt, valueEl);
    });
  }

  // Empty-block guard: no facts extracted -> unwrap rather than emit a broken block.
  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'table-facts', cells });
  element.replaceWith(block);
}
