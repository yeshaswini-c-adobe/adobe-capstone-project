/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: cards-profile
 * Base block: cards
 * Source: https://wknd.site/us/en/about-us.html
 *         (the "Our Contributors" 4-up grid AND the "WKND Guides" 3-up grid)
 * Generated: 2026-08-07
 *
 * Block table (from library-description.txt — Cards, 2 columns):
 *   Row 1 = block name "cards-profile".
 *   Each subsequent row = one contributor:
 *     cell 1 = image (mandatory) = circular avatar image,
 *     cell 2 = text content = name (Heading) + role (Heading below).
 *   Social links are placeholders and are dropped (no CTA row).
 *
 * Source shape:
 *   Each contributor is a `section.experiencefragment.cmp-experience-fragment--contributor`
 *   containing an avatar image (`.image img`), a name heading (`h3.cmp-title__text`),
 *   a role heading (`h5.cmp-title__text`) and a `buildingblock` of social buttons whose
 *   hrefs are all placeholders ("#facebook-…", "#twitter-…", …). Those non-functional
 *   social links are intentionally DROPPED (not selected into any cell).
 *
 * Grouping:
 *   The contributor sections are SIBLINGS under the page grid with NO shared list
 *   wrapper. The two grids are separated by the "WKND Guides" title + intro text,
 *   so the contributors form TWO contiguous sibling runs (4 sections, then 3).
 *   The FIRST contributor in each contiguous run acts as the "leader": it absorbs
 *   the following contributor siblings in its run into ONE cards-profile block (one
 *   row per contributor) and removes the absorbed siblings. A contributor whose
 *   previous element sibling is also a contributor is a follower and bails (in the
 *   real import loop it is then skipped by the framework's `!parentNode` guard).
 *   This yields exactly TWO separate cards-profile blocks — the 4-up and the 3-up —
 *   rather than one merged grid.
 *
 * Image src/alt preserved as-is (avatars have empty alt; kept as empty alt).
 */
export default function parse(element, { document }) {
  // Detached already (e.g. a follower absorbed by an earlier leader). Bail safely.
  if (!element || !element.parentNode) return;

  const isContributor = (el) => !!el && el.nodeType === 1 && typeof el.matches === 'function'
    && el.matches('.experiencefragment.cmp-experience-fragment--contributor, .cmp-experience-fragment--contributor');

  // Only the FIRST contributor in a contiguous run builds the block. If the
  // previous element sibling is also a contributor, this element is a follower.
  if (isContributor(element.previousElementSibling)) return;

  // Gather the contiguous run of contributor siblings (leader + followers). The
  // run stops at the first non-contributor sibling (e.g. the "WKND Guides" title),
  // which is what keeps the two grids as separate blocks.
  const run = [element];
  let sib = element.nextElementSibling;
  while (isContributor(sib)) {
    run.push(sib);
    sib = sib.nextElementSibling;
  }

  const cells = [];
  run.forEach((card) => {
    // cell 1: avatar image (the only <img> in a card; social icons are <span>s).
    const image = card.querySelector('.image img, img.cmp-image__image, img');

    // cell 2: name + role. Both are `.cmp-title__text` headings in document order
    // (name first, role second). Selecting the headings excludes the social
    // buttons, which are dropped.
    const headings = Array.from(
      card.querySelectorAll('.cmp-title .cmp-title__text, h1, h2, h3, h4, h5, h6'),
    );
    // De-dupe defensively in case of overlapping selector matches.
    const uniqueHeadings = headings.filter((h, i) => headings.indexOf(h) === i);
    const name = uniqueHeadings[0] || null;
    const role = uniqueHeadings[1] || null;

    const contentCell = [];
    if (name) contentCell.push(name);
    if (role) contentCell.push(role);

    // Skip an empty card defensively.
    if (!image && contentCell.length === 0) return;

    cells.push([image || '', contentCell.length ? contentCell : '']);
  });

  // Empty-block guard: nothing extracted -> unwrap the leader in place.
  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // createBlock moves the extracted nodes into the block table first; only then
  // remove the now-empty follower shells and replace the leader with the block.
  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-profile', cells });
  run.slice(1).forEach((follower) => follower.remove());
  element.replaceWith(block);
}
