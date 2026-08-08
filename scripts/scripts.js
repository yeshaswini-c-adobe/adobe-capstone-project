import {
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  buildBlock,
} from './aem.js';

if (window.trustedTypes && window.trustedTypes.createPolicy) {
  const innerTT = window.trustedTypes.createPolicy('tt-inner', {
    createHTML: (s) => s, // avoid stack overflow
  });

  window.trustedTypes.createPolicy('default', {
    createHTML: (input, type, sink) => {
      let processedInput = input;
      if (/srcdoc\s*=/i.test(processedInput)) {
        const doc = new DOMParser().parseFromString(innerTT.createHTML(processedInput), 'text/html');
        doc.querySelectorAll('iframe[srcdoc]').forEach((el) => el.removeAttribute('srcdoc'));
        processedInput = doc.body.innerHTML;
      }
      if (sink.includes('createContextualFragment') || sink.includes('Document write')) {
        const doc = new DOMParser().parseFromString(innerTT.createHTML(processedInput), 'text/html');
        doc.querySelectorAll('script').forEach((el) => el.remove());
        processedInput = doc.body.innerHTML;
      }
      return processedInput;
    },
    createScriptURL: (input) => input,
    createScript: (input) => input,
  });
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Turns `/widgets/...` links into widget blocks.
 * @param {Element} main The container element
 */
function buildWidgetAutoBlocks(main) {
  const widgetLinks = [...main.querySelectorAll('a[href*="/widgets/"]')];
  widgetLinks.forEach((link) => {
    if (link.closest('.widget')) return;
    const newLink = link.cloneNode(true);
    const widgetBlock = buildBlock('widget', { elems: [newLink] });
    const p = link.closest('p');
    if (
      p
      && p.querySelectorAll('a').length === 1
      && p.querySelector('a') === link
      && p.textContent.trim() === link.textContent.trim()
    ) {
      p.replaceWith(widgetBlock);
    } else {
      link.replaceWith(widgetBlock);
    }
  });
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    // auto load `*/fragments/*` references
    const fragments = [...main.querySelectorAll('a[href*="/fragments/"]')].filter((f) => !f.closest('.fragment'));
    if (fragments.length > 0) {
      // eslint-disable-next-line import/no-cycle
      import('../blocks/fragment/fragment.js').then(({ loadFragment }) => {
        fragments.forEach(async (fragment) => {
          try {
            const { pathname } = new URL(fragment.href);
            const frag = await loadFragment(pathname);
            fragment.parentElement.replaceWith(...frag.children);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Fragment loading failed', error);
          }
        });
      });
    }
    buildWidgetAutoBlocks(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    const strong = a.closest('strong');
    const em = a.closest('em');

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else if (em) {
      a.classList.add('secondary');
      em.replaceWith(a);
    } else {
      // an unformatted link that is the sole content of its paragraph is a
      // WKND call-to-action (View Trips, All Articles, …) → primary button
      a.classList.add('primary');
    }
  });
}

/**
 * Strips the `.html` extension from internal (same-origin) links so that
 * imported content authored with `/path/page.html` links resolves to the
 * extensionless URLs served by Edge Delivery.
 * @param {Element} main The container element
 */
function decorateLinks(main) {
  main.querySelectorAll('a[href]').forEach((a) => {
    let url;
    try {
      url = new URL(a.href, window.location.href);
    } catch {
      return;
    }
    // only rewrite same-origin page links that carry a .html extension
    if (url.origin === window.location.origin && url.pathname.endsWith('.html')) {
      url.pathname = url.pathname.slice(0, -'.html'.length);
      a.setAttribute('href', `${url.pathname}${url.search}${url.hash}`);
    }
  });
}

/**
 * Splits the trailing "<Weekday>, DD Mon YYYY" date out of related-article
 * links (the "you may also be interested in" list) into a separate line, so
 * the title and date can be styled independently — matching the original
 * two-line teaser layout. Detection is content-based (a list whose items are
 * links ending in a weekday date) rather than positional, so it works even
 * when other blocks sit between the heading and the list.
 * @param {Element} main The container element
 */
