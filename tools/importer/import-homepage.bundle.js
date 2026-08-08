/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-homepage.js
  var import_homepage_exports = {};
  __export(import_homepage_exports, {
    default: () => import_homepage_default
  });

  // tools/importer/parsers/carousel-hero.js
  function parse(element, { document }) {
    let slides = Array.from(element.querySelectorAll(".teaser.cmp-teaser--hero"));
    if (slides.length === 0) {
      slides = Array.from(element.querySelectorAll(".cmp-carousel__item"));
    }
    const cells = [];
    slides.forEach((slide) => {
      const image = slide.querySelector(".cmp-teaser__image img, img.cmp-image__image, img");
      const title = slide.querySelector('.cmp-teaser__title, h1, h2, h3, [class*="title"]');
      const description = slide.querySelector('.cmp-teaser__description, [class*="description"]');
      const ctaLinks = Array.from(slide.querySelectorAll(
        ".cmp-teaser__action-link, .cmp-teaser__action-container a"
      ));
      const contentCell = [];
      if (title) contentCell.push(title);
      if (description) contentCell.push(description);
      contentCell.push(...ctaLinks);
      if (!image && contentCell.length === 0) return;
      cells.push([image || "", contentCell]);
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "carousel-hero", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-featured.js
  function parse2(element, { document }) {
    const image = element.querySelector(".cmp-teaser__image img, img.cmp-image__image, img");
    const eyebrow = element.querySelector('.cmp-teaser__pretitle, [class*="pretitle"], [class*="eyebrow"]');
    const heading = element.querySelector(".cmp-teaser__title") || element.querySelector("h1, h2, h3, h4");
    const description = element.querySelector('.cmp-teaser__description, [class*="description"]');
    const ctaLinks = Array.from(element.querySelectorAll(
      ".cmp-teaser__action-link, .cmp-teaser__action-container a"
    ));
    const textCell = [];
    if (eyebrow) textCell.push(eyebrow);
    if (heading) textCell.push(heading);
    if (description) textCell.push(description);
    textCell.push(...ctaLinks);
    if (!image && textCell.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [[image || "", textCell.length ? textCell : ""]];
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-featured", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-teaser.js
  function parse3(element, { document }) {
    let items = Array.from(element.querySelectorAll("li.cmp-image-list__item"));
    if (items.length === 0) {
      items = Array.from(element.querySelectorAll(
        '.cmp-image-list__item, [class*="image-list__item"]'
      ));
    }
    const cells = [];
    items.forEach((item) => {
      const image = item.querySelector(".cmp-image-list__item-image img, img.cmp-image__image, img");
      const titleLink = item.querySelector('a.cmp-image-list__item-title-link, [class*="title-link"]');
      const titleSpan = item.querySelector('.cmp-image-list__item-title, [class*="item-title"]:not([class*="title-link"])');
      const description = item.querySelector('.cmp-image-list__item-description, [class*="description"]');
      const titleNode = titleLink || titleSpan;
      const contentCell = [];
      if (titleNode) contentCell.push(titleNode);
      if (description) contentCell.push(description);
      if (!image && contentCell.length === 0) return;
      cells.push([image || "", contentCell.length ? contentCell : ""]);
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-teaser", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/hero-banner.js
  function parse4(element, { document }) {
    const image = element.querySelector(".cmp-teaser__image img, img.cmp-image__image, img");
    const heading = element.querySelector('.cmp-teaser__title, h1, h2, h3, [class*="title"]');
    const description = element.querySelector('.cmp-teaser__description, [class*="description"]');
    const ctaLinks = Array.from(element.querySelectorAll(
      ".cmp-teaser__action-link, .cmp-teaser__action-container a"
    ));
    const contentCell = [];
    if (heading) contentCell.push(heading);
    if (description) contentCell.push(description);
    contentCell.push(...ctaLinks);
    if (!image && contentCell.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    if (image) cells.push([image]);
    if (contentCell.length) cells.push([contentCell]);
    const block = WebImporter.Blocks.createBlock(document, { name: "hero-banner", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/wknd-cleanup.js
  var TransformHook = {
    beforeTransform: "beforeTransform",
    afterTransform: "afterTransform"
  };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      WebImporter.DOMUtils.remove(element, [
        "#destination_publishing_iframe_wkndsite_0",
        'iframe[src*="demdex"]',
        ".aamIframeLoaded"
      ]);
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        "header.cmp-experiencefragment--header",
        "footer.cmp-experiencefragment--footer",
        "#toggleNav",
        "#mobileNav"
      ]);
      WebImporter.DOMUtils.remove(element, [
        "iframe",
        "noscript",
        "link",
        "source",
        "meta"
      ]);
    }
  }

  // tools/importer/transformers/wknd-sections.js
  var TransformHook2 = {
    beforeTransform: "beforeTransform",
    afterTransform: "afterTransform"
  };
  function getContentRoot(element) {
    const carousel = element.querySelector(".carousel.cmp-carousel--hero");
    return carousel && carousel.closest("main") || element;
  }
  function getSectionPlan(contentRoot, payload) {
    const templateSections = payload && payload.template && payload.template.sections;
    if (Array.isArray(templateSections) && templateSections.length > 1) {
      const fromTemplate = templateSections.map((s) => ({
        el: s && s.selector ? contentRoot.querySelector(s.selector) : null,
        style: s ? s.style : void 0
      })).filter((entry) => entry.el);
      if (fromTemplate.length > 1) return fromTemplate;
    }
    const plan = [];
    const carousel = contentRoot.querySelector(".carousel.cmp-carousel--hero");
    if (carousel) plan.push({ el: carousel, style: void 0 });
    const featured = contentRoot.querySelector(".teaser.cmp-teaser--featured");
    if (featured) plan.push({ el: featured, style: void 0 });
    const underlinedTitles = contentRoot.querySelectorAll(".title.cmp-title--underline");
    if (underlinedTitles[0]) plan.push({ el: underlinedTitles[0], style: void 0 });
    if (underlinedTitles[1]) plan.push({ el: underlinedTitles[1], style: void 0 });
    const imageLists = contentRoot.querySelectorAll(".image-list.list");
    const adventuresGrid = imageLists[1];
    if (adventuresGrid) {
      const s5Container = adventuresGrid.closest("main.cmp-layout-container--fixed");
      plan.push({ el: s5Container || adventuresGrid, style: void 0 });
    }
    return plan;
  }
  function transform2(hookName, element, payload) {
    if (hookName === TransformHook2.afterTransform) {
      const contentRoot = getContentRoot(element);
      contentRoot.querySelectorAll(".separator").forEach((sep) => sep.remove());
      const plan = getSectionPlan(contentRoot, payload);
      for (let i = plan.length - 1; i >= 1; i -= 1) {
        const { el, style } = plan[i];
        if (!el || !el.parentNode) continue;
        const prev = el.previousElementSibling;
        if (!prev || prev.tagName !== "HR") {
          const hr = payload.document.createElement("hr");
          el.parentNode.insertBefore(hr, el);
        }
        if (style) {
          const meta = WebImporter.Blocks.createBlock(payload.document, {
            name: "Section Metadata",
            cells: { style }
          });
          el.parentNode.insertBefore(meta, el);
        }
      }
    }
  }

  // tools/importer/import-homepage.js
  var parsers = {
    "carousel-hero": parse,
    "columns-featured": parse2,
    "cards-teaser": parse3,
    "hero-banner": parse4
  };
  var transformers = [
    transform,
    transform2
  ];
  var PAGE_TEMPLATE = {
    name: "homepage",
    description: "Locale landing page with full-width hero image, headline, and a grid of featured teasers linking into adventures and magazine content. Full variant (us/en, ca/en) has a hero carousel, featured-article teaser, recent-articles cards grid, adventure teaser, and adventures cards grid. Minor locales are 'coming soon' stubs with a single hero teaser (heading + image).",
    urls: [
      "https://wknd.site/us/en.html",
      "https://wknd.site/ca/en.html",
      "https://wknd.site/ca/fr.html",
      "https://wknd.site/ch/de.html",
      "https://wknd.site/ch/fr.html",
      "https://wknd.site/ch/it.html",
      "https://wknd.site/de/de.html",
      "https://wknd.site/es/es.html",
      "https://wknd.site/fr/fr.html",
      "https://wknd.site/it/it.html",
      "https://wknd.site/us/es.html"
    ],
    blocks: [
      {
        name: "carousel-hero",
        instances: [
          "div.carousel.cmp-carousel--hero",
          ".carousel.panelcontainer.cmp-carousel--hero"
        ]
      },
      {
        name: "columns-featured",
        instances: [
          "div.teaser.cmp-teaser--featured",
          ".teaser.cmp-teaser--featured"
        ]
      },
      {
        name: "cards-teaser",
        instances: [
          "div.image-list.list",
          ".image-list.list"
        ]
      },
      {
        name: "hero-banner",
        instances: [
          "div.teaser.cmp-teaser--hero.cmp-teaser--imagebottom",
          "main.container.responsivegrid > div.cmp-container > div.teaser.cmp-teaser--hero"
        ]
      }
    ]
  };
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), {
      template: PAGE_TEMPLATE
    });
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document, template) {
    const pageBlocks = [];
    const seen = /* @__PURE__ */ new Set();
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
            section: blockDef.section || null
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_homepage_default = {
    transform: (payload) => {
      const {
        document,
        url,
        html,
        params
      } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
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
      executeTransformers("afterTransform", main, payload);
      const hr = document.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: {
          title: document.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_homepage_exports);
})();
