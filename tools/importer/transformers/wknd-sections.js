/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: WKND homepage section boundaries.
 *
 * Inserts EDS section breaks (<hr>) between the flattened content sections of the
 * WKND homepage template so the imported document is split into authorable sections.
 * Runs in afterTransform ONLY (block parsers run between the hooks and need the
 * original <img>/DOM; section breaks are a final-stage concern).
 *
 * WHY DOM-ANCHOR DRIVEN (not purely payload.template.sections):
 *   The reference workflow describes reading section definitions from
 *   payload.template.sections. For this project the section boundaries live in
 *   migration-work/page-structure.json (NOT in tools/importer/page-templates.json,
 *   whose template carries no `sections` array), and the import script embeds the
 *   template from page-templates.json. A purely payload-driven transformer would
 *   therefore be a no-op here. This transformer prefers payload.template.sections
 *   when present, and otherwise falls back to a built-in WKND section map whose
 *   anchors are all verified against migration-work/cleaned.html.
 *
 * SECTIONS (per migration-work/page-structure.json), in document order:
 *   S1 Hero carousel    — .carousel.cmp-carousel--hero                 (cleaned.html line 165)  [first: no leading break]
 *   S2 Featured teaser  — .teaser.cmp-teaser--featured                 (cleaned.html line 256)
 *   S3 Recent Articles  — 1st .title.cmp-title--underline + cards grid + CTA (cleaned.html line 276)
 *   S4 Next Adventures  — 2nd .title.cmp-title--underline + hero banner (cleaned.html lines 356/364)
 *   S5 Adventures       — h3 heading + cards grid + CTA, inside the 2nd
 *                         main.cmp-layout-container--fixed              (cleaned.html lines 383/386/391)
 *
 * Expected section breaks = sections - 1 = 4 (before S2, S3, S4, S5).
 *
 * DECORATIVE SEPARATORS:
 *   The source body contains two decorative dividers
 *   (div.separator > hr.cmp-separator__horizontal-rule at cleaned.html lines 351 and 460):
 *   one between the Recent Articles group and Next Adventures, and one trailing after
 *   the Adventures group. In EDS these thematic breaks are represented as section
 *   breaks, which this transformer inserts explicitly. They are removed here (scoped to
 *   the page content root) so section breaks are fully deterministic — no double breaks
 *   at S3|S4 and no trailing empty section after S5.
 *
 * No Section Metadata blocks are emitted: no section defines a `style`
 * (page-structure.json sections carry no style token), so expected Section Metadata = 0.
 *
 * NOTE: This project uses an OLDER AEM boilerplate. This transformer relies on no
 * exports from scripts/scripts.js or scripts/aem.js (no moveInstrumentation /
 * fetchPlaceholders / createOptimizedPicture).
 */

const TransformHook = {
  beforeTransform: 'beforeTransform',
  afterTransform: 'afterTransform',
};

/**
 * Resolve the page content root: the <main> that holds the hero carousel.
 * Falls back to the passed-in element when the carousel is absent
 * (e.g. the minor-locale "coming soon" stub variant).
 */
function getContentRoot(element) {
  const carousel = element.querySelector('.carousel.cmp-carousel--hero');
  return (carousel && carousel.closest('main')) || element;
}

/**
 * Build the ordered list of section-start elements.
 * Each entry: { el, style }. Entry index 0 is the first section (no leading break).
 * Prefers payload.template.sections when it provides usable selectors; otherwise
 * uses the built-in WKND homepage anchor map (all verified in cleaned.html).
 */
function getSectionPlan(contentRoot, payload) {
  const templateSections = payload && payload.template && payload.template.sections;
  if (Array.isArray(templateSections) && templateSections.length > 1) {
    const fromTemplate = templateSections
      .map((s) => ({
        el: s && s.selector ? contentRoot.querySelector(s.selector) : null,
        style: s ? s.style : undefined,
      }))
      .filter((entry) => entry.el);
    if (fromTemplate.length > 1) return fromTemplate;
  }

  // Fallback: built-in WKND homepage section anchors (DOM order).
  const plan = [];

  // S1 — Hero carousel (first section; receives no leading break).
  const carousel = contentRoot.querySelector('.carousel.cmp-carousel--hero');
  if (carousel) plan.push({ el: carousel, style: undefined });

  // S2 — Featured article teaser (columns).
  const featured = contentRoot.querySelector('.teaser.cmp-teaser--featured');
  if (featured) plan.push({ el: featured, style: undefined });

  // S3 / S4 — Recent Articles and Next Adventures both start with an underlined
  // title. In document order: [0] = Recent Articles, [1] = Next Adventures.
  const underlinedTitles = contentRoot.querySelectorAll('.title.cmp-title--underline');
  if (underlinedTitles[0]) plan.push({ el: underlinedTitles[0], style: undefined });
  if (underlinedTitles[1]) plan.push({ el: underlinedTitles[1], style: undefined });

  // S5 — Adventures. Starts with the "Where do you want to go?" heading, which is
  // the first child of the second fixed layout container. Anchor on that container
  // via the adventures cards grid (the second .image-list.list) so the break lands
  // before the heading.
  const imageLists = contentRoot.querySelectorAll('.image-list.list');
  const adventuresGrid = imageLists[1];
  if (adventuresGrid) {
    const s5Container = adventuresGrid.closest('main.cmp-layout-container--fixed');
    plan.push({ el: s5Container || adventuresGrid, style: undefined });
  }

  return plan;
}

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.afterTransform) {
    const contentRoot = getContentRoot(element);

    // Remove decorative body separators; section breaks below fully control boundaries.
    // Scoped to contentRoot so the (non-authorable) footer separator is untouched.
    contentRoot
      .querySelectorAll('.separator')
      .forEach((sep) => sep.remove());

    const plan = getSectionPlan(contentRoot, payload);

    // Insert an <hr> section break before every section except the first.
    // Iterate in reverse so earlier insertions never disturb later anchors.
    for (let i = plan.length - 1; i >= 1; i -= 1) {
      const { el, style } = plan[i];
      if (!el || !el.parentNode) continue;

      // Idempotency guard: skip if a section break already precedes this anchor.
      const prev = el.previousElementSibling;
      if (!prev || prev.tagName !== 'HR') {
        const hr = payload.document.createElement('hr');
        el.parentNode.insertBefore(hr, el);
      }

      // Emit a Section Metadata block only when a style is defined (none for WKND).
      if (style) {
        const meta = WebImporter.Blocks.createBlock(payload.document, {
          name: 'Section Metadata',
          cells: { style },
        });
        el.parentNode.insertBefore(meta, el);
      }
    }
  }
}