function decorateArticleTeasers(main) {
  const weekday = /\s+((?:Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day,\s+.+)$/;
  main.querySelectorAll('.default-content-wrapper ul').forEach((ul) => {
    const items = [...ul.children].filter((li) => li.tagName === 'LI');
    if (!items.length) return;
    // every item must be a single plain-text link ending in a weekday date
    const teasers = items.map((li) => {
      const a = li.firstElementChild;
      if (!a || a.tagName !== 'A' || li.children.length !== 1 || a.children.length) return null;
      const match = a.textContent.match(weekday);
      return match ? { a, match } : null;
    });
    if (teasers.some((t) => t === null)) return;

    ul.classList.add('related-articles');
    teasers.forEach(({ a, match }) => {
      const title = a.textContent.slice(0, match.index).trim();
      const date = match[1].trim();
      a.textContent = '';
      const titleEl = document.createElement('span');
      titleEl.className = 'teaser-title';
      titleEl.textContent = title;
      const dateEl = document.createElement('span');
      dateEl.className = 'teaser-date';
      dateEl.textContent = date;
      a.append(titleEl, dateEl);
    });
  });
}

// social networks recognised in the author byline, mapped to their icon name
const BYLINE_SOCIALS = ['facebook', 'twitter', 'instagram'];

/**
 * Converts a name into an avatar file slug, e.g. "Sofia Sjöberg" -> "sofia-sjoberg".
 * @param {string} name The author's display name
 * @returns {string} kebab-case, diacritic-free slug
 */
function authorSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Restructures the author byline that WKND articles end with — an <h2> author
 * name, a role paragraph, and single-link social paragraphs — into a horizontal
 * card: avatar + name/role on the left, social icons in a dark box on the right.
 * Detection is anchored on the run of social-link paragraphs, so it never picks
 * up ordinary body headings.
 * @param {Element} main The container element
 */
function decorateAuthorByline(main) {
  const isSocialPara = (el) => {
    if (!el || el.tagName !== 'P') return null;
    const a = el.firstElementChild;
    if (!a || a.tagName !== 'A' || el.children.length !== 1) return null;
    const key = BYLINE_SOCIALS.find((s) => a.textContent.trim().toLowerCase() === s);
    return key ? { a, key } : null;
  };

  main.querySelectorAll('.default-content-wrapper > h2').forEach((heading) => {
    const role = heading.nextElementSibling;
    if (!role || role.tagName !== 'P' || !role.textContent.trim()) return;

    // collect the consecutive social-link paragraphs that follow the role
    const socials = [];
    let el = role.nextElementSibling;
    while (isSocialPara(el)) {
      socials.push(isSocialPara(el));
      el = el.nextElementSibling;
    }
    if (!socials.length) return; // not an author byline

    // remember the social-link paragraphs so they can be removed once emptied
    const socialParas = socials.map(({ a }) => a.closest('p'));

    // insert the byline container at the heading's position
    const byline = document.createElement('div');
    byline.className = 'author-byline';
    heading.before(byline);

    // left: avatar + name/role
    const avatar = document.createElement('span');
    avatar.className = 'author-byline-avatar';
    const img = document.createElement('img');
    img.src = `${window.hlx.codeBasePath}/icons/authors/${authorSlug(heading.textContent)}.jpg`;
    img.alt = heading.textContent.trim();
    img.loading = 'lazy';
    img.width = 90;
    img.height = 90;
    avatar.append(img);
    const text = document.createElement('div');
    text.className = 'author-byline-text';
    text.append(heading, role); // moves heading + role out of the flow
    const info = document.createElement('div');
    info.className = 'author-byline-info';
    info.append(avatar, text);

    // right: social icons in a dark box
    const social = document.createElement('div');
    social.className = 'author-byline-social';
    socials.forEach(({ a, key }) => {
      if (!a.getAttribute('aria-label')) a.setAttribute('aria-label', a.textContent.trim());
      a.textContent = '';
      const iconSpan = document.createElement('span');
      iconSpan.className = `icon icon-${key}`;
      a.append(iconSpan);
      social.append(a);
    });

    byline.append(info, social);
    socialParas.forEach((p) => p.remove()); // drop the now-empty paragraphs

    // group the byline with the following "Share this story" section into a
    // two-column footer: byline on the left, share + related list on the right
    const footer = document.createElement('div');
    footer.className = 'article-footer';
    byline.replaceWith(footer);
    footer.append(byline);

    let shareHeading = footer.nextElementSibling;
    while (shareHeading && !(shareHeading.tagName === 'H5' && /share this story/i.test(shareHeading.textContent))) {
      shareHeading = shareHeading.nextElementSibling;
    }
    if (shareHeading) {
      // collect from the share heading through the related-articles list
      const nodes = [];
      let n = shareHeading;
      let reachedRelated = false;
      while (n) {
        nodes.push(n);
        if (n.classList && n.classList.contains('related-articles')) { reachedRelated = true; break; }
        n = n.nextElementSibling;
      }
      if (reachedRelated) {
        const share = document.createElement('div');
        share.className = 'article-share';
        nodes.forEach((node) => share.append(node));
        footer.append(share);
      }
    }
  });
}

/**
 * Wires the "Current Adventures" category filter: a tab list (All, Climbing,
 * Cycling, …) followed by the full card grid and one list per category. Builds
 * a styled tab bar and shows a single panel at a time, matching the original.
 *
 * Content shape (per section wrappers):
 *   <h2>Current Adventures</h2><ol> tab labels </ol>   ← first tab = "All"
 *   <div class="cards-teaser"> … </div>                ← the "All" panel
 *   <ul>…</ul> × N                                     ← one per remaining tab
 * @param {Element} main The container element
 */
function decorateAdventureTabs(main) {
  main.querySelectorAll('.default-content-wrapper > ol').forEach((tabList) => {
    // must be a bare list of text labels (no links) directly after a heading
    const labels = [...tabList.children].filter((li) => li.tagName === 'LI');
    if (labels.length < 2 || labels.some((li) => li.querySelector('a') || li.children.length)) return;
    if (!/^all$/i.test(labels[0].textContent.trim())) return; // adventure filter starts with "All"

    const section = tabList.closest('.section');
    if (!section) return;

    // panels, in document order: the cards-teaser grid ("All") + each category <ul>
    const grid = section.querySelector('.cards-teaser');
    const catLists = [...section.querySelectorAll('.default-content-wrapper > ul')];
    const panels = [grid, ...catLists].filter(Boolean);
    if (panels.length < 2) return;

    // build the styled tab bar
    const tabs = document.createElement('div');
    tabs.className = 'adventure-tabs';
    tabs.setAttribute('role', 'tablist');
    const buttons = labels.map((li, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'adventure-tab';
      btn.textContent = li.textContent.trim();
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      tabs.append(btn);
      return btn;
    });

    const show = (index) => {
      buttons.forEach((b, i) => b.setAttribute('aria-selected', i === index ? 'true' : 'false'));
      panels.forEach((p, i) => {
        if (!p) return;
        p.classList.toggle('adventure-panel-hidden', i !== index);
        p.classList.add('adventure-panel');
      });
    };
    buttons.forEach((btn, i) => btn.addEventListener('click', () => show(i)));

    tabList.replaceWith(tabs);
    show(0); // default to "All"
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateButtons(main);
  decorateLinks(main);
  decorateArticleTeasers(main);
  decorateAuthorByline(main);
  decorateAdventureTabs(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  loadHeader(doc.querySelector('body > header'));

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('body > footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  import('./consent-check.js');
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
