import { decorateIcons } from '../../scripts/aem.js';
import { buildCardList } from '../cards/cards.js';

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
  // Reuse the shared cards skeleton (row → li, image/body cells, optimized
  // pictures), then add the profile-specific social-icon row per card.
  const ul = buildCardList(block, 'cards-profile', 400);
  ul.querySelectorAll('.cards-profile-card-body').forEach((body) => {
    const name = body.querySelector('h3')?.textContent.trim();
    body.append(buildSocialRow(name));
  });
  decorateIcons(block);
}
