import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Builds the shared cards skeleton: each block row becomes a <li> with its
 * image cell and body cell classified by a block-scoped prefix, and pictures
 * swapped for optimized ones. Card variants (e.g. cards-profile) reuse this and
 * then add their own extras, so the row→list logic lives in one place.
 * @param {Element} block The block element
 * @param {string} prefix Class prefix, e.g. 'cards' or 'cards-profile'
 * @param {number} width Optimized picture width in px
 * @returns {HTMLUListElement} the built list (already placed in the block)
 */
export function buildCardList(block, prefix = 'cards', width = 750) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = `${prefix}-card-image`;
      else div.className = `${prefix}-card-body`;
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: `${width}` }])));
  block.replaceChildren(ul);
  return ul;
}

export default function decorate(block) {
  buildCardList(block, 'cards', 750);
}
