// Guest card + mini-card rendering. DOM only, no rule logic.
import { COLORS, emojiOf } from '../engine/traits.js';
import { h } from './dom.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const ENUM_SLOTS = ['hat', 'item', 'shirt', 'pet', 'mood'];

function svg(tag, attrs, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, String(v));
  kids.forEach((k) => k && el.append(k));
  return el;
}

const SHIRT_PATH = 'M22,22 L44,8 Q60,20 76,8 L98,22 L114,44 L96,54 L90,44 L90,96 L30,96 L30,44 L24,54 L6,44 Z';

/** Inline SVG T-shirt tinted with the palette colour. */
export function shirtSvg(color, { label } = {}) {
  const fill = COLORS[color] || '#ccc';
  const dark = color === 'black' || color === 'purple' || color === 'blue' || color === 'green' || color === 'red';
  const s = svg('svg', { viewBox: '0 0 120 100', class: 'shirt-svg', 'aria-hidden': 'true' },
    svg('path', { d: SHIRT_PATH, fill, stroke: 'var(--ink)', 'stroke-width': 4, 'stroke-linejoin': 'round' }),
    svg('path', { d: 'M44,8 Q60,26 76,8', fill: 'none', stroke: 'var(--ink)', 'stroke-width': 4, 'stroke-linecap': 'round' }),
    svg('path', { d: 'M36,60 L36,88', stroke: 'rgba(255,255,255,.35)', 'stroke-width': 5, 'stroke-linecap': 'round' }),
  );
  if (label) {
    const tx = svg('text', { x: 60, y: 74, 'text-anchor': 'middle', class: 'cb-label shirt-text', fill: dark ? '#fff' : '#222' });
    tx.textContent = label;
    s.append(tx);
  }
  return s;
}

function faceSvg({ ears = false } = {}) {
  return svg('svg', { viewBox: '0 0 100 100', class: 'face-svg', 'aria-hidden': 'true' },
    ears ? svg('circle', { cx: 18, cy: 22, r: 14, fill: '#a0652a', stroke: 'var(--ink)', 'stroke-width': 4 }) : null,
    ears ? svg('circle', { cx: 82, cy: 22, r: 14, fill: '#a0652a', stroke: 'var(--ink)', 'stroke-width': 4 }) : null,
    svg('circle', { cx: 50, cy: 52, r: 42, fill: '#FFD45E', stroke: 'var(--ink)', 'stroke-width': 4 }),
    svg('circle', { cx: 36, cy: 46, r: 5.5, fill: 'var(--ink)' }),
    svg('circle', { cx: 64, cy: 46, r: 5.5, fill: 'var(--ink)' }),
    svg('circle', { cx: 26, cy: 62, r: 6, fill: '#ff9a8a', opacity: 0.7 }),
    svg('circle', { cx: 74, cy: 62, r: 6, fill: '#ff9a8a', opacity: 0.7 }),
    svg('path', { d: 'M36,64 Q50,76 64,64', fill: 'none', stroke: 'var(--ink)', 'stroke-width': 4, 'stroke-linecap': 'round' }),
  );
}

function tailSvg() {
  return svg('svg', { viewBox: '0 0 60 40', class: 'tail-svg', 'aria-hidden': 'true' },
    svg('path', { d: 'M4,34 Q20,30 30,18 Q38,6 52,6', fill: 'none', stroke: 'var(--ink)', 'stroke-width': 12, 'stroke-linecap': 'round' }),
    svg('path', { d: 'M4,34 Q20,30 30,18 Q38,6 52,6', fill: 'none', stroke: '#c48a4a', 'stroke-width': 6, 'stroke-linecap': 'round' }),
  );
}

/**
 * Full guest card.
 * @param {object} guest
 * @param {{visible:string[], L:Function, quote?:string, index?:number}} o
 */
