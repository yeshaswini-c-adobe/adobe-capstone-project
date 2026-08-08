import { getMetadata, decorateIcons } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// maps a social link (by href/label/text) to its icon name in /icons
const SOCIAL_ICONS = [
  { match: 'facebook', icon: 'facebook' },
  { match: 'twitter', icon: 'twitter' },
  { match: 'instagram', icon: 'instagram' },
];

/**
 * Replaces the text of each social link with its brand icon, keeping the
 * label available to screen readers.
 * @param {Element} row The paragraph holding the social links
 */
function decorateSocialLinks(row) {
  if (!row || row.tagName !== 'P') return;
  row.classList.add('footer-social-links');
  row.querySelectorAll('a').forEach((a) => {
    const haystack = `${a.href} ${a.title} ${a.textContent}`.toLowerCase();
    const entry = SOCIAL_ICONS.find((s) => haystack.includes(s.match));
    if (!entry) return;
    if (!a.getAttribute('aria-label')) a.setAttribute('aria-label', a.textContent.trim());
    a.textContent = '';
    const iconSpan = document.createElement('span');
    iconSpan.className = `icon icon-${entry.icon}`;
    a.append(iconSpan);
  });
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  const content = footer.querySelector('.default-content-wrapper') || footer;
  const logo = content.querySelector('p:first-child');
  const nav = content.querySelector('nav, ul');
  const heading = [...content.querySelectorAll('h4')].find((h) => /follow us/i.test(h.textContent));
  const socialRow = heading?.nextElementSibling;

  // convert "Follow Us" text links into brand icons
  decorateSocialLinks(socialRow);

  // group logo, nav and "follow us" into a single horizontal row (top),
  // leaving any copyright paragraph(s) as a full-width row below
  const topRow = document.createElement('div');
  topRow.className = 'footer-top';
  if (logo) {
    logo.classList.add('footer-logo');
    topRow.append(logo);
  }
  if (nav) {
    nav.classList.add('footer-nav');
    topRow.append(nav);
  }
  if (heading) {
    const social = document.createElement('div');
    social.className = 'footer-social';
    social.append(heading);
    if (socialRow) social.append(socialRow);
    topRow.append(social);
  }
  content.prepend(topRow);

  // everything left after the top row is copyright / legal content
  const bottom = [...content.children].filter((el) => el !== topRow);
  if (bottom.length) {
    const copyright = document.createElement('div');
    copyright.className = 'footer-copyright';
    bottom.forEach((el) => copyright.append(el));
    content.append(copyright);
  }

  await decorateIcons(footer);
  block.append(footer);
}
