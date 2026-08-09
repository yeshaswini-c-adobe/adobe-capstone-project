import { createOptimizedPicture, decorateIcons } from '../../scripts/aem.js';

// WKND brand social accounts, mirrored from the footer (the source cards link
// to per-person placeholders, so brand accounts are the sensible stand-in).
const SOCIALS = [
  { key: 'facebook', href: 'https://www.facebook.com/', label: 'Facebook' },
  { key: 'twitter', href: 'https://www.twitter.com/', label: 'Twitter' },
  { key: 'instagram', href: 'https://www.instagram.com/', label: 'Instagram' },
];

/**
 * Builds the boxed social-icon row shown beneath each profile, matching the
 * original About Us cards (dark panel with brand icons).
 * @param {string} name The profile name, used for accessible labels
 * @returns {HTMLElement} the social row element
 */
function buildSocialRow(name) {
  const row = document.createElement('div');
  row.className = 'cards-profile-card-social';
  SOCIALS.forEach(({ key, href, label }) => {
    const a = document.createElement('a');
    a.href = href;
    a.setAttribute('aria-label', name ? `${name} on ${label}` : label);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener');
    const icon = document.createElement('span');
    icon.className = `icon icon-${key}`;
    a.append(icon);
    row.append(a);
  });
  return row;
}

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-profile-card-image';
      else div.className = 'cards-profile-card-body';
    });
    // append the social-icon row to the card body
    const body = li.querySelector('.cards-profile-card-body');
    if (body) {
      const name = body.querySelector('h3')?.textContent.trim();
      body.append(buildSocialRow(name));
    }
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '400' }])));
  block.replaceChildren(ul);
  decorateIcons(block);
}
