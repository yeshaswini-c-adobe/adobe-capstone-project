/*
 * Search block — WKND site search results.
 *
 * Reads the `q` query parameter, fetches the site's query-index.json (built by
 * helix-query.yaml on publish), filters entries by full-text match across
 * title, description and body content, and renders a results list plus a
 * search box so the query can be refined. All client-side; results link to the
 * matching pages. Scope this site's search to the current locale tree.
 */

const INDEX_PATH = '/query-index.json';

/**
 * Reads the current `q` search term from the URL.
 * @returns {string} the trimmed query, or '' when absent
 */
function getQuery() {
  return new URLSearchParams(window.location.search).get('q')?.trim() || '';
}

/**
 * Fetches and caches the site search index.
 * @returns {Promise<Array>} the index rows (each a page record)
 */
async function fetchIndex() {
  try {
    const resp = await fetch(INDEX_PATH);
    if (!resp.ok) return [];
    const json = await resp.json();
    return Array.isArray(json.data) ? json.data : [];
  } catch (e) {
    return [];
  }
}

/**
 * Scores a page against the search terms. Title matches weigh most, then
 * description, then body content. Returns 0 when a term is missing entirely.
 * @param {object} row A query-index record
 * @param {string[]} terms Lower-cased search terms
 * @returns {number} relevance score (0 = no match)
 */
function scoreRow(row, terms) {
  const title = (row.title || '').toLowerCase();
  const desc = (row.description || '').toLowerCase();
  const content = (row.content || '').toLowerCase();
  let score = 0;
  const has = (t) => title.includes(t) || desc.includes(t) || content.includes(t);
  if (!terms.every(has)) return 0;
  terms.forEach((t) => {
    if (title.includes(t)) score += 10;
    if (desc.includes(t)) score += 4;
    if (content.includes(t)) score += 1;
  });
  return score;
}

/**
 * Builds a single result item element.
 * @param {object} row A matching query-index record
 * @returns {HTMLLIElement}
 */
function renderResult(row) {
  const li = document.createElement('li');
  li.className = 'search-result';
  const a = document.createElement('a');
  a.className = 'search-result-link';
  a.href = row.path;
  const title = document.createElement('span');
  title.className = 'search-result-title';
  title.textContent = row.title || row.path;
  a.append(title);
  if (row.description) {
    const desc = document.createElement('span');
    desc.className = 'search-result-description';
    desc.textContent = row.description;
    a.append(desc);
  }
  li.append(a);
  return li;
}

/**
 * loads and decorates the search block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const query = getQuery();

  // --- search box (lets the query be refined without leaving the page) ---
  const form = document.createElement('form');
  form.className = 'search-form';
  form.setAttribute('role', 'search');
  form.action = window.location.pathname;
  form.method = 'get';

  const input = document.createElement('input');
  input.className = 'search-input';
  input.type = 'search';
  input.name = 'q';
  input.value = query;
  input.placeholder = 'Search';
  input.setAttribute('aria-label', 'Search');

  const submit = document.createElement('button');
  submit.className = 'search-submit';
  submit.type = 'submit';
  submit.textContent = 'Search';

  form.append(input, submit);

  // --- results region ---
  const status = document.createElement('p');
  status.className = 'search-status';
  const results = document.createElement('ul');
  results.className = 'search-results';

  block.replaceChildren(form, status, results);

  if (!query) {
    status.textContent = 'Enter a search term to find articles and adventures.';
    input.focus();
    return;
  }

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const index = await fetchIndex();
  const matches = index
    .map((row) => ({ row, score: scoreRow(row, terms) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!matches.length) {
    status.textContent = `No results found for "${query}".`;
    return;
  }

  const count = matches.length;
  status.textContent = `${count} result${count === 1 ? '' : 's'} for "${query}"`;
  matches.forEach(({ row }) => results.append(renderResult(row)));
}