export function renderCard(guest, o) {
  const { visible, L } = o;
  const vis = new Set(visible);
  const special = guest.special || null;
  const name = special ? L(`special.${special}.name`, special === 'boss' ? 'Sug' : 'Definitely Steve') : guest.name;
  const quote = special ? L(`special.${special}.quote`, '') : o.quote;
  const colorName = L(`color.${guest.shirt}`, guest.shirt);

  const fig = h('div', { class: 'figure' });
  // body
  if (special === 'trenchcoat') {
    fig.append(h('div', { class: 'coat', data: { trait: 'shirt' }, 'aria-hidden': 'true' }, '🧥'));
  } else {
    // shirt is visible in every club; if not, draw a neutral white tee
    const c = vis.has('shirt') ? guest.shirt : 'white';
    fig.append(h('div', { class: 'body', data: { trait: 'shirt' } }, shirtSvg(c, { label: vis.has('shirt') ? colorName : '' })));
  }
  // head
  const head = h('div', { class: 'head', data: { trait: 'mood' } });
  if (special === 'boss') head.append(h('span', { class: 'emo face-emo' }, '🥸'));
  else if (special === 'trenchcoat') head.append(faceSvg(), h('span', { class: 'emo shades' }, '🕶️'));
  else if (vis.has('mood')) head.append(h('span', { class: 'emo face-emo' }, emojiOf('mood', guest.mood)));
  else head.append(faceSvg());
  fig.append(head);
  if (special === 'boss') head.classList.add('boss-head');

  if (vis.has('hat') && guest.hat !== 'none') fig.append(h('span', { class: 'emo slot-hat', data: { trait: 'hat' } }, emojiOf('hat', guest.hat)));
  if (vis.has('item') && guest.item !== 'none') fig.append(h('span', { class: 'emo slot-item', data: { trait: 'item' } }, emojiOf('item', guest.item)));
  if (vis.has('pet') && guest.pet !== 'none') fig.append(h('span', { class: 'emo slot-pet', data: { trait: 'pet' } }, emojiOf('pet', guest.pet)));

  // slot bar: canonical read of every visible enum trait (∅ for none)
  const chips = h('div', { class: 'chips' });
  for (const t of ENUM_SLOTS) {
    if (!vis.has(t)) continue;
    let chip;
    if (t === 'shirt') {
      chip = h('span', { class: 'chip chip-shirt', data: { trait: 'shirt' }, title: colorName },
        h('i', { class: 'swatch', style: { background: COLORS[guest.shirt] } }),
        h('em', { class: 'cb-label' }, colorName));
    } else {
      const val = special === 'boss' && t === 'mood' ? 'grin' : guest[t];
      const e = emojiOf(t, val);
      chip = h('span', { class: 'chip' + (e ? '' : ' chip-none'), data: { trait: t }, title: L(`trait.${t}`, t) },
        e || h('i', { class: 'none-mark', 'aria-hidden': 'true' }, '∅'));
    }
    chips.append(chip);
  }

  const tag = h('div', { class: 'tag' },
    h('b', { class: 'tag-name', data: { trait: 'name' } }, name),
    vis.has('age') ? h('span', { class: 'tag-age', data: { trait: 'age' } }, String(guest.age)) : null);

  const card = h('div', {
    class: 'card' + (special ? ` special special-${special}` : ''),
    role: 'img',
    'aria-label': describeGuest(guest, o, name, colorName),
  },
  h('div', { class: 'card-face' },
    quote ? h('div', { class: 'quote' }, `“${quote}”`) : null,
    fig,
    tag,
    chips),
  h('div', { class: 'stamp', 'aria-hidden': 'true' }),
  h('div', { class: 'react', 'aria-hidden': 'true' }));

  if (special === 'trenchcoat') {
    card.append(h('div', { class: 'tail' }, tailSvg()));
    const tip = h('div', { class: 'tap-tip' }, '👆 ' + L('special.trenchcoat.tap', 'Tap the coat'));
    card.append(tip);
    const reveal = (e) => {
      if (card.classList.contains('revealed')) return;
      e.stopPropagation();
      card.classList.add('revealed');
      head.replaceChildren(h('span', { class: 'emo face-emo dog-reveal' }, '🐶'));
      o.onReveal?.();
    };
    // the card captures the pointer while swiping, so track down-on-figure and up-on-card
    let downOnFig = false;
    fig.addEventListener('pointerdown', () => { downOnFig = true; });
    card.addEventListener('pointerup', (e) => {
      const hit = downOnFig;
      downOnFig = false;
      if (hit && !card.classList.contains('dragged')) reveal(e);
    });
    card.addEventListener('pointercancel', () => { downOnFig = false; });
    card._reveal = reveal;
  }
  return card;
}

function describeGuest(g, o, name, colorName) {
  const { visible, L } = o;
  const parts = [name];
  for (const t of visible) {
    if (t === 'name') continue;
    if (t === 'age') parts.push(L('guest.age', `Age ${g.age}`, { n: g.age }));
    else if (t === 'shirt') parts.push(`${L('trait.shirt', 'Shirt')}: ${colorName}`);
    else {
      const e = emojiOf(t, g[t]);
      parts.push(`${L(`trait.${t}`, t)}: ${e || L(`guest.no${t[0].toUpperCase()}${t.slice(1)}`, 'none')}`);
    }
  }
  return parts.join(', ');
}

/**
 * Small log entry for a resolved guest.
 * @param {{visible:string[], admit:boolean, demo:boolean, missed?:boolean, L:Function}} o
 */
export function renderMini(guest, i, o) {
  const { visible, L } = o;
  const vis = new Set(visible);
  const grid = h('div', { class: 'mini-grid' });
  for (const t of ['hat', 'item', 'pet', 'mood']) {
    if (!vis.has(t)) continue;
    let e = emojiOf(t, guest[t]);
    if (guest.special === 'boss' && t === 'mood') e = '🥸';
    grid.append(h('span', { class: 'mini-slot' + (e ? '' : ' none ghost'), data: { trait: t } }, e || '—'));
  }
  if (guest.special === 'boss' && !vis.has('mood')) grid.append(h('span', { class: 'mini-slot' }, '🥸'));
  if (guest.special === 'trenchcoat') grid.append(h('span', { class: 'mini-slot' }, '🧥'));
  const colorName = L(`color.${guest.shirt}`, guest.shirt);
  const kids = [
    o.demo ? h('span', { class: 'mini-badge', title: L('log.manager', 'Manager') }, '👔') : null,
    o.missed ? h('span', { class: 'mini-miss', title: L('log.missed', 'Your call was wrong') }, '!') : null,
    grid,
  ];
  if (vis.has('name') || vis.has('age')) {
    kids.push(h('span', { class: 'mini-text' },
      vis.has('name') ? h('b', { data: { trait: 'name' } }, guest.name) : null,
      vis.has('age') ? h('span', { data: { trait: 'age' } }, ' ' + guest.age) : null));
  }
  kids.push(h('span', { class: 'mini-shirt', data: { trait: 'shirt' }, style: { background: COLORS[guest.shirt] } },
    h('em', { class: 'cb-label' }, colorName)));
  return h('div', {
    class: `mini ${o.admit ? 'in' : 'out'}`,
    data: { i: String(i) },
    title: guest.name,
    'aria-label': `${guest.name}: ${o.admit ? 'in' : 'out'}`,
  }, ...kids);
}
