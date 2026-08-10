import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

// Country/locale model for the language selector, mirroring the source WKND
// header. Each country maps to its flag icon (icons/flags/<flag>.svg) and its
// locales (display code + site path).
const LOCALE_COUNTRIES = [
  { country: 'United States', flag: 'us', locales: [{ code: 'EN-US', path: '/us/en' }, { code: 'ES-US', path: '/us/es' }] },
  { country: 'Canada', flag: 'ca', locales: [{ code: 'EN-CA', path: '/ca/en' }, { code: 'FR-CA', path: '/ca/fr' }] },
  { country: 'Switzerland', flag: 'ch', locales: [{ code: 'DE-CH', path: '/ch/de' }, { code: 'FR-CH', path: '/ch/fr' }, { code: 'IT-CH', path: '/ch/it' }] },
  { country: 'Germany', flag: 'de', locales: [{ code: 'DE-DE', path: '/de/de' }] },
  { country: 'France', flag: 'fr', locales: [{ code: 'FR-FR', path: '/fr/fr' }] },
  { country: 'Spain', flag: 'es', locales: [{ code: 'ES-ES', path: '/es/es' }] },
  { country: 'Italy', flag: 'it', locales: [{ code: 'IT-IT', path: '/it/it' }] },
];

/**
 * Builds a flag <img> for the given country flag code.
 * @param {string} flag Country flag code (matches icons/flags/<flag>.svg)
 * @param {string} country Country name, used for the alt text
 * @returns {HTMLImageElement}
 */
function flagImg(flag, country) {
  const img = document.createElement('img');
  img.className = 'nav-lang-flag';
  img.src = `${window.hlx.codeBasePath}/icons/flags/${flag}.svg`;
  img.alt = country ? `${country} flag` : '';
  img.width = 20;
  img.height = 20;
  img.loading = 'lazy';
  return img;
}

/**
 * Finds the locale entry (and its country flag) that matches the current URL
 * path, defaulting to United States / EN-US.
 * @returns {{code:string, path:string, flag:string, country:string}}
 */
function currentLocale() {
  const { pathname } = window.location;
  let found = null;
  LOCALE_COUNTRIES.forEach((c) => {
    const match = c.locales.find((l) => pathname === l.path || pathname.startsWith(`${l.path}/`));
    if (match && !found) found = { ...match, flag: c.flag, country: c.country };
  });
  const [c0] = LOCALE_COUNTRIES;
  return found || { ...c0.locales[0], flag: c0.flag, country: c0.country };
}

/**
 * Builds the header top bar: a non-navigating "Sign In" link and a country /
 * language selector whose dropdown lists every locale grouped by country,
 * matching the source WKND header.
 * @returns {HTMLElement} the top-bar element
 */
function buildTopBar() {
  const active = currentLocale();
  const bar = document.createElement('div');
  bar.className = 'nav-topbar';

  const signIn = document.createElement('a');
  signIn.className = 'nav-signin';
  signIn.href = '#sign-in';
  signIn.textContent = 'Sign In';

  const lang = document.createElement('div');
  lang.className = 'nav-lang';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'nav-lang-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-haspopup', 'true');
  toggle.setAttribute('aria-label', `Change region — current: ${active.code}`);
  const code = document.createElement('span');
  code.className = 'nav-lang-code';
  code.textContent = active.code;
  const caret = document.createElement('span');
  caret.className = 'nav-lang-caret';
  caret.setAttribute('aria-hidden', 'true');
  toggle.append(flagImg(active.flag, active.country), code, caret);

  const menu = document.createElement('div');
  menu.className = 'nav-lang-menu';
  menu.hidden = true;
  LOCALE_COUNTRIES.forEach((c) => {
    const group = document.createElement('div');
    group.className = 'nav-lang-group';
    const heading = document.createElement('span');
    heading.className = 'nav-lang-country';
    heading.append(flagImg(c.flag, c.country), document.createTextNode(c.country));
    group.append(heading);
    const codes = document.createElement('div');
    codes.className = 'nav-lang-codes';
    c.locales.forEach((l) => {
      const a = document.createElement('a');
      a.href = l.path;
      a.textContent = l.code;
      if (l.code === active.code) a.setAttribute('aria-current', 'true');
      codes.append(a);
    });
    group.append(codes);
    menu.append(group);
  });

  const closeMenu = () => { toggle.setAttribute('aria-expanded', 'false'); menu.hidden = true; };
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    menu.hidden = open;
  });
  document.addEventListener('click', (e) => { if (!lang.contains(e.target)) closeMenu(); });
  document.addEventListener('keydown', (e) => { if (e.code === 'Escape') closeMenu(); });

  lang.append(toggle, menu);
  bar.append(signIn, lang);
  return bar;
}

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (!nav.contains(e.relatedTarget)) {
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections, false);
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections, false);
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  const isNavDrop = focused.className === 'nav-drop';
  if (isNavDrop && (e.code === 'Enter' || e.code === 'Space')) {
    const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(focused.closest('.nav-sections'));
    focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
  }
}

