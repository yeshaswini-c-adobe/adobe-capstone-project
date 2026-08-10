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
 * Formats a query-index lastModified timestamp (UNIX seconds) as the source's
 * "Weekday, DD Mon YYYY" teaser date. Returns '' when there is no usable date,
 * so the date line is simply omitted rather than showing a bogus value.
 * @param {string|number} lastModified UNIX timestamp in seconds
 * @returns {string} formatted date, or ''
 */
function formatTeaserDate(lastModified) {
  const secs = Number(lastModified);
  if (!secs) return '';
  const d = new Date(secs * 1000);
  if (Number.isNaN(d.getTime())) return '';
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Builds a single related-article <li> (a link with a title line and an
 * optional date line), matching the decorated .related-articles item shape.
 * @param {{path: string, title: string, date: string}} item The teaser data
 * @returns {HTMLLIElement} the list item
 */
function buildTeaserItem({ path, title, date }) {
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = path;
  const titleEl = document.createElement('span');
  titleEl.className = 'teaser-title';
  titleEl.textContent = title;
  a.append(titleEl);
  if (date) {
    const dateEl = document.createElement('span');
    dateEl.className = 'teaser-date';
    dateEl.textContent = date;
    a.append(dateEl);
  }
  li.append(a);
  return li;
}

/**
 * Replaces a related-articles list's items with a dynamic set drawn from the
 * site's query-index.json: other pages in the same section as the current
 * article, newest first (by lastModified, when present), capped at `limit`.
 * The current page is excluded, fixing the source's self-linking lists, and
 * new articles appear automatically as the index rebuilds. The authored list
 * is left untouched if the index can't be loaded or has nothing to show.
 * @param {HTMLUListElement} ul The decorated .related-articles list
 */
async function populateRelatedArticles(ul) {
  const RELATED_LIMIT = 4;
  const here = window.location.pathname.replace(/\.html$/, '');
  // section prefix = /{country}/{lang}/{section}
  const prefix = `/${here.split('/').filter(Boolean).slice(0, 3).join('/')}`;
  try {
    const resp = await fetch(`${window.hlx.codeBasePath}/query-index.json?ts=${Math.floor(Date.now() / 60000)}`);
    if (!resp.ok) return;
    const json = await resp.json();
    const rows = (Array.isArray(json.data) ? json.data : [])
      .filter((r) => r.path && r.path.startsWith(`${prefix}/`) && r.path.replace(/\.html$/, '') !== here)
      .sort((a, b) => ((Number(b.lastModified) || 0) - (Number(a.lastModified) || 0))
        || (a.title || '').localeCompare(b.title || ''))
      .slice(0, RELATED_LIMIT);
    if (!rows.length) return; // keep the authored list as a fallback
    ul.replaceChildren(...rows.map((r) => buildTeaserItem({
      path: r.path,
      title: r.title || r.path,
      date: formatTeaserDate(r.lastModified),
    })));
  } catch (e) {
    // network/parse failure — leave the authored list in place
  }
}

/**
 * Splits the trailing "<Weekday>, DD Mon YYYY" date out of related-article
 * links (the "you may also be interested in" list) into a separate line, so
 * the title and date can be styled independently — matching the original
 * two-line teaser layout. Detection is content-based (a list whose items are
 * links ending in a weekday date) rather than positional, so it works even
 * when other blocks sit between the heading and the list.
 *
 * Once detected, the list is repopulated dynamically from the query index
 * (see populateRelatedArticles) so it stays current and never self-links.
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

    // swap the authored teasers for a live, self-excluding set from the index
    populateRelatedArticles(ul);
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

    // The migrated content precedes the author name with a large portrait photo
    // (an image-only <p>), but the source only shows the author as the small
    // avatar built below. Drop that redundant in-content portrait so it doesn't
    // render as a big image before the byline card.
    const prev = heading.previousElementSibling;
    const isImageOnlyPara = (node) => node
      && (node.tagName === 'P' || node.tagName === 'DIV')
      && node.querySelector(':scope > picture, :scope > img')
      && !node.textContent.trim();
    if (isImageOnlyPara(prev)) prev.remove();

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
  });
}

/**
 * Rebuilds the magazine article into the source's two-column architecture:
 * a continuous article body on the left and a "Share this story" + related
 * sidebar on the right, both starting at the top. The migrated content splits
 * the body across sections and repeats the title as an <h3>; this reassembles
 * one body column and drops the duplicate, restoring structural parity.
 * @param {Element} main The container element
 */
function decorateArticleLayout(main) {
  // article marker: a breadcrumb <ol> of links + a "Share this story" heading
  const breadcrumb = main.querySelector('.default-content-wrapper > ol:has(> li > a)');
  const shareHeading = [...main.querySelectorAll('.default-content-wrapper > h5')]
    .find((h) => /share this story/i.test(h.textContent));
  if (!breadcrumb || !shareHeading) return;

  // a11y: the source authors the byline as an <h4> and the share label as an
  // <h5>, which skip heading levels after the <h1>/section <h2>s. Heading level
  // is invisible to sighted users (size is set in CSS), so normalise for a
  // valid heading order without changing the look: byline -> styled <p>,
  // share label -> <h2> tagged to keep the small-label treatment.
  const h1 = main.querySelector('h1');
  const bylineHeading = h1 && h1.nextElementSibling && h1.nextElementSibling.tagName === 'H4'
    ? h1.nextElementSibling : null;
  if (bylineHeading) {
    const p = document.createElement('p');
    p.className = 'article-byline';
    while (bylineHeading.firstChild) p.append(bylineHeading.firstChild);
    bylineHeading.replaceWith(p);
  }
  const shareH2 = document.createElement('h2');
  shareH2.className = 'article-share-heading';
  if (shareHeading.id) shareH2.id = shareHeading.id;
  while (shareHeading.firstChild) shareH2.append(shareHeading.firstChild);
  shareHeading.replaceWith(shareH2);

  // gather every content node across the article's sections, in document order
  const nodes = [];
  main.querySelectorAll(':scope > .section > .default-content-wrapper').forEach((wrapper) => {
    nodes.push(...wrapper.children);
  });

  const relatedList = shareH2.parentElement.querySelector('ul.related-articles')
    || [...main.querySelectorAll('ul.related-articles')][0];

  // classify: hero image + breadcrumb sit full-width on top; the share heading
  // through the related list form the right sidebar; the rest is the body.
  const shareNodes = [];
  let collecting = false;
  nodes.forEach((n) => {
    if (n === shareH2) collecting = true;
    if (collecting) shareNodes.push(n);
    if (n === relatedList) collecting = false;
  });

  const heroNodes = [];
  const bodyNodes = [];
  nodes.forEach((n) => {
    if (shareNodes.includes(n)) return;
    // drop the duplicate <h3> that repeats the H1 (migration artifact)
    if (n.tagName === 'H3' && h1 && n.textContent.trim() === h1.textContent.trim()) {
      n.remove();
      return;
    }
    const isHeroImg = (n.tagName === 'P' || n.tagName === 'DIV') && n.querySelector(':scope > picture, :scope > img') && !n.textContent.trim();
    const isBareImg = n.tagName === 'PICTURE' || n.tagName === 'IMG';
    if ((isHeroImg || isBareImg) && bodyNodes.length === 0) heroNodes.push(n);
    else if (n === breadcrumb) heroNodes.push(n);
    else bodyNodes.push(n);
  });

  // build: head (hero + breadcrumb) + two-column layout (body | aside)
  const layout = document.createElement('div');
  layout.className = 'article-layout';
  const bodyCol = document.createElement('div');
  bodyCol.className = 'article-main';
  const aside = document.createElement('aside');
  aside.className = 'article-aside';
  bodyNodes.forEach((n) => bodyCol.append(n));
  shareNodes.forEach((n) => aside.append(n));
  layout.append(bodyCol, aside);

  // replace the article's sections with a single wrapper: head then layout
  const host = breadcrumb.closest('.default-content-wrapper');
  const oldSections = [...main.querySelectorAll(':scope > .section')];
  const section = document.createElement('div');
  section.className = 'section article-section';
  const wrapper = document.createElement('div');
  wrapper.className = 'default-content-wrapper';
  heroNodes.forEach((n) => wrapper.append(n));
  wrapper.append(layout);
  section.append(wrapper);
  oldSections[0].replaceWith(section);
  oldSections.slice(1).forEach((s) => s.remove());
  if (host) { /* host consumed */ }
}

/**
 * Rebuilds an adventure-detail page into the source's two-column architecture:
 * a full-width head (breadcrumb + hero + title) followed by a two-column region
 * — left: the facts sheet + "Share this Adventure"; right: a real tab widget
 * (Overview / Itinerary / What to Bring) that switches panels. The migrated
 * content stacks everything flat, with a linkless <ol> of tab labels and three
 * duplicate-title <h3>s that mark the panel boundaries; this regroups them.
 * @param {Element} main The container element
 */
function decorateAdventureDetail(main) {
  const facts = main.querySelector('.table-facts');
  const shareHeading = [...main.querySelectorAll('.default-content-wrapper > h5')]
    .find((h) => /share this adventure/i.test(h.textContent));
  if (!facts || !shareHeading) return;

  // the tab list is the linkless <ol> of labels immediately after the heading
  const wrapper = shareHeading.parentElement;
  const tabList = shareHeading.nextElementSibling;
  if (!tabList || tabList.tagName !== 'OL') return;
  const labels = [...tabList.children].filter((li) => li.tagName === 'LI');
  if (labels.length < 2 || labels.some((li) => li.querySelector('a') || li.children.length)) return;

  // everything after the tab list, split into one panel per divider <h3>. Each
  // panel opens with an identical repeated <h3> (a migration artifact — usually
  // the adventure name); we take the first <h3> after the tab list as the
  // divider text and drop every <h3> matching it. Any *other* <h3> (e.g. a
  // brewery name or a tagline) is genuine content and stays inside its panel.
  const rest = [];
  let n = tabList.nextElementSibling;
  while (n) { rest.push(n); n = n.nextElementSibling; }
  if (!rest.length || rest[0].tagName !== 'H3') return; // must open with a divider
  const dividerText = rest[0].textContent.trim();
  const isDivider = (el) => el.tagName === 'H3' && el.textContent.trim() === dividerText;

  const groups = [];
  let current = null;
  rest.forEach((el) => {
    if (isDivider(el)) {
      current = [];
      groups.push(current); // start a new panel; drop the divider heading itself
    } else if (current) {
      current.push(el);
    }
  });
  if (groups.length !== labels.length) return; // structure mismatch — leave flat

  // build the tab widget: a tablist + one panel per label
  const tabs = document.createElement('div');
  tabs.className = 'adventure-detail-tabs';
  const tablist = document.createElement('div');
  tablist.className = 'adventure-detail-tablist';
  tablist.setAttribute('role', 'tablist');
  const panelsWrap = document.createElement('div');
  panelsWrap.className = 'adventure-detail-panels';

  const buttons = [];
  const panels = [];
  labels.forEach((li, i) => {
    const id = `adv-panel-${i}`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = `${id}-tab`;
    btn.className = 'adventure-detail-tab';
    btn.textContent = li.textContent.trim();
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    btn.setAttribute('aria-controls', id);
    tablist.append(btn);
    buttons.push(btn);

    const panel = document.createElement('div');
    panel.className = 'adventure-detail-panel';
    panel.id = id;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `${id}-tab`);
    if (i !== 0) panel.hidden = true;
    groups[i].forEach((el) => panel.append(el)); // moves nodes out of the wrapper
    panelsWrap.append(panel);
    panels.push(panel);
  });
  tabs.append(tablist, panelsWrap);

  const show = (index) => {
    buttons.forEach((b, i) => b.setAttribute('aria-selected', i === index ? 'true' : 'false'));
    panels.forEach((p, i) => { p.hidden = i !== index; });
  };
  buttons.forEach((btn, i) => btn.addEventListener('click', () => show(i)));

  // assemble two columns: sidebar (facts + share) | body (tab widget)
  const factsWrapper = facts.parentElement;
  const layout = document.createElement('div');
  layout.className = 'adventure-layout';
  const sidebar = document.createElement('div');
  sidebar.className = 'adventure-sidebar';
  const body = document.createElement('div');
  body.className = 'adventure-body';
  sidebar.append(facts, shareHeading); // moves both out of their wrappers
  body.append(tabs);
  layout.append(sidebar, body);

  // mount the layout where the share content was; drop the emptied wrappers.
  // replaceChildren clears the leftover tab list and <h3> dividers too.
  wrapper.replaceChildren(layout);
  if (factsWrapper && factsWrapper !== wrapper && !factsWrapper.children.length) {
    factsWrapper.remove();
  }
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

    // wire each panel with tabpanel semantics + a stable id for aria-controls
    panels.forEach((p, i) => {
      if (!p) return;
      p.id = p.id || `adventure-panel-${i}`;
      p.setAttribute('role', 'tabpanel');
    });

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
      if (panels[i]) {
        btn.id = `adventure-tab-${i}`;
        btn.setAttribute('aria-controls', panels[i].id);
        panels[i].setAttribute('aria-labelledby', btn.id);
      }
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
 * Fixes authored heading-level skips (e.g. an <h1> followed directly by an
 * <h3>) that fail the WCAG "heading levels should only increase by one" rule.
 * WKND authors small labels at deeper levels purely for their visual size; we
 * control size via CSS, so we can raise a skipping heading to the correct level
 * while preserving its original visual size by copying the source level onto a
 * data attribute that CSS keys off. Runs last so it sees the final decorated
 * heading structure. Never promotes above the running level, so genuine
 * nesting (h2 → h3 → h4) is preserved.
 * @param {Element} main The container element
 */
function normalizeHeadingOrder(main) {
  const headings = [...main.querySelectorAll('h1, h2, h3, h4, h5, h6')];
  let prev = 0;
  headings.forEach((h) => {
    const level = Number(h.tagName[1]);
    const target = prev === 0 ? level : Math.min(level, prev + 1);
    if (target !== level) {
      const repl = document.createElement(`h${target}`);
      [...h.attributes].forEach((attr) => repl.setAttribute(attr.name, attr.value));
      // keep the visual size of the original level (CSS: [data-heading-size])
      repl.dataset.headingSize = String(level);
      while (h.firstChild) repl.append(h.firstChild);
      h.replaceWith(repl);
      prev = target;
    } else {
      prev = level;
    }
  });
}

/**
 * Ensures the page has exactly one top-level <h1> for assistive tech and the
 * Lighthouse/axe "page-has-heading-one" check. The WKND home page leads with a
 * hero carousel (no authored H1), so we inject a visually-hidden H1 from the
 * document title — invisible to sighted users, keeping the design unchanged.
 * @param {Element} main The container element
 */
function ensurePageHeading(main) {
  if (main.querySelector('h1')) return;
  const h1 = document.createElement('h1');
  h1.className = 'sr-only';
  const title = (document.title || '').split(/[|–-]/)[0].trim();
  h1.textContent = title || 'WKND';
  const firstSection = main.querySelector('.section') || main;
  firstSection.prepend(h1);
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
  decorateArticleLayout(main);
  decorateAdventureDetail(main);
  decorateAdventureTabs(main);
  normalizeHeadingOrder(main);
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
    // guarantee a single page-level <h1> (scoped to the page main, not the
    // header/footer fragments which run through decorateMain separately)
    ensurePageHeading(main);
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
