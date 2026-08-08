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
  const copyright = content.querySelector('p:last-child');

  // convert "Follow Us" text links into brand icons
  decorateSocialLinks(heading?.nextElementSibling);

  // group logo, nav and "follow us" into a single horizontal row (top),
  // leaving the copyright blurb as a full-width row below
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
    let el = heading;
    while (el && el !== copyright) {
      const next = el.nextElementSibling;
      social.append(el);
      el = next;
    }
    topRow.append(social);
  }
  content.prepend(topRow);
  if (copyright) copyright.classList.add('footer-copyright');

  await decorateIcons(footer);
  block.append(footer);
}
