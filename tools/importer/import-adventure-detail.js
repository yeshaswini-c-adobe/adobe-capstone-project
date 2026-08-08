/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroBannerParser from './parsers/hero-banner.js';
import tableFactsParser from './parsers/table-facts.js';

// TRANSFORMER IMPORTS (reused site-wide)
import cleanupTransformer from './transformers/wknd-cleanup.js';
import sectionsTransformer from './transformers/wknd-sections.js';

// PARSER REGISTRY
const parsers = {
  'hero-banner': heroBannerParser,
  'table-facts': tableFactsParser,
};

// TRANSFORMER REGISTRY - cleanup first, then section boundaries
const transformers = [
  cleanupTransformer,
  sectionsTransformer,
];

// PAGE TEMPLATE CONFIGURATION - embedded from page-templates.json (adventure-detail)
const PAGE_TEMPLATE = {
  name: 'adventure-detail',
  description: "Adventure detail page — full-bleed hero image, adventure title (H1), a structured fact sheet (Activity, Adventure Type, Trip Length, Group Size, Difficulty, Price) sourced from an AEM Content Fragment, a 'Share this Adventure' block, and long-form body copy authored in Tabs (Overview / Itinerary / What to Bring) flattened to headed default content.",
  urls: [
    'https://wknd.site/us/en/adventures/bali-surf-camp.html',
    'https://wknd.site/us/en/adventures/beervana-portland.html',
    'https://wknd.site/us/en/adventures/climbing-new-zealand.html',
    'https://wknd.site/us/en/adventures/colorado-rock-climbing.html',
    'https://wknd.site/us/en/adventures/cycling-southern-utah.html',
    'https://wknd.site/us/en/adventures/cycling-tuscany.html',
    'https://wknd.site/us/en/adventures/downhill-skiing-wyoming.html',
    'https://wknd.site/us/en/adventures/gastronomic-marais-tour.html',
    'https://wknd.site/us/en/adventures/napa-wine-tasting.html',
    'https://wknd.site/us/en/adventures/riverside-camping-australia.html',
    'https://wknd.site/us/en/adventures/ski-touring-mont-blanc.html',
    'https://wknd.site/us/en/adventures/surf-camp-costa-rica.html',
    'https://wknd.site/us/en/adventures/tahoe-skiing.html',
    'https://wknd.site/us/en/adventures/west-coast-cycling.html',
    'https://wknd.site/us/en/adventures/whistler-mountain-biking.html',
    'https://wknd.site/us/en/adventures/yosemite-backpacking.html',
  ],
  blocks: [
    {
      name: 'hero-banner',
      instances: [
        'div.carousel.panelcontainer.cmp-carousel--mini',
        'main div.carousel.cmp-carousel--mini',
      ],
    },
    {
      name: 'table-facts',
      instances: [
        'div.contentfragment.cmp-contentfragment--elements',
        '.contentfragment.cmp-contentfragment--elements',
      ],
    },
  ],
};

/**
 * Execute all page transformers for a specific hook.
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
 * De-duplicates elements matched by more than one selector.
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
        if (seen.has(element)) return;
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

    // 1. beforeTransform (initial cleanup)
    executeTransformers('beforeTransform', main, payload);

    // 2. Discover blocks
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block; skip elements already replaced by an earlier parser
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
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

    // 6. Sanitized, extensionless localized path (e.g. /us/en/adventures/bali-surf-camp.html -> /us/en/adventures/bali-surf-camp)
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
