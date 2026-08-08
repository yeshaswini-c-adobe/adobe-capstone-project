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

  // tools/importer/import-article-detail.js
  var import_article_detail_exports = {};
  __export(import_article_detail_exports, {
    default: () => import_article_detail_default
  });

  // tools/importer/parsers/hero-banner.js
  function parse(element, { document }) {
    const image = element.querySelector(
      ".cmp-teaser__image img, .cmp-carousel__item--active img.cmp-image__image, .cmp-carousel img.cmp-image__image, img.cmp-image__image, img"
    );
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

  // tools/importer/import-article-detail.js
  var parsers = {
    "hero-banner": parse
  };
  var transformers = [
    transform,
    transform2
  ];
  var PAGE_TEMPLATE = {
    name: "article-detail",
    description: "Magazine article detail page \u2014 a full-bleed lead hero image, article title (H1) + author byline (h4), long-form rich-text body (headings, paragraphs, native blockquote pull-quote, interleaved full-width inline images), an author-bio attribution row, and a text-only 'Up Next' related-reading list. Only the lead hero is a block (hero-banner); everything else is default content.",
    urls: [
      "https://wknd.site/us/en/magazine/arctic-surfing.html",
      "https://wknd.site/us/en/magazine/guide-la-skateparks.html",
      "https://wknd.site/us/en/magazine/san-diego-surf.html",
      "https://wknd.site/us/en/magazine/ski-touring.html",
      "https://wknd.site/us/en/magazine/western-australia.html"
    ],
    blocks: [
      {
        name: "hero-banner",
        instances: [
          "main.cmp-layout-container--fixed > div.cmp-container > div.aem-Grid > div.image"
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
  var import_article_detail_default = {
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
  return __toCommonJS(import_article_detail_exports);
})();
