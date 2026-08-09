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

  // Wire the search icon: clicking it expands an inline input that submits to
  // the current locale's /search results page (e.g. /us/en/search?q=...). The
  // icon toggles the input open/closed; the input submits on Enter.
  nav.querySelectorAll('a[href$="/search"], a[href="/search"]').forEach((a) => {
    const tools = a.closest('.nav-tools') || a.parentElement;
    // derive the locale root from the page path: /us/en/... -> /us/en
    const parts = window.location.pathname.split('/').filter(Boolean);
    const localeRoot = parts.length >= 2 ? `/${parts[0]}/${parts[1]}` : '';
    const searchPage = `${localeRoot}/search`;

    const box = document.createElement('form');
    box.className = 'nav-search';
    box.setAttribute('role', 'search');
    box.action = searchPage;
    box.method = 'get';
    box.hidden = true;
    const field = document.createElement('input');
    field.className = 'nav-search-input';
    field.type = 'search';
    field.name = 'q';
    field.placeholder = 'Search';
    field.setAttribute('aria-label', 'Search');
    box.append(field);
    tools.append(box);

    a.removeAttribute('href');
    a.setAttribute('role', 'button');
    a.setAttribute('aria-label', 'Search');
    a.setAttribute('aria-expanded', 'false');
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const open = a.getAttribute('aria-expanded') === 'true';
      a.setAttribute('aria-expanded', open ? 'false' : 'true');
      box.hidden = open;
      if (!open) field.focus();
    });
    // close on Escape
    field.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        box.hidden = true;
        a.setAttribute('aria-expanded', 'false');
        a.focus();
      }
    });
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
