/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: cards-teaser
 * Base block: cards
 * Sources:
 *   - https://wknd.site/us/en.html          (homepage "Recent Articles" + adventures image-list grids)
 *   - https://wknd.site/us/en/magazine.html (magazine "All Articles" image-list grid
 *                                            AND "Members Only" secure-teaser grid)
 * Generated: 2026-08-07
 *
 * Block table (from library-description.txt):
 *   Cards block. 2 columns. Row 1 = block name "cards-teaser".
 *   Each subsequent row = one card: cell 1 = image, cell 2 = title (+ description).
 *
 * TWO source shapes are handled (mutually exclusive branches):
 *
 *   A) image-list grid  — `div.image-list.list` containing `ul.cmp-image-list`
 *      with N `li.cmp-image-list__item`. Each item = image link + title link +
 *      description span. This is the ORIGINAL homepage shape and is preserved
 *      byte-for-byte for backward compatibility.
 *
 *   B) secure-teaser grid — the magazine "Members Only" grid is NOT an image-list.
 *      It is a run of sibling `div.teaser.cmp-teaser--list.cmp-teaser--secure`
 *      cards with NO shared wrapper (they sit directly under the page grid next to
 *      unrelated content). Each secure teaser = cmp-teaser__title (h2) +
 *      cmp-teaser__description + cmp-teaser__image. To render them as ONE 2-card
 *      cards grid, the FIRST secure teaser in a contiguous run acts as the "leader":
 *      it absorbs its following secure-teaser siblings into a single block (one row
 *      per card) and removes the absorbed siblings from the DOM. Non-leader teasers
 *      bail (they are removed by the leader; in the real import loop they are then
 *      skipped by the `!parentNode` guard). The non-functional "Read More" action
 *      text (no href) is intentionally dropped — it is placeholder text, not a CTA.
 *
 * Image src/alt preserved as-is (empty alt on secure teasers is kept as empty alt).
 */
export default function parse(element, { document }) {
  // Detached already (e.g. a follower absorbed by an earlier leader). Bail safely.
  if (!element || !element.parentNode) return;

  const isSecure = (el) => !!el && el.nodeType === 1 && typeof el.matches === 'function'
    && el.matches('.teaser.cmp-teaser--secure, .cmp-teaser--secure');

  // -------------------------------------------------------------------------
  // Branch B: secure-teaser grid (sibling-run absorption).
  // -------------------------------------------------------------------------
  if (isSecure(element)) {
    // Only the FIRST teaser in a contiguous run builds the block. If the previous
    // element sibling is also a secure teaser, this element is a follower — bail.
    if (isSecure(element.previousElementSibling)) return;

    // Gather the contiguous run of secure teasers (leader + following siblings).
    const run = [element];
    let sib = element.nextElementSibling;
    while (isSecure(sib)) {
      run.push(sib);
      sib = sib.nextElementSibling;
    }

    const cells = [];
    run.forEach((card) => {
      const image = card.querySelector('.cmp-teaser__image img, img.cmp-image__image, img');
      const title = card.querySelector('.cmp-teaser__title')
        || card.querySelector('h2, h3, h4');
      const description = card.querySelector('.cmp-teaser__description, [class*="teaser__description"]');

      const contentCell = [];
      if (title) contentCell.push(title);
      if (description) contentCell.push(description);

      // Skip an empty card defensively.
      if (!image && contentCell.length === 0) return;

      cells.push([image || '', contentCell.length ? contentCell : '']);
    });

    // Empty-block guard: nothing extracted -> unwrap the leader in place.
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }

    // createBlock moves the extracted nodes into the block table first; only then
    // remove the now-empty follower shells and replace the leader with the block.
    const block = WebImporter.Blocks.createBlock(document, { name: 'cards-teaser', cells });
    run.slice(1).forEach((follower) => follower.remove());
    element.replaceWith(block);
    return;
  }

  // -------------------------------------------------------------------------
  // Branch A: image-list grid (original homepage behavior — unchanged).
  // -------------------------------------------------------------------------
  let items = Array.from(element.querySelectorAll('li.cmp-image-list__item'));
  // Fallback for markup variations.
  if (items.length === 0) {
    items = Array.from(element.querySelectorAll(
      '.cmp-image-list__item, [class*="image-list__item"]',
    ));
  }

  const cells = [];

  items.forEach((item) => {
    // cell 1: image
    const image = item.querySelector('.cmp-image-list__item-image img, img.cmp-image__image, img');

    // cell 2: linked title + description
    const titleLink = item.querySelector('a.cmp-image-list__item-title-link, [class*="title-link"]');
    const titleSpan = item.querySelector('.cmp-image-list__item-title, [class*="item-title"]:not([class*="title-link"])');
    const description = item.querySelector('.cmp-image-list__item-description, [class*="description"]');

    // Build a linked heading: prefer the anchor (preserves the link),
    // fall back to the plain title span, then the raw link.
    const titleNode = titleLink || titleSpan;

    const contentCell = [];
    if (titleNode) contentCell.push(titleNode);
    if (description) contentCell.push(description);

    // Skip empty items defensively.
    if (!image && contentCell.length === 0) return;

    cells.push([image || '', contentCell.length ? contentCell : '']);
  });

  // Empty-block guard: nothing extracted -> unwrap.
  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-teaser', cells });
  element.replaceWith(block);
}
