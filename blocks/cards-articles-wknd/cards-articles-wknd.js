import { loadCSS } from '../../scripts/aem.js';
import decorateCardsIndex from '../cards-index/cards-index.js';

/*
 * Cards (Articles WKND) block.
 *
 * A thin, named wrapper around `cards-index` used on the Magazine page's
 * "All Articles" grid. It exists so authors see a meaningful block label
 * ("Cards Articles Wknd") whose single cell points at a hand-authored DA data
 * sheet, e.g. `/us/en/magazine/query-index.json`. All fetching, rendering and
 * styling are delegated to cards-index (which itself reuses cards-teaser), so
 * there is no duplicated logic here.
 */

export default async function decorate(block) {
  // cards-index only auto-loads its own CSS via the block loader when it's the
  // named block; here we're that named block, so pull cards-index.css in too.
  loadCSS(`${window.hlx.codeBasePath}/blocks/cards-index/cards-index.css`);
  await decorateCardsIndex(block);
}
