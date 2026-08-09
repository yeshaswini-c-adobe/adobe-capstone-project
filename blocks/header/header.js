import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

// Country/locale model for the language selector, mirroring the source WKND
// header. Each locale maps its display code to the site path and an emoji flag.
const LOCALE_COUNTRIES = [
  { country: 'United States', flag: '🇺🇸', locales: [{ code: 'EN-US', path: '/us/en' }, { code: 'ES-US', path: '/us/es' }] },
  { country: 'Canada', flag: '🇨🇦', locales: [{ code: 'EN-CA', path: '/ca/en' }, { code: 'FR-CA', path: '/ca/fr' }] },
  { country: 'Switzerland', flag: '🇨🇭', locales: [{ code: 'DE-CH', path: '/ch/de' }, { code: 'FR-CH', path: '/ch/fr' }, { code: 'IT-CH', path: '/ch/it' }] },
  { country: 'Germany', flag: '🇩🇪', locales: [{ code: 'DE-DE', path: '/de/de' }] },
  { country: 'France', flag: '🇫🇷', locales: [{ code: 'FR-FR', path: '/fr/fr' }] },
  { country: 'Spain', flag: '🇪🇸', locales: [{ code: 'ES-ES', path: '/es/es' }] },
  { country: 'Italy', flag: '🇮🇹', locales: [{ code: 'IT-IT', path: '/it/it' }] },
];

/**
 * Finds the locale entry (and its country flag) that matches the current URL
 * path, defaulting to United States / EN-US.
 * @returns {{code:string, path:string, flag:string, current:boolean}}
 */
function currentLocale() {
  const { pathname } = window.location;
  let found = null;
  LOCALE_COUNTRIES.forEach((c) => {
    const match = c.locales.find((l) => pathname === l.path || pathname.startsWith(`${l.path}/`));
    if (match && !found) found = { ...match, flag: c.flag };
  });
  const [firstCountry] = LOCALE_COUNTRIES;
  return found || { ...firstCountry.locales[0], flag: firstCountry.flag };
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
  toggle.innerHTML = `<span class="nav-lang-flag">${active.flag}</span><span class="nav-lang-code">${active.code}</span><span class="nav-lang-caret" aria-hidden="true"></span>`;

  const menu = document.createElement('div');
  menu.className = 'nav-lang-menu';
  menu.hidden = true;
  LOCALE_COUNTRIES.forEach((c) => {
    const group = document.createElement('div');
    group.className = 'nav-lang-group';
    const heading = document.createElement('span');
    heading.className = 'nav-lang-country';
    heading.innerHTML = `<span class="nav-lang-flag">${c.flag}</span>${c.country}`;
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

  // The search icon links to /search, which has no page in this site. Rather
  // than let a business user hit a 404, neutralise it (visual affordance only),
  // matching the original where search never navigates to a broken page.
  nav.querySelectorAll('a[href$="/search"], a[href="/search"]').forEach((a) => {
    a.removeAttribute('href');
    a.setAttribute('role', 'button');
    a.setAttribute('aria-disabled', 'true');
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
