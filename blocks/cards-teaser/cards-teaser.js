import { createOptimizedPicture, decorateIcons } from '../../scripts/aem.js';

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  let hasLocked = false;
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    let imageDiv = null;
    let titleHref = null;
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) {
        div.className = 'cards-teaser-card-image';
        imageDiv = div;
      } else {
        div.className = 'cards-teaser-card-body';
        // The card title is either a link (regular article teaser) or a plain
        // heading (a "Members Only" locked card, which has no destination).
        const title = div.querySelector('a') || div.querySelector('h1,h2,h3,h4,h5,h6');
        const locked = !!title && title.tagName !== 'A';
        if (title && title.tagName === 'A') titleHref = title.getAttribute('href');
        if (locked) {
          li.classList.add('cards-teaser-card-locked');
          hasLocked = true;
          title.classList.add('cards-teaser-card-title');
          // prefix the title with a lock badge
          const lock = document.createElement('span');
          lock.className = 'icon icon-lock cards-teaser-card-lock';
          title.prepend(lock);
        }
        // Wrap the trailing description text node(s) in a span so it can be
        // single-line clamped with an ellipsis, matching the WKND card style.
        const desc = document.createElement('span');
        desc.className = 'cards-teaser-card-description';
        let node = title ? title.nextSibling : div.firstChild;
        while (node) {
          const next = node.nextSibling;
          desc.append(node);
          node = next;
        }
        if (desc.textContent.trim()) {
          if (title) title.after(desc);
          else div.append(desc);
        }
        // locked cards get a (non-navigating) "Read More" affordance
        if (locked) {
          const readMore = document.createElement('span');
          readMore.className = 'cards-teaser-card-readmore button';
          readMore.textContent = 'Read More';
          div.append(readMore);
        }
      }
    });
    // Make the whole card image clickable (matching the source, where the image
    // links to the same destination as the title). Locked cards have no href.
    if (imageDiv && titleHref) {
      const picture = imageDiv.querySelector('picture');
      if (picture) {
        const imageLink = document.createElement('a');
        imageLink.className = 'cards-teaser-card-image-link';
        imageLink.href = titleHref;
        imageLink.setAttribute('aria-hidden', 'true');
        imageLink.setAttribute('tabindex', '-1');
        picture.replaceWith(imageLink);
        imageLink.append(picture);
      }
    }
    ul.append(li);
  });
  // Responsive widths: cards are ~full-width on mobile/tablet (need 750) but
  // only ~300px in the 4-up desktop grid, so serve a smaller image ≥900px to
  // avoid over-fetching (desktop was downloading 750px for a 300px slot).
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ media: '(min-width: 900px)', width: '600' }, { width: '750' }])));
  block.replaceChildren(ul);
  if (hasLocked) {
    block.classList.add('cards-teaser-locked');
    decorateIcons(block);
  }
}
