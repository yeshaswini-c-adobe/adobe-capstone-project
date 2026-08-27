import { loadCSS } from '../../scripts/aem.js';
import decorateCardsProfile from '../cards-profile/cards-profile.js';

/*
 * Profiles (WKND) block.
 *
 * Sheet-driven profile groups (About Us): reads a hand-authored DA data sheet
 * (e.g. /us/en/about-us/query-index.json) with columns
 * name | role | image | group, splits rows by `group`, and renders one
 * cards-profile grid per group (each preceded by the group heading). Delegates
 * card rendering — image + name (h3) + role + social row — to the cards-profile
 * block, so styling and behaviour are fully reused. Authors manage people in
 * the sheet; the `group` value decides which section they appear under.
 */

/**
 * Fetches the data sheet by URL/path (per-minute cache-buster).
 * @param {string} src A `.json` URL or site-absolute path
 * @returns {Promise<Array>} sheet rows, or [] on failure
 */
function loadSheet(src) {
  const path = src.startsWith('http') ? new URL(src).pathname : src;
  const url = `${window.hlx.codeBasePath}${path}?ts=${Math.floor(Date.now() / 60000)}`;
  return fetch(url)
    .then((resp) => (resp.ok ? resp.json() : { data: [] }))
    .then((json) => (Array.isArray(json.data) ? json.data : []))
    .catch(() => []);
}

/**
 * Builds a cards-profile grid element for a set of people, then decorates it.
 * Each person becomes a row: [ <picture> ] [ <h3>name</h3> role ].
 * @param {Array} people rows with name/role/image
 * @returns {HTMLElement} a decorated cards-profile block
 */
function buildProfileGrid(people) {
  const grid = document.createElement('div');
  grid.className = 'cards-profile';
  people.forEach((p) => {
    const row = document.createElement('div');
    const imgCell = document.createElement('div');
    if (p.image) {
      const picture = document.createElement('picture');
      const img = document.createElement('img');
      img.src = p.image;
      img.alt = p.name || '';
      img.loading = 'lazy';
      picture.append(img);
      imgCell.append(picture);
    }
    const bodyCell = document.createElement('div');
    const h3 = document.createElement('h3');
    h3.textContent = p.name || '';
    bodyCell.append(h3);
    if (p.role) {
      const h5 = document.createElement('h5');
      h5.textContent = p.role;
      bodyCell.append(h5);
    }
    row.append(imgCell, bodyCell);
    grid.append(row);
  });
  decorateCardsProfile(grid);
  return grid;
}

/**
 * loads and decorates the sheet-driven profile groups
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  // reuse cards-profile styling (EDS only auto-loads this block's own CSS)
  loadCSS(`${window.hlx.codeBasePath}/blocks/cards-profile/cards-profile.css`);

  // config: single cell / `source` key with the sheet URL
  let source = '';
  [...block.children].forEach((r) => {
    const cells = [...r.children];
    if (cells.length >= 2 && cells[0].textContent.trim().toLowerCase() === 'source') source = cells[1].textContent.trim();
    else if (cells.length === 1 && !source) source = cells[0].textContent.trim();
  });

  block.textContent = '';

  // Placeholder: reserved-space skeleton profile cards while the sheet loads.
  const skeleton = document.createElement('div');
  skeleton.className = 'profiles-wknd-skeleton';
  skeleton.setAttribute('aria-hidden', 'true');
  skeleton.innerHTML = '<span></span><span></span><span></span>';
  block.append(skeleton);

  const rows = await loadSheet(source);
  skeleton.remove();
  if (!rows.length) {
    const empty = document.createElement('p');
    empty.className = 'profiles-wknd-empty';
    empty.textContent = 'No profiles found.';
    block.append(empty);
    return;
  }

  // split by group, preserving first-seen order; capture each group's intro
  // (first non-empty `intro` seen for the group) to show under its heading.
  const groups = [];
  rows.forEach((r) => {
    const g = r.group || 'Team';
    let entry = groups.find((x) => x.name === g);
    if (!entry) { entry = { name: g, intro: '', people: [] }; groups.push(entry); }
    if (!entry.intro && r.intro) entry.intro = r.intro;
    entry.people.push(r);
  });

  groups.forEach((g) => {
    if (groups.length > 1 || g.name) {
      const h = document.createElement('h2');
      h.className = 'profiles-wknd-group-heading';
      h.textContent = g.name;
      block.append(h);
    }
    if (g.intro) {
      const p = document.createElement('p');
      p.className = 'profiles-wknd-group-intro';
      p.textContent = g.intro;
      block.append(p);
    }
    block.append(buildProfileGrid(g.people));
  });
}
