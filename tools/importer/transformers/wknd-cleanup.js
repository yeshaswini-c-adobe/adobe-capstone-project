/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: WKND site-wide DOM cleanup.
 *
 * Removes non-authorable global chrome so the imported document contains only
 * page-level authorable content (the page body under main.container.responsivegrid).
 *
 * All selectors are verified against migration-work/cleaned.html (primary URL
 * https://wknd.site/us/en.html). No selector is guessed.
 *
 * Removed (non-authorable):
 *   - header.experiencefragment.cmp-experiencefragment--header  (line 5)  AEM Experience Fragment header
 *     (sign-in buttons, language navigation, logo, main navigation, site search)
 *   - footer.experiencefragment.cmp-experiencefragment--footer  (line 471) AEM Experience Fragment footer
 *   - iframe#destination_publishing_iframe_wkndsite_0          (line 566) Adobe ID sync / demdex tracking iframe
 *   - #toggleNav                                               (line 568) mobile navigation toggle button
 *   - #mobileNav.cmp-navigation--mobile                        (line 574) mobile navigation menu
 *
 * The AEM Experience Fragment header/footer are global chrome migrated separately
 * as nav/footer; they are NOT part of the page body. Preserved page content:
 * the hero carousel (div.carousel.cmp-carousel--hero), featured teaser
 * (div.teaser.cmp-teaser--featured), the two image-list card grids
 * (div.image-list.list), the hero banner (div.teaser.cmp-teaser--hero.cmp-teaser--imagebottom),
 * underlined section titles (div.title.cmp-title--underline) and CTA buttons
 * (div.button.cmp-button--primary) — all of which remain untouched.
 *
 * NOTE: This project uses an OLDER AEM boilerplate. scripts/scripts.js does not
 * export moveInstrumentation and scripts/aem.js does not export
 * fetchPlaceholders/moveInstrumentation. This transformer intentionally relies on
 * none of those symbols.
 */

const TransformHook = {
  beforeTransform: 'beforeTransform',
  afterTransform: 'afterTransform',
};

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Tracking / ID-sync widget. Removed early so it never participates in block matching.
    // Verified in cleaned.html line 566: <iframe id="destination_publishing_iframe_wkndsite_0"
    //   src="https://wkndsite.demdex.net/dest5.html..." class="aamIframeLoaded">
    WebImporter.DOMUtils.remove(element, [
      '#destination_publishing_iframe_wkndsite_0',
      'iframe[src*="demdex"]',
      '.aamIframeLoaded',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Non-authorable global chrome (header/footer Experience Fragments + mobile nav).
    // All selectors verified in cleaned.html.
    WebImporter.DOMUtils.remove(element, [
      'header.cmp-experiencefragment--header',
      'footer.cmp-experiencefragment--footer',
      '#toggleNav',
      '#mobileNav',
    ]);

    // Safe removal of leftover non-authorable elements. These carry no authorable
    // content and would otherwise leak into the markdown output.
    // Stray <meta> elements appear inside cmp-image wrappers (e.g. cleaned.html lines 183, 204, 271).
    WebImporter.DOMUtils.remove(element, [
      'iframe',
      'noscript',
      'link',
      'source',
      'meta',
    ]);
  }
}
