/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import carouselHeroParser from './parsers/carousel-hero.js';
import columnsFeaturedParser from './parsers/columns-featured.js';
import cardsTeaserParser from './parsers/cards-teaser.js';
import heroBannerParser from './parsers/hero-banner.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/wknd-cleanup.js';
import sectionsTransformer from './transformers/wknd-sections.js';

// PARSER REGISTRY - map block variant name to parser function
const parsers = {
  'carousel-hero': carouselHeroParser,
  'columns-featured': columnsFeaturedParser,
  'cards-teaser': cardsTeaserParser,
  'hero-banner': heroBannerParser,
};

// TRANSFORMER REGISTRY - run cleanup first, then section boundaries
const transformers = [
  cleanupTransformer,
  sectionsTransformer,
];

// PAGE TEMPLATE CONFIGURATION - embedded from page-templates.json (homepage template)
const PAGE_TEMPLATE = {
  name: 'homepage',
  description: "Locale landing page with full-width hero image, headline, and a grid of featured teasers linking into adventures and magazine content. Full variant (us/en, ca/en) has a hero carousel, featured-article teaser, recent-articles cards grid, adventure teaser, and adventures cards grid. Minor locales are 'coming soon' stubs with a single hero teaser (heading + image).",
  urls: [
    'https://wknd.site/us/en.html',
    'https://wknd.site/ca/en.html',
    'https://wknd.site/ca/fr.html',
    'https://wknd.site/ch/de.html',
    'https://wknd.site/ch/fr.html',
    'https://wknd.site/ch/it.html',
    'https://wknd.site/de/de.html',
    'https://wknd.site/es/es.html',
    'https://wknd.site/fr/fr.html',
    'https://wknd.site/it/it.html',
    'https://wknd.site/us/es.html',
  ],
  blocks: [
    {
      name: 'carousel-hero',
      instances: [
        'div.carousel.cmp-carousel--hero',
        '.carousel.panelcontainer.cmp-carousel--hero',
      ],
    },
    {
      name: 'columns-featured',
      instances: [
        'div.teaser.cmp-teaser--featured',
        '.teaser.cmp-teaser--featured',
      ],
    },
    {
      name: 'cards-teaser',
      instances: [
        'div.image-list.list',
        '.image-list.list',
      ],
    },
    {
      name: 'hero-banner',
      instances: [
        'div.teaser.cmp-teaser--hero.cmp-teaser--imagebottom',
        'main.container.responsivegrid > div.cmp-container > div.teaser.cmp-teaser--hero',
      ],
    },
  ],
};

/**
 * Execute all page transformers for a specific hook.
 * @param {string} hookName - 'beforeTransform' or 'afterTransform'
 * @param {Element} element - DOM element to transform (document.body)
 * @param {Object} payload - { document, url, html, params }
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE,
  };

  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration.
 * De-duplicates elements matched by more than one selector so a block is only
 * parsed once.
 * @param {Document} document - the DOM document
 * @param {Object} template - the embedded PAGE_TEMPLATE object
 * @returns {Array} array of { name, selector, element } block instances
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  const seen = new Set();

  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        if (seen.has(element)) return; // already matched by an earlier selector
        seen.add(element);
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });

  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

// EXPORT DEFAULT CONFIGURATION
export default {
  transform: (payload) => {
    const {
      document, url, html, params,
    } = payload;

    const main = document.body;

    // 1. beforeTransform (initial cleanup: tracking iframe, etc.)
    executeTransformers('beforeTransform', main, payload);

    // 2. Discover blocks using the embedded template
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block; skip elements already replaced by an earlier parser
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return; // detached by an earlier parser
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. afterTransform (strip header/footer XF chrome + insert section breaks)
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Sanitized, extensionless localized path (e.g. /us/en.html -> /us/en).
    //    Guard the root URL: an empty path crashes the bundled importer.
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
