/*
 * Table Facts Block (variant of table)
 * Renders a structured "fact sheet" of label/value pairs used on
 * WKND adventure-detail pages (Activity, Adventure Type, Trip Length,
 * Group Size, Difficulty, Price, ...).
 *
 * Authoring model (same 2-column rows as the base table block):
 *   Row 1: | Activity        | Surfing        |
 *   Row 2: | Adventure Type  | Overnight Trip |
 *   ...
 *
 * Each row becomes a stacked definition pair (label above value) with a
 * left accent border, instead of a gridlined <table>.
 */

export default function decorate(block) {
  const dl = document.createElement('dl');
  dl.className = 'table-facts-list';

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (!cells.length) return;

    const pair = document.createElement('div');
    pair.className = 'table-facts-pair';

    const dt = document.createElement('dt');
    dt.className = 'table-facts-label';
    dt.innerHTML = cells[0] ? cells[0].innerHTML : '';

    const dd = document.createElement('dd');
    dd.className = 'table-facts-value';
    // Any additional cells beyond the label are treated as the value.
    dd.innerHTML = cells.slice(1).map((c) => c.innerHTML).join(' ');

    pair.append(dt, dd);
    dl.append(pair);
  });

  block.replaceChildren(dl);
}
