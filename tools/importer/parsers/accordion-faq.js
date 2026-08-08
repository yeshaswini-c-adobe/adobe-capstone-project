/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: accordion-faq
 * Base block: accordion
 * Source: https://wknd.site/us/en/faqs.html
 *         (the WKND FAQ AEM Accordion component)
 * Generated: 2026-08-07
 *
 * Block table (from library-description.txt — Accordion, 2 columns):
 *   Row 1 = block name "accordion-faq".
 *   Each subsequent row = one FAQ item (2 cells):
 *     cell 1 = Title cell (mandatory) = the QUESTION (plain text / label).
 *     cell 2 = Content cell (mandatory) = the ANSWER rich text (paragraphs,
 *              inline <b>) that is revealed when the item is expanded.
 *
 * Source shape (validated against migration-work/block-context/accordion-faq/source.html):
 *   div.accordion.panelcontainer > div.cmp-accordion
 *     div.cmp-accordion__item  (7 of them; count is NOT hardcoded — all are iterated)
 *       h3.cmp-accordion__header > button.cmp-accordion__button
 *         > span.cmp-accordion__title   => the QUESTION text
 *       div.cmp-accordion__panel
 *         > div.container.responsivegrid > div.cmp-container
 *           > div.text > div.cmp-text
 *             > <p> ... </p>            => the ANSWER rich text
 *             > [stray empty <h3>&nbsp;</h3> in one item — dropped]
 *
 * Defensive handling:
 *   - Iterates ALL div.cmp-accordion__item (works whether `element` is the outer
 *     .accordion.panelcontainer wrapper or the inner .cmp-accordion).
 *   - Skips any item missing a question OR an answer.
 *   - Answer cell = the meaningful children of the panel's .cmp-text rich text
 *     (falls back to the panel's rich-text descendants if no .cmp-text is present).
 *     Empty / stray nodes (e.g. <h3>&nbsp;</h3>) are dropped; only nodes with real
 *     text or embedded media (img/picture/video/iframe/link) are kept.
 *   - If no items are found at all, unwraps the element in place.
 *
 * NO Dynamic Media / Scene7. OLDER AEM boilerplate: does NOT import or use
 * moveInstrumentation / fetchPlaceholders / createOptimizedPicture.
 */
export default function parse(element, { document }) {
  if (!element) return;

  // A rich-text node is worth keeping if it has real text content or embeds media.
  // trim() removes the no-break space ( ), so stray "<h3>&nbsp;</h3>" nodes
  // collapse to empty text and are dropped here.
  const isMeaningful = (node) => {
    if (!node || node.nodeType !== 1) return false;
    const hasText = !!node.textContent && node.textContent.trim() !== '';
    const hasMedia = typeof node.querySelector === 'function'
      && !!node.querySelector('img, picture, video, iframe, a[href]');
    return hasText || hasMedia;
  };

  const items = Array.from(element.querySelectorAll('.cmp-accordion__item'));

  const cells = [];
  items.forEach((item) => {
    // --- cell 1: question -------------------------------------------------
    const titleEl = item.querySelector(
      '.cmp-accordion__title, .cmp-accordion__header button, .cmp-accordion__header',
    );
    const question = titleEl && titleEl.textContent ? titleEl.textContent.trim() : '';

    // --- cell 2: answer rich text ----------------------------------------
    const panel = item.querySelector('.cmp-accordion__panel');
    const answerNodes = [];
    if (panel) {
      const textContainers = Array.from(panel.querySelectorAll('.cmp-text'));
      const rawNodes = [];
      if (textContainers.length) {
        // Preferred: the direct children of each rich-text component.
        textContainers.forEach((tc) => rawNodes.push(...Array.from(tc.children)));
      } else {
        // Fallback (cross-page resilience): pull rich-text elements from the panel.
        rawNodes.push(
          ...Array.from(panel.querySelectorAll(
            'p, ul, ol, h1, h2, h3, h4, h5, h6, blockquote, pre, table, img, picture',
          )),
        );
      }
      rawNodes.forEach((n) => {
        if (isMeaningful(n)) answerNodes.push(n);
      });
    }

    // Skip items missing a question or an answer.
    if (!question || answerNodes.length === 0) return;

    cells.push([question, answerNodes]);
  });

  // Empty-block guard: no valid FAQ items — unwrap in place.
  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion-faq', cells });
  element.replaceWith(block);
}