function focusNavSection() {
  document.activeElement.addEventListener('keydown', openOnKeydown);
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;
  sections.querySelectorAll('.nav-sections .default-content-wrapper > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  toggleAllNavSections(navSections, expanded || isDesktop.matches ? 'false' : 'true');
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  // enable nav dropdown keyboard accessibility
  if (navSections) {
    const navDrops = navSections.querySelectorAll('.nav-drop');
    if (isDesktop.matches) {
      navDrops.forEach((drop) => {
        if (!drop.hasAttribute('tabindex')) {
          drop.setAttribute('tabindex', 0);
          drop.addEventListener('focus', focusNavSection);
        }
      });
    } else {
      navDrops.forEach((drop) => {
        drop.removeAttribute('tabindex');
        drop.removeEventListener('focus', focusNavSection);
      });
    }
  }

  // enable menu collapse on escape keypress
  if (!expanded || isDesktop.matches) {
    // collapse menu on escape press
    window.addEventListener('keydown', closeOnEscape);
    // collapse menu on focus lost
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }
}

// cached site search index (fetched once on first search interaction)
let searchIndexPromise = null;

/**
 * Fetches and caches the site's query-index.json (built by helix-query.yaml).
 * @returns {Promise<Array>} the index rows, or [] on failure
 */
function loadSearchIndex() {
  if (!searchIndexPromise) {
    searchIndexPromise = fetch(`${window.hlx.codeBasePath}/query-index.json`)
      .then((resp) => (resp.ok ? resp.json() : { data: [] }))
      .then((json) => (Array.isArray(json.data) ? json.data : []))
      .catch(() => []);
  }
  return searchIndexPromise;
}

/**
 * Ranks a page against search terms: title matches weigh most, then
 * description, then body content. Returns 0 when any term is absent.
 * @param {object} row A query-index record
 * @param {string[]} terms Lower-cased search terms
 * @returns {number} relevance score
 */
function scoreRow(row, terms) {
  const title = (row.title || '').toLowerCase();
  const desc = (row.description || '').toLowerCase();
  const content = (row.content || '').toLowerCase();
  const has = (t) => title.includes(t) || desc.includes(t) || content.includes(t);
  if (!terms.every(has)) return 0;
  return terms.reduce((s, t) => s
    + (title.includes(t) ? 10 : 0)
    + (desc.includes(t) ? 4 : 0)
    + (content.includes(t) ? 1 : 0), 0);
}

/**
 * Turns the header search icon into an inline live-search control: an input
 * plus a results dropdown that filters the site index as the user types.
 * @param {HTMLAnchorElement} icon The search icon link
 */
function initHeaderSearch(icon) {
  const tools = icon.closest('.nav-tools') || icon.parentElement;

  const panel = document.createElement('div');
  panel.className = 'nav-search';
  panel.hidden = true;
  panel.setAttribute('role', 'search');

  const input = document.createElement('input');
  input.className = 'nav-search-input';
  input.type = 'search';
  input.placeholder = 'Search';
  input.setAttribute('aria-label', 'Search');

  const results = document.createElement('ul');
  results.className = 'nav-search-results';
  results.setAttribute('role', 'listbox');

  panel.append(input, results);
  tools.append(panel);

  icon.removeAttribute('href');
  icon.setAttribute('role', 'button');
  icon.setAttribute('aria-label', 'Search');
  icon.setAttribute('aria-expanded', 'false');

  const close = () => {
    panel.hidden = true;
    icon.setAttribute('aria-expanded', 'false');
  };
  const open = () => {
    panel.hidden = false;
    icon.setAttribute('aria-expanded', 'true');
    input.focus();
  };

  const render = (rows, query) => {
    results.replaceChildren();
    if (!query) return;
    if (!rows.length) {
      const li = document.createElement('li');
      li.className = 'nav-search-empty';
      li.textContent = `No results for "${query}"`;
      results.append(li);
      return;
    }
    rows.slice(0, 8).forEach((row) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      const a = document.createElement('a');
      a.className = 'nav-search-result';
      a.href = row.path;
      a.textContent = row.title || row.path;
      li.append(a);
      results.append(li);
    });
  };

  const runSearch = async () => {
    const query = input.value.trim();
    if (!query) { results.replaceChildren(); return; }
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const index = await loadSearchIndex();
    const matches = index
      .map((row) => ({ row, score: scoreRow(row, terms) }))
      .filter((m) => m.score > 0)
      .sort((x, y) => y.score - x.score)
      .map((m) => m.row);
    render(matches, query);
  };

  icon.addEventListener('click', (e) => {
    e.preventDefault();
    if (panel.hidden) { open(); loadSearchIndex(); } else close();
  });
  input.addEventListener('input', runSearch);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { close(); icon.focus(); }
  });
  // close when focus/click leaves the search control (icon.contains covers the
  // icon's inner <img>/<span>, whose click bubbles up as the real event target)
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !panel.contains(e.target) && !icon.contains(e.target)) close();
  });
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navBrand = nav.querySelector('.nav-brand');
  const brandLink = navBrand.querySelector('.button');
  if (brandLink) {
    brandLink.className = '';
    brandLink.closest('.button-container').className = '';
  }

  // Wire the search icon into an inline live-search dropdown: clicking it opens
  // an input; typing filters the site's query-index.json and shows matching
  // pages in a popover beneath it (no separate results page).
  nav.querySelectorAll('a[href$="/search"], a[href="/search"]').forEach((a) => {
    initHeaderSearch(a);
  });

  // On "Coming Soon" locale stub pages the source shows no top-nav menu (the
  // US-English sections would send locale visitors to the wrong locale). Drop
  // the nav-sections links on those pages, keeping the logo, search and footer.
  const isComingSoon = !!document.querySelector('main #wknd-adventures-and-travel---coming-soon');
  const navSections = nav.querySelector('.nav-sections');
  if (isComingSoon && navSections) {
    navSections.replaceChildren();
  }
  if (navSections && !isComingSoon) {
    navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
      if (navSection.querySelector('ul')) navSection.classList.add('nav-drop');
      navSection.addEventListener('click', () => {
        if (isDesktop.matches) {
          const expanded = navSection.getAttribute('aria-expanded') === 'true';
          toggleAllNavSections(navSections);
          navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        }
      });
    });
  }

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');
  // prevent mobile nav behavior on window resize
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(buildTopBar(), nav);
  block.append(navWrapper);
}
