# Pre-Migration Analysis

Discovery and planning artifacts produced **before** the WKND content was migrated
to Edge Delivery Services. These describe the source AEM site and the migration plan.

| Report | What it covers |
|---|---|
| [WKND Discovery & Migration Assessment](./wknd-migration-assessment.html) | 28-section discovery: sitemap, page/URL/template/component inventory, header/footer analysis, SEO & metadata, AEM→EDS template & component mapping, risks, complexity, effort estimate, phase-wise plan, go-live checklist. |
| [WKND Template Catalog](./wknd-template-catalog.json) | The page templates discovered during cataloging (representative pages per template) that drove the template-based import. |

**Related machine-generated data (kept in place):** per-page import reports live under
[`tools/importer/reports/`](../../tools/importer/reports) — 6 template `.xlsx` summaries plus a
per-URL `.report.json` for every migrated page. They stay there because the importer writes to
that path.

See also: [Post-Migration Analysis](../post-migration-analysis/README.md).
