/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: hero-banner
 * Base block: hero
 * Used by two templates (this one parser serves both):
 *   1. homepage — https://wknd.site/us/en.html
 *      (div.teaser.cmp-teaser--hero.cmp-teaser--imagebottom): image + heading
 *      [+ optional description + optional CTA].
 *      Also the minor-locale coming-soon stub (div.teaser.cmp-teaser--hero —
 *      heading + image only).
 *   2. adventure-detail — https://wknd.site/us/en/adventures/bali-surf-camp.html
 *      (div.carousel.cmp-carousel--mini): a single-slide, full-bleed hero IMAGE
 *      only — NO heading/description/CTA. Verified: emits an image-only block.
 * Generated: 2026-08-07
 *
 * Block table (from library-description.txt + authoring-analysis):
 *   Hero block. 1 column, up to 3 rows. Row 1 = block name "hero-banner".
 *   Row 2 (single cell) = background image (optional).
 *   Row 3 (single cell) = heading + optional description + optional CTA link.
 *
 * ⚠️ 1-column block: each content row is ONE cell. The row-3 cell holds
 * heading + description + CTA together (push as cells.push([contentCell])).
 *
 * Defensive: heading, description and CTA are ALL optional. The coming-soon
 * stub has heading + image only; the mini-carousel hero has image only (no
 * heading/desc/CTA → only the image row is emitted). The row-2 image is also
 * optional. Image src/alt preserved as-is (AEM .coreimg renditions).
 */
export default function parse(element, { document }) {
  // Row 2: background image (optional). Handles both the teaser image
  // (.cmp-teaser__image img) and the mini-carousel hero image, which is an
  // <img class="cmp-image__image"> inside the (active) carousel slide. The
  // generic `img` remains the final catch-all for any other rendition.
  const image = element.querySelector(
    '.cmp-teaser__image img, .cmp-carousel__item--active img.cmp-image__image, .cmp-carousel img.cmp-image__image, img.cmp-image__image, img',
  );

  // Row 3: heading + optional description + optional CTA
  const heading = element.querySelector('.cmp-teaser__title, h1, h2, h3, [class*="title"]');
  const description = element.querySelector('.cmp-teaser__description, [class*="description"]');
  const ctaLinks = Array.from(element.querySelectorAll(
    '.cmp-teaser__action-link, .cmp-teaser__action-container a',
  ));

  const contentCell = [];
  if (heading) contentCell.push(heading);
  if (description) contentCell.push(description);
  contentCell.push(...ctaLinks);

  // Empty-block guard: neither image nor heading/text -> unwrap.
  if (!image && contentCell.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  // Row 2: background image (only add if present).
  if (image) cells.push([image]);
  // Row 3: 1-column content cell (heading + optional description + optional CTA).
  if (contentCell.length) cells.push([contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-banner', cells });
  element.replaceWith(block);
}
