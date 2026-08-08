/*
 * Accordion (FAQ) block.
 *
 * Recreates an accordion of expandable question/answer items.
 * https://www.aem.live/developer/block-collection/accordion
 *
 * Adapted from the AEM Block Collection accordion for this project's boilerplate:
 * - Removed the `moveInstrumentation` import (not exported by this project's
 *   scripts.js; only needed for Universal Editor / xwalk projects, this is a DA project).
 * - CSS class names are scoped to the `accordion-faq` variant.
 * - Uses only standard DOM APIs (native <details>/<summary> for accessible,
 *   JS-free toggling; the browser handles expand/collapse and keyboard support).
 *
 * Content model (block table): 2 columns, one row per FAQ item.
 *   cell 1 = question (title/label), cell 2 = answer (rich text).
 */

/**
 * loads and decorates the accordion
 * @param {Element} block The accordion block element
 */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    // decorate accordion item label (question)
    const label = row.children[0];
    const summary = document.createElement('summary');
    summary.className = 'accordion-faq-item-label';
    summary.append(...label.childNodes);
    // decorate accordion item body (answer)
    const body = row.children[1];
    body.className = 'accordion-faq-item-body';
    // decorate accordion item
    const details = document.createElement('details');
    details.className = 'accordion-faq-item';
    details.append(summary, body);
    row.replaceWith(details);
  });
}
