/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: carousel-hero
 * Base block: carousel
 * Source: https://wknd.site/us/en.html (div.carousel.cmp-carousel--hero)
 * Generated: 2026-08-07
 *
 * Block table (from library-description.txt):
 *   2 columns. Row 1 = block name "carousel-hero".
 *   Each subsequent row = one slide: cell 1 = image (only),
 *   cell 2 = title (heading) + description + CTA link.
 *
 * Source structure: the carousel contains N slides, each a
 * `.teaser.cmp-teaser--hero` (inside a `.cmp-carousel__item` tabpanel).
 * Extract every slide. Image src/alt are preserved as-is (AEM .coreimg
 * renditions); downstream import handles optimization.
 */
export default function parse(element, { document }) {
  // Each slide is a hero teaser inside a carousel item. Prefer the teaser
  // nodes directly so navigation controls / indicators are excluded.
  let slides = Array.from(element.querySelectorAll('.teaser.cmp-teaser--hero'));
  // Fallback: some renditions nest content directly under carousel items.
  if (slides.length === 0) {
    slides = Array.from(element.querySelectorAll('.cmp-carousel__item'));
  }

  const cells = [];

  slides.forEach((slide) => {
    // cell 1: image only
    const image = slide.querySelector('.cmp-teaser__image img, img.cmp-image__image, img');

    // cell 2: title (heading) + description + CTA link
    const title = slide.querySelector('.cmp-teaser__title, h1, h2, h3, [class*="title"]');
    const description = slide.querySelector('.cmp-teaser__description, [class*="description"]');
    const ctaLinks = Array.from(slide.querySelectorAll(
      '.cmp-teaser__action-link, .cmp-teaser__action-container a',
    ));

    const contentCell = [];
    if (title) contentCell.push(title);
    if (description) contentCell.push(description);
    contentCell.push(...ctaLinks);

    // Skip completely empty slides defensively.
    if (!image && contentCell.length === 0) return;

    cells.push([image || '', contentCell]);
  });

  // Empty-block guard: no slides extracted -> unwrap rather than emit a broken block.
  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-hero', cells });
  element.replaceWith(block);
}
