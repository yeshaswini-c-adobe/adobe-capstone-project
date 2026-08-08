/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: columns-featured
 * Base block: columns
 * Source: https://wknd.site/us/en.html (div.teaser.cmp-teaser--featured)
 * Generated: 2026-08-07
 *
 * Block table (from library-description.txt + authoring-analysis):
 *   Columns block. Row 1 = block name "columns-featured".
 *   Row 2 = 2 cells: cell 1 = image, cell 2 = text
 *     (eyebrow paragraph "Featured Article" + heading + description + CTA link).
 *
 * Source structure: a single featured teaser. The content column
 * (`.cmp-teaser__content`) holds the pretitle/eyebrow, title, description and
 * action; the image lives in a sibling `.cmp-teaser__image`. In source the
 * text appears before the image, but the columns layout wants image | text,
 * so we place the image in cell 1. Image src/alt preserved as-is.
 */
export default function parse(element, { document }) {
  // cell 1: image
  const image = element.querySelector('.cmp-teaser__image img, img.cmp-image__image, img');

  // cell 2: eyebrow + heading + description + CTA
  const eyebrow = element.querySelector('.cmp-teaser__pretitle, [class*="pretitle"], [class*="eyebrow"]');
  // Select the title specifically. Do NOT use a [class*="title"] catch-all here:
  // "cmp-teaser__pretitle" contains the substring "title", and querySelector
  // returns the first match in DOCUMENT order (not selector order), so the
  // catch-all would resolve the heading to the pretitle node and drop the real
  // <h2> title. Prefer the exact title class, then fall back to a heading tag.
  const heading = element.querySelector('.cmp-teaser__title')
    || element.querySelector('h1, h2, h3, h4');
  const description = element.querySelector('.cmp-teaser__description, [class*="description"]');
  const ctaLinks = Array.from(element.querySelectorAll(
    '.cmp-teaser__action-link, .cmp-teaser__action-container a',
  ));

  const textCell = [];
  if (eyebrow) textCell.push(eyebrow);
  if (heading) textCell.push(heading);
  if (description) textCell.push(description);
  textCell.push(...ctaLinks);

  // Empty-block guard: no meaningful content -> unwrap.
  if (!image && textCell.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Row 2: image | text. Pad with '' if a side is missing to keep 2 columns.
  const cells = [[image || '', textCell.length ? textCell : '']];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-featured', cells });
  element.replaceWith(block);
}
