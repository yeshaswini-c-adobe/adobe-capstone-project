import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) {
        div.className = 'cards-teaser-card-image';
      } else {
        div.className = 'cards-teaser-card-body';
        // Wrap the trailing description text node(s) in a span so it can be
        // single-line clamped with an ellipsis, matching the WKND card style.
        const desc = document.createElement('span');
        desc.className = 'cards-teaser-card-description';
        const link = div.querySelector('a');
        let node = link ? link.nextSibling : div.firstChild;
        while (node) {
          const next = node.nextSibling;
          desc.append(node);
          node = next;
        }
        if (desc.textContent.trim()) div.append(desc);
      }
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
  block.replaceChildren(ul);
}
