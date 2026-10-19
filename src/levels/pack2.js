'use strict';

// Level pack 2 — home & everyday life (kitchen, living room, bedroom, toys, food, family). Appended to LEVELS.
{
  // ---------- helpers & art (block-scoped so they don't clash with other packs) ----------
  const ink = '#2b2b2b';
  const skin = '#ffd9b8';
  const dot = (x, y, r = 4, c = ink) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="none"/>`;
  const txt = (x, y, s, t, c = ink, extra = '') =>
    `<text x="${x}" y="${y}" font-size="${s}" text-anchor="middle" fill="${c}" stroke="none" font-family="Patrick Hand, cursive" font-weight="bold" ${extra}>${t}</text>`;
  const cheeks = (x1, x2, y, r = 7) => dot(x1, y, r, '#ffab91') + dot(x2, y, r, '#ffab91');

  const P2 = {
    // ----- toaster level -----
    // st: { down, light, face: 'sleep'|'awake'|'happy', toast }
    toaster: (st) => {
      const by = st.toast ? -34 : st.down ? 34 : 6;
      const bread = st.toast ? '#c98035' : '#f8deaa';
      const crust = st.toast ? '#8a4f1e' : '#c98a45';
      const slice = (x) => `<path d="M${x} ${by + 70} L${x} ${by + 18} Q${x} ${by} ${x + 18} ${by} L${x + 42} ${by} Q${x + 60} ${by} ${x + 60} ${by + 18} L${x + 60} ${by + 70} Z" fill="${bread}" stroke="${crust}" stroke-width="5"/>`;
      const eyes = st.face === 'sleep'
        ? '<path d="M82 112 q10 7 20 0 M138 112 q10 7 20 0" fill="none"/>'
        : dot(92, 110, 7) + dot(148, 110, 7) + dot(95, 107, 2.5, '#fff') + dot(151, 107, 2.5, '#fff');
      const mouth = st.face === 'happy'
        ? '<path d="M104 128 Q120 148 136 128 Z" fill="#e57373"/>'
        : st.face === 'awake' ? '<path d="M108 132 Q120 140 132 132" fill="none"/>' : '<path d="M112 134 h16" fill="none"/>';
      return svg('0 0 240 200', `
        ${st.toast ? '<path d="M70 -60 q8 -12 0 -24 M120 -64 q8 -12 0 -24 M170 -60 q8 -12 0 -24" fill="none" stroke="#bbb" stroke-width="4"/>' : ''}
        ${slice(52)}${slice(128)}
        <rect x="40" y="184" width="30" height="12" rx="4" fill="#555"/><rect x="170" y="184" width="30" height="12" rx="4" fill="#555"/>
        <rect x="20" y="50" width="200" height="140" rx="34" fill="#cfd8dc"/>
        <path d="M40 92 Q40 70 60 66" fill="none" stroke="#fff" stroke-width="7"/>
        <rect x="46" y="44" width="68" height="14" rx="7" fill="${st.light ? '#ff7043' : '#78909c'}"/>
        <rect x="122" y="44" width="68" height="14" rx="7" fill="${st.light ? '#ff7043' : '#78909c'}"/>
        ${st.face !== 'sleep' ? cheeks(74, 166, 128) : ''}${eyes}${mouth}
        <rect x="212" y="78" width="12" height="82" rx="6" fill="#90a4ae"/>
        <rect x="206" y="${st.down ? 140 : 76}" width="30" height="18" rx="7" fill="#424242"/>
        <circle cx="48" cy="164" r="8" fill="${st.light ? '#ff5252' : '#777'}"/>
        ${st.face === 'sleep' ? txt(212, 36, 26, 'z', ink) + txt(228, 16, 20, 'z', ink) : ''}`);
    },
    socket: () => svg('0 0 100 100', `
      <rect x="8" y="8" width="84" height="84" rx="18" fill="#fff"/>
      <circle cx="50" cy="50" r="28" fill="#eceff1" stroke-width="3"/>
      <rect x="36" y="38" width="8" height="24" rx="3" fill="${ink}"/><rect x="56" y="38" width="8" height="24" rx="3" fill="${ink}"/>`),
    plug: (on) => on
      ? svg('0 0 60 60', `<circle cx="30" cy="30" r="24" fill="#424242"/><path d="M18 22 Q22 14 30 13" fill="none" stroke="#9e9e9e" stroke-width="4"/>
          <path d="M50 4 l6 -4 M56 14 l7 -1 M46 -2 l1 -7" stroke="#ffd23f" stroke-width="4"/>`)
      : svg('0 0 80 60', `
          <rect x="48" y="17" width="28" height="8" rx="3" fill="#cfd8dc"/><rect x="48" y="35" width="28" height="8" rx="3" fill="#cfd8dc"/>
          <rect x="4" y="10" width="48" height="40" rx="12" fill="#424242"/>
          <path d="M14 22 Q16 16 24 16" fill="none" stroke="#9e9e9e" stroke-width="4"/>`),
    jam: () => svg('0 0 100 120', `
      <rect x="18" y="34" width="64" height="80" rx="16" fill="#8e24aa"/>
      <path d="M26 56 Q26 44 36 42" fill="none" stroke="#fff" stroke-width="5" opacity=".6"/>
      <rect x="14" y="8" width="72" height="28" rx="6" fill="#e53935"/>
      <path d="M28 8 v28 M44 8 v28 M60 8 v28 M74 8 v28" stroke="#fff" stroke-width="4"/>
      <rect x="28" y="62" width="44" height="34" rx="8" fill="#fff8e1"/>
      <path d="M50 88 C34 78 38 66 50 74 C62 66 66 78 50 88 Z" fill="#e53935" stroke-width="2"/>`),

    // ----- cake thief level -----
    table: () => svg('0 0 220 160', `
      <rect x="40" y="56" width="14" height="96" fill="#a1683a"/><rect x="166" y="56" width="14" height="96" fill="#a1683a"/>
      <rect x="10" y="44" width="200" height="18" rx="6" fill="#c48a5c"/>
      <ellipse cx="110" cy="38" rx="74" ry="14" fill="#fff"/><ellipse cx="110" cy="36" rx="52" ry="8" fill="#f2f2f2" stroke-width="2"/>
      ${dot(86, 34, 3, '#8d5524')}${dot(100, 38, 2.5, '#8d5524')}${dot(126, 33, 3, '#8d5524')}${dot(138, 38, 2.5, '#8d5524')}${dot(112, 31, 2, '#8d5524')}
      <path d="M150 20 l-30 18" stroke="#9e9e9e" stroke-width="5"/>
      <circle cx="74" cy="28" r="7" fill="#e53935" stroke-width="3"/><path d="M74 21 q2 -10 10 -12" fill="none" stroke-width="3"/>`),
    crumbs: () => {
      const pts = [[248, 330], [262, 350], [252, 370], [270, 388], [300, 400], [336, 410], [372, 414], [410, 412],
        [448, 416], [486, 413], [524, 416], [562, 412], [600, 414], [636, 408], [668, 402], [694, 394], [716, 384]];
      return svg('0 0 960 440', pts.map(([x, y], i) =>
        `<circle cx="${x}" cy="${y}" r="${i % 3 === 0 ? 5 : 4}" fill="${i % 4 === 1 ? '#fff3e0' : '#8d5524'}" stroke-width="2"/>`).join(''));
    },
    boy: () => svg('0 0 140 270', `
      <rect x="40" y="190" width="26" height="66" rx="8" fill="#3f6fb5"/><rect x="74" y="190" width="26" height="66" rx="8" fill="#3f6fb5"/>
      <ellipse cx="50" cy="258" rx="20" ry="9" fill="#e53935"/><ellipse cx="90" cy="258" rx="20" ry="9" fill="#e53935"/>
      <path d="M36 128 Q20 160 30 190" fill="none" stroke-width="16"/><path d="M36 128 Q20 160 30 190" fill="none" stroke="#7bd389" stroke-width="8"/>
      <path d="M104 128 Q120 160 110 190" fill="none" stroke-width="16"/><path d="M104 128 Q120 160 110 190" fill="none" stroke="#7bd389" stroke-width="8"/>
      <circle cx="30" cy="194" r="9" fill="${skin}"/><circle cx="110" cy="194" r="9" fill="${skin}"/>
      <rect x="34" y="112" width="72" height="90" rx="22" fill="#7bd389"/>
      <path d="M50 150 h40" stroke="#fff" stroke-width="5"/>
      <circle cx="70" cy="66" r="44" fill="${skin}"/>
      <path d="M28 56 Q30 18 70 20 Q110 18 112 56 Q96 40 80 46 Q70 30 54 44 Q40 40 28 56 Z" fill="#8d5524"/>
      ${dot(54, 68, 5)}${dot(86, 68, 5)}${cheeks(44, 96, 84, 6)}
      <circle cx="70" cy="90" r="6" fill="#c62828" stroke-width="3"/>`),
    dog: () => svg('0 0 160 140', `
      <path d="M126 104 Q150 90 146 66" fill="none" stroke-width="12"/><path d="M126 104 Q150 90 146 66" fill="none" stroke="#d9a066" stroke-width="5"/>
      <ellipse cx="88" cy="100" rx="50" ry="34" fill="#d9a066"/>
      <rect x="54" y="104" width="20" height="30" rx="8" fill="#d9a066"/><rect x="88" y="104" width="20" height="30" rx="8" fill="#d9a066"/>
      <circle cx="58" cy="54" r="38" fill="#d9a066"/>
      <path d="M26 30 Q8 50 22 82 Q36 70 34 40 Z" fill="#8d5524"/><path d="M88 28 Q108 46 98 80 Q82 70 80 38 Z" fill="#8d5524"/>
      ${dot(46, 52, 5)}${dot(70, 52, 5)}
      <ellipse cx="58" cy="68" rx="9" ry="6" fill="${ink}"/>
      <path d="M50 80 Q58 86 66 80" fill="none" stroke-width="3"/>
      <path d="M54 82 q4 16 10 0" fill="#f48fb1" stroke-width="3"/>`),
    reader: (caught) => {
      const chair = `
        <rect x="16" y="14" width="228" height="230" rx="40" fill="#c0392b"/>
        <path d="M44 40 Q130 24 216 40" fill="none" stroke="#e57368" stroke-width="6"/>
        <rect x="28" y="266" width="16" height="22" fill="#6d4c41"/><rect x="216" y="266" width="16" height="22" fill="#6d4c41"/>`;
      const arms = `<rect x="0" y="150" width="56" height="120" rx="22" fill="#a93226"/><rect x="204" y="150" width="56" height="120" rx="22" fill="#a93226"/>
        <rect x="40" y="200" width="180" height="70" rx="16" fill="#cd4a3c"/>`;
      const legs = `<rect x="88" y="216" width="32" height="56" rx="10" fill="#5d6d7e"/><rect x="140" y="216" width="32" height="56" rx="10" fill="#5d6d7e"/>
        <ellipse cx="98" cy="278" rx="26" ry="11" fill="#8e44ad"/><ellipse cx="162" cy="278" rx="26" ry="11" fill="#8e44ad"/>`;
      if (!caught) {
        return svg('0 0 260 300', `${chair}
          <rect x="74" y="120" width="112" height="110" rx="26" fill="#f39c12"/>
          <path d="M98 50 Q130 14 162 50 Z" fill="${skin}"/><path d="M104 40 q-8 -6 -6 -14 M156 40 q8 -6 6 -14" fill="none" stroke-width="3"/>
          ${arms}${legs}
          <g transform="rotate(-3 130 120)">
            <rect x="42" y="44" width="176" height="150" rx="4" fill="#fafafa"/>
            <line x1="130" y1="44" x2="130" y2="194" stroke-width="2"/>
            ${txt(86, 74, 22, 'DAILY')}${txt(174, 74, 22, 'NEWS')}
            <path d="M56 92 h60 M56 108 h60 M56 124 h46 M56 140 h60 M56 156 h52 M56 172 h60 M144 92 h60 M144 108 h60 M144 124 h60 M144 140 h40 M144 156 h60 M144 172 h52" stroke="#9e9e9e" stroke-width="4"/>
            <circle cx="42" cy="124" r="13" fill="${skin}"/><circle cx="218" cy="124" r="13" fill="${skin}"/>
          </g>`);
      }
      return svg('0 0 260 300', `${chair}
        <rect x="70" y="126" width="120" height="104" rx="26" fill="#f39c12"/>
        <circle cx="130" cy="82" r="48" fill="${skin}"/>
        <path d="M84 70 q-6 -24 12 -30 M176 70 q6 -24 -12 -30" fill="none" stroke-width="4"/>
        <circle cx="82" cy="86" r="9" fill="${skin}"/><circle cx="178" cy="86" r="9" fill="${skin}"/>
        <circle cx="112" cy="74" r="10" fill="#fff"/><circle cx="148" cy="74" r="10" fill="#fff"/>${dot(113, 76, 5)}${dot(149, 76, 5)}
        <path d="M100 58 l20 -4 M140 54 l20 4" fill="none" stroke-width="4"/>
        <ellipse cx="130" cy="108" rx="13" ry="10" fill="#c62828"/>
        <path d="M102 98 Q110 88 120 98 Q130 88 140 98 Q150 88 158 98 Q150 108 130 104 Q110 108 102 98 Z" fill="#fff"/>
        ${dot(108, 118, 3, '#8d5524')}${dot(152, 116, 3, '#8d5524')}${dot(138, 124, 2.5, '#8d5524')}
        ${arms}${legs}
        <rect x="56" y="180" width="148" height="44" rx="4" fill="#fafafa" transform="rotate(4 130 200)"/>
        ${txt(130, 210, 20, 'DAILY NEWS')}
        <circle cx="64" cy="190" r="13" fill="${skin}"/><circle cx="196" cy="190" r="13" fill="${skin}"/>`);
    },

    // ----- ketchup level -----
    fries: (sauce) => {
      const stick = (x, r, h) => `<rect x="${x}" y="${70 - h}" width="16" height="${h + 20}" rx="4" fill="#ffd54f" transform="rotate(${r} ${x + 8} 80)"/>`;
      return svg('0 0 260 170', `
        <ellipse cx="130" cy="150" rx="124" ry="20" fill="#fff"/>
        ${stick(78, -14, 50)}${stick(98, -4, 64)}${stick(118, 6, 54)}${stick(138, -8, 70)}${stick(158, 10, 58)}${stick(170, 18, 44)}
        ${sauce ? `<path d="M88 36 Q96 10 120 18 Q132 0 150 14 Q176 8 176 34 Q186 50 170 56 Q166 74 158 62 Q146 70 130 58 Q116 72 112 56 Q90 62 88 36 Z" fill="#d32f2f"/>
          <path d="M108 26 Q116 20 126 24" fill="none" stroke="#ff8a80" stroke-width="5"/>` : ''}
        <path d="M70 62 L190 62 L176 152 L84 152 Z" fill="#e53935"/>
        <path d="M72 72 L188 72" stroke="#fff" stroke-width="5"/>
        ${dot(114, 104, 6)}${dot(146, 104, 6)}${cheeks(104, 156, 120, 7)}
        ${sauce ? '<path d="M114 120 Q130 140 146 120 Z" fill="#c62828"/>' : '<path d="M118 124 Q130 116 142 124" fill="none"/>'}`);
    },
    bottle: (col, label, fs, face) => svg('0 0 100 230', `
      <path d="M44 4 L56 4 L60 22 L40 22 Z" fill="#fff"/>
      <rect x="28" y="20" width="44" height="28" rx="6" fill="#fff"/>
      <path d="M30 48 L70 48 Q94 70 92 110 L90 206 Q90 224 72 224 L28 224 Q10 224 10 206 L8 110 Q6 70 30 48 Z" fill="${col}"/>
      <path d="M22 100 Q22 76 34 66" fill="none" stroke="#fff" stroke-width="6" opacity=".55"/>
      <rect x="13" y="128" width="74" height="64" rx="12" fill="#fff8e1"/>
      ${txt(50, 170, fs, label)}
      ${face === 'sad' ? dot(36, 106, 5) + dot(64, 106, 5) + '<path d="M42 122 Q50 116 58 122" fill="none" stroke-width="3"/>'
        : dot(36, 106, 5) + dot(64, 106, 5) + '<path d="M42 116 Q50 124 58 116" fill="none" stroke-width="3"/>'}`),

    // ----- grandpa & tv level -----
    sideTable: () => svg('0 0 150 130', `
      <rect x="22" y="20" width="12" height="104" fill="#8d6e63"/><rect x="116" y="20" width="12" height="104" fill="#8d6e63"/>
      <rect x="6" y="8" width="138" height="18" rx="6" fill="#a1887f"/><path d="M28 80 h94" stroke-width="5"/>`),
    alarm: (ring) => svg('0 0 110 120', `
      <path d="M30 102 l-12 14 M80 102 l12 14" stroke-width="6"/>
      <circle cx="22" cy="24" r="16" fill="#ffd23f"/><circle cx="88" cy="24" r="16" fill="#ffd23f"/>
      <circle cx="55" cy="66" r="44" fill="#e53935"/><circle cx="55" cy="66" r="34" fill="#fff"/>
      <path d="M55 66 V42 M55 66 L72 74" stroke-width="5"/>${dot(55, 66, 4)}
      <rect x="49" y="12" width="12" height="12" rx="3" fill="#e53935"/>
      ${ring ? '<path d="M2 50 l-10 -6 M2 70 h-12 M108 50 l10 -6 M108 70 h12 M8 10 l-8 -8 M102 10 l8 -8" stroke-width="5"/>' : ''}`),
    sofa: (awake) => svg('0 0 380 270', `
      <rect x="30" y="246" width="18" height="20" fill="#5d4037"/><rect x="332" y="246" width="18" height="20" fill="#5d4037"/>
      <rect x="20" y="40" width="340" height="170" rx="40" fill="#7cb342"/>
      <path d="M190 52 V170" stroke="#689f38" stroke-width="5"/>
      <rect x="126" y="112" width="128" height="104" rx="30" fill="#8d6e63"/>
      <path d="M190 116 V206" stroke="#6d4c41" stroke-width="4"/>${dot(180, 140, 4, '#ffd23f')}${dot(180, 170, 4, '#ffd23f')}
      ${awake ? `<g>
          <circle cx="190" cy="78" r="46" fill="${skin}"/>
          <circle cx="144" cy="82" r="10" fill="${skin}"/><circle cx="236" cy="82" r="10" fill="${skin}"/>
          <path d="M148 64 Q140 44 156 38 M232 64 Q240 44 224 38" fill="#fff" stroke-width="4"/>
          <circle cx="172" cy="78" r="11" fill="#fff"/><circle cx="208" cy="78" r="11" fill="#fff"/>${dot(172, 80, 5)}${dot(208, 80, 5)}
          <path d="M158 58 l24 8 M222 58 l-24 8" stroke-width="5"/>
          <path d="M156 34 Q190 22 224 34" fill="none" stroke-width="3"/>
          <rect x="160" y="28" width="26" height="14" rx="6" fill="#bbdefb" stroke-width="3"/><rect x="194" y="28" width="26" height="14" rx="6" fill="#bbdefb" stroke-width="3"/>
          <path d="M174 104 Q190 92 206 104 Q190 116 174 104 Z" fill="#c62828"/>
          <path d="M174 92 Q190 84 206 92" fill="none" stroke="#fff" stroke-width="7"/>
        </g>` : `<g transform="rotate(-14 190 110)">
          <circle cx="190" cy="80" r="46" fill="${skin}"/>
          <circle cx="144" cy="84" r="10" fill="${skin}"/><circle cx="236" cy="84" r="10" fill="${skin}"/>
          <path d="M148 66 Q140 46 156 40 M232 66 Q240 46 224 40" fill="#fff" stroke-width="4"/>
          <path d="M162 80 q10 8 20 0 M198 80 q10 8 20 0" fill="none"/>
          <path d="M156 36 Q190 24 224 36" fill="none" stroke-width="3"/>
          <rect x="160" y="30" width="26" height="14" rx="6" fill="#bbdefb" stroke-width="3"/><rect x="194" y="30" width="26" height="14" rx="6" fill="#bbdefb" stroke-width="3"/>
          <path d="M174 94 Q190 86 206 94" fill="none" stroke="#fff" stroke-width="7"/>
          <ellipse cx="190" cy="108" rx="10" ry="12" fill="#c62828"/>
        </g>`}
      <rect x="0" y="120" width="70" height="130" rx="28" fill="#689f38"/><rect x="310" y="120" width="70" height="130" rx="28" fill="#689f38"/>
      <rect x="54" y="190" width="272" height="64" rx="20" fill="#8bc34a"/>
      <path d="M190 194 V250" stroke="#689f38" stroke-width="5"/>
      <rect x="140" y="200" width="36" height="34" rx="12" fill="#546e7a"/><rect x="204" y="200" width="36" height="34" rx="12" fill="#546e7a"/>
      <ellipse cx="156" cy="246" rx="24" ry="12" fill="#5d4037"/><ellipse cx="224" cy="246" rx="24" ry="12" fill="#5d4037"/>
      ${awake ? '' : txt(286, 40, 40, 'Z') + txt(316, 14, 30, 'z') + txt(338, -6, 22, 'z')}`),
    tv: (on) => svg('0 0 200 260', `
      <path d="M100 42 L64 2 M100 42 L140 6" stroke-width="4"/>${dot(64, 2, 6, ink)}${dot(140, 6, 6, ink)}
      <rect x="28" y="168" width="144" height="84" rx="8" fill="#a1887f"/>
      <rect x="44" y="186" width="112" height="22" rx="6" fill="#bcaaa4" stroke-width="3"/><rect x="44" y="218" width="112" height="22" rx="6" fill="#bcaaa4" stroke-width="3"/>
      ${on ? '<path d="M-4 70 l-12 -6 M-4 100 h-14 M-4 130 l-12 6" stroke="#ffd23f" stroke-width="5"/>' : ''}
      <rect x="6" y="40" width="188" height="132" rx="16" fill="#546e7a"/>
      <rect x="20" y="54" width="132" height="104" rx="12" fill="${on ? '#81d4fa' : '#263238'}"/>
      ${on ? `<circle cx="122" cy="80" r="14" fill="#ffd23f" stroke-width="3"/>
        <path d="M22 140 Q60 108 100 128 Q130 116 150 128 L150 150 Q150 156 144 156 L28 156 Q22 156 22 150 Z" fill="#7bd389" stroke-width="3"/>
        <ellipse cx="62" cy="96" rx="16" ry="10" fill="#ff8a65" stroke-width="3"/><path d="M46 96 l-10 -8 v16 Z" fill="#ff8a65" stroke-width="3"/>${dot(68, 94, 2.5)}`
        : '<path d="M40 70 L60 60 M40 90 L82 64" stroke="#546e7a" stroke-width="6"/>'}
      <circle cx="172" cy="80" r="9" fill="#cfd8dc"/><circle cx="172" cy="110" r="9" fill="#cfd8dc"/>
      ${on ? '' : '<circle cx="172" cy="140" r="5" fill="#e53935" stroke-width="2"/>'}`),

    // ----- nesting dolls level -----
    doll: (col) => svg('0 0 100 150', `
      <path d="M50 4 C76 4 84 30 76 52 C96 74 98 128 88 144 L12 144 C2 128 4 74 24 52 C16 30 24 4 50 4 Z" fill="${col}"/>
      <ellipse cx="50" cy="36" rx="20" ry="18" fill="#ffe0c2"/>
      <path d="M30 32 Q34 16 50 18 Q66 16 70 32 Q60 24 50 26 Q40 24 30 32 Z" fill="#8d5524" stroke-width="3"/>
      ${dot(42, 38, 3)}${dot(58, 38, 3)}${cheeks(37, 63, 45, 4)}
      <path d="M45 46 Q50 50 55 46" fill="none" stroke-width="3"/>
      <ellipse cx="50" cy="104" rx="27" ry="31" fill="#fff8e1" stroke-width="3"/>
      <circle cx="50" cy="100" r="9" fill="${col}" stroke-width="3"/>${dot(50, 100, 3, '#ffd23f')}
      <path d="M40 116 q10 8 20 0" fill="none" stroke="#7bd389" stroke-width="4"/>`),
    toybox: () => svg('0 0 230 170', `
      <path d="M14 40 L40 4 L190 4 L216 40" fill="#0288d1"/>
      <rect x="6" y="40" width="218" height="124" rx="10" fill="#4fc3f7"/>
      <path d="M6 58 h218" stroke-width="4"/>
      ${txt(115, 126, 54, 'TOYS', '#fff', 'stroke="#2b2b2b" stroke-width="3" paint-order="stroke"')}
      <path d="M30 90 l5 10 l11 1 l-8 7 l3 11 l-11 -6 l-10 6 l3 -11 l-8 -7 l11 -1 Z" fill="#ffd23f" stroke-width="2"/>
      <path d="M196 90 l5 10 l11 1 l-8 7 l3 11 l-11 -6 l-10 6 l3 -11 l-8 -7 l11 -1 Z" fill="#ffd23f" stroke-width="2"/>`),

    // ----- thirsty plant level -----
    window: () => {
      let rain = '';
      for (let i = 0; i < 22; i++) {
        const x = 36 + ((i * 53) % 236), y = 40 + ((i * 41) % 150);
        rain += `<path d="M${x} ${y} l-6 20" stroke="#bbdefb" stroke-width="5"/>`;
      }
      return svg('0 0 300 270', `
        <defs><clipPath id="p2-rainclip"><rect x="26" y="26" width="248" height="210" rx="4"/></clipPath></defs>
        <rect x="10" y="10" width="280" height="240" rx="8" fill="#fff"/>
        <rect x="26" y="26" width="248" height="210" rx="4" fill="#78909c"/>
        <g clip-path="url(#p2-rainclip)">
          <g>${rain}<g transform="translate(0 -150)">${rain}</g>
            <animateTransform attributeName="transform" type="translate" from="0 0" to="0 150" dur="0.9s" repeatCount="indefinite"/></g>
          <path d="M20 70 Q30 40 64 48 Q80 22 112 36 Q136 22 152 46 Q178 40 180 66 Q160 80 120 72 Q80 84 20 70 Z" fill="#b0bec5"/>
          <path d="M150 52 Q170 26 204 38 Q230 24 250 46 Q284 46 280 76 Q240 88 200 78 Q170 84 150 52 Z" fill="#cfd8dc"/>
        </g>
        <rect x="26" y="26" width="248" height="62" fill="#b3e5fc" fill-opacity=".35" stroke-width="3"/>
        <rect x="18" y="80" width="264" height="14" rx="4" fill="#fff"/>
        <rect x="0" y="236" width="300" height="22" rx="6" fill="#fff"/>
        <path d="M2 6 Q30 120 8 250 L-14 250 L-14 6 Z" fill="#f48fb1"/><path d="M298 6 Q270 120 292 250 L314 250 L314 6 Z" fill="#f48fb1"/>`);
    },
    plant: (happy) => svg('0 0 140 180', `
      ${happy ? `<path d="M70 112 V40" stroke="#388e3c" stroke-width="6"/>
          <path d="M70 90 Q30 86 22 54 Q56 54 70 84 Z M70 76 Q110 70 120 40 Q86 42 70 70 Z M70 100 Q36 104 26 86 Q50 80 70 96 Z" fill="#66bb6a"/>
          <g>${[0, 72, 144, 216, 288].map((r) => `<ellipse cx="70" cy="18" rx="11" ry="16" fill="#f06292" transform="rotate(${r} 70 34)"/>`).join('')}
          <circle cx="70" cy="34" r="10" fill="#ffd23f"/></g>
          <path d="M18 8 l-3 9 M118 4 l-3 9 M34 -10 l-3 9 M104 -14 l-3 9" stroke="#4fc3f7" stroke-width="4"/>`
        : `<path d="M70 110 Q62 62 84 36 Q102 24 110 46" fill="none" stroke="#7c8b3c" stroke-width="6"/>
          <path d="M110 44 Q128 64 116 90 Q100 70 110 44 Z" fill="#a5b35a"/>
          <path d="M68 86 Q38 80 26 104 Q54 108 68 90 Z" fill="#a5b35a"/>
          <path d="M70 62 Q42 50 30 70 Q52 82 70 66 Z" fill="#b5b860"/>`}
      <path d="M26 110 L114 110 L104 174 L36 174 Z" fill="#e07a4f"/>
      <rect x="18" y="104" width="104" height="18" rx="5" fill="#ef8f63"/>
      ${dot(56, 140, 5)}${dot(84, 140, 5)}
      ${happy ? cheeks(46, 94, 152, 6) + '<path d="M60 152 Q70 162 80 152" fill="none" stroke-width="3"/>'
        : '<path d="M60 160 Q70 152 80 160" fill="none" stroke-width="3"/><path d="M92 132 q-4 8 0 12 q4 -4 0 -12z" fill="#6ec6ff" stroke-width="2"/>'}`),
    plantTable: () => svg('0 0 240 120', `
      <rect x="30" y="16" width="14" height="100" fill="#8d6e63"/><rect x="196" y="16" width="14" height="100" fill="#8d6e63"/>
      <rect x="6" y="4" width="228" height="20" rx="6" fill="#bcaaa4"/>`),
    can: () => svg('0 0 170 120', `
      <path d="M118 52 L162 20 L168 30 L126 66" fill="#43a047"/>
      <rect x="156" y="12" width="14" height="22" rx="4" fill="#2e7d32" transform="rotate(-36 163 23)"/>
      <path d="M44 30 Q46 2 76 4 Q104 6 104 30" fill="none" stroke-width="10"/><path d="M44 30 Q46 2 76 4 Q104 6 104 30" fill="none" stroke="#43a047" stroke-width="4"/>
      <rect x="20" y="30" width="110" height="84" rx="16" fill="#66bb6a"/>
      <path d="M34 50 Q34 40 44 38" fill="none" stroke="#fff" stroke-width="5" opacity=".6"/>
      <circle cx="108" cy="98" r="6" fill="${ink}"/><path d="M98 90 l-5 -4 M116 90 l5 -4 M100 108 l-5 4" stroke-width="3"/>
      ${dot(56, 66, 4)}${dot(80, 66, 4)}<path d="M60 84 Q68 78 76 84" fill="none" stroke-width="3"/>`),
  };

  LEVELS.push(
    // ---------- 12: plug it in ----------
    {
      id: 'toaster',
      q: ['Make some toast!'],
      hint: 'The toaster looks sleepy. Where does it get its energy?',
      answer: 'Plug the toaster into the wall socket, then press it.',
      setup(a) {
        a.stage.style.background = 'linear-gradient(#fff3e0 0 330px, #8d5a34 330px 338px, #c48a5c 338px)';
        const cord = a.put('', 0, 0, 960, 440, { z: 3 });
        cord.style.pointerEvents = 'none';
        const st = { down: false, light: false, face: 'sleep', toast: false };
        const toaster = a.put(P2.toaster(st), 300, 132, 240, 200, { z: 4 });
        const socket = a.put(P2.socket(), 760, 120, 100, 100, { z: 2 });
        const plug = a.put(P2.plug(false), 620, 290, 80, 60, { z: 5 });
        const jam = a.put(P2.jam(), 110, 222, 100, 120, { z: 4 });
        let plugged = false, busy = false;
        const drawCord = () => {
          const p = a.box(plug);
          const ex = plugged ? p.cx : p.x + 6, ey = plugged ? p.cy : p.y + 30;
          const sag = Math.max(310, ey) + 70;
          cord.innerHTML = svg('0 0 960 440', `<path d="M500 300 C 560 ${sag}, ${ex - 80} ${sag}, ${ex} ${ey}" fill="none" stroke="#424242" stroke-width="7"/>`);
        };
        const draw = (o) => { Object.assign(st, o); toaster.innerHTML = P2.toaster(st); };
        drawCord();
        a.drag(plug, {
          onMove: drawCord,
          onTap: () => a.say('Plug me in?', a.box(plug).cx, a.box(plug).y),
          onDrop(el, back) {
            if (plugged || !a.over(el, socket)) { back(); return drawCord(); }
            plugged = true;
            const s = a.box(socket);
            Object.assign(el.style, { left: s.cx - 30 + 'px', top: s.cy - 30 + 'px', width: '60px', height: '60px' });
            el.innerHTML = P2.plug(true);
            drawCord();
            draw({ face: 'awake' });
            a.say('Bzzt!', s.cx, s.y);
          },
        });
        a.tap(toaster, () => {
          if (busy) return;
          busy = true;
          if (!plugged) {
            draw({ down: true });
            a.wrong(toaster);
            a.say('Click… nothing.', 420, 120);
            setTimeout(() => { draw({ down: false }); busy = false; }, 500);
            return;
          }
          draw({ down: true, light: true });
          a.say('Toasting…', 420, 120);
          setTimeout(() => {
            if (a.done) return;
            draw({ down: false, light: false, toast: true, face: 'happy' });
            a.say('DING!', 420, 70);
            a.win('Ding! Golden toast!');
          }, 1000);
        });
        a.tap(jam, () => { a.wrong(jam); a.say('Toast first!', 160, 222); });
      },
    },

    // ---------- 13: follow the clue ----------
    {
      id: 'cakethief',
      q: ['Who ate the cake?'],
      hint: 'Cake thieves are messy. Follow the evidence.',
      answer: 'Dad, hiding behind the newspaper — follow the crumbs!',
      setup(a) {
        a.stage.style.background = 'linear-gradient(#e8f4ea 0 330px, #b7895c 330px 336px, #d7b48a 336px)';
        const trail = a.put(P2.crumbs(), 0, 0, 960, 440, { z: 1 });
        trail.style.pointerEvents = 'none';
        const table = a.put(P2.table(), 40, 210, 220, 160, { z: 2 });
        a.tap(table, () => a.say('Only crumbs left…', 150, 210));
        const boy = a.put(P2.boy(), 290, 110, 140, 270, { z: 2 });
        a.tap(boy, () => { a.wrong(boy); a.say('Not me!', 360, 110); });
        const dog = a.put(P2.dog(), 460, 250, 160, 140, { z: 2 });
        a.tap(dog, () => { a.wrong(dog); a.say('Woof?', 520, 250); });
        const dad = a.put(P2.reader(false), 670, 90, 260, 300, { z: 2 });
        a.tap(dad, () => {
          dad.innerHTML = P2.reader(true);
          a.say('Uh-oh… busted!', 800, 90);
          a.win('Caught with cream on his face!');
        });
      },
    },

    // ---------- 14: upside down + whack it ----------
    {
      id: 'ketchup',
      q: ['Put ketchup on the fries.'],
      hint: 'Ever fought a ketchup bottle? Turn it the right way and be firm.',
      answer: 'Drag the ketchup over the fries (it flips), then tap it a few times.',
      setup(a) {
        a.stage.style.background = 'linear-gradient(#e0f7fa 0 316px, #c8553d 316px 324px, #ef8354 324px)';
        const fries = a.put(P2.fries(false), 250, 236, 260, 170, { z: 2 });
        a.tap(fries, () => { a.wrong(fries); a.say('So dry…', 380, 240); });
        const ketchup = a.put(P2.bottle('#e53935', 'KETCHUP', 17, 'sad'), 640, 86, 100, 230, { z: 3 });
        const mustard = a.put(P2.bottle('#ffca28', 'MUSTARD', 17, 'happy'), 790, 110, 90, 207, { z: 3 });
        let flipped = false, hits = 0;
        const lines = ['Thwack!', 'Come on…', 'Almost!', 'Blorp…'];
        a.drag(ketchup, {
          z: 6, keepZ: true,
          onTap(el) {
            el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
            if (!flipped) return a.say('Nothing comes out…', 690, 86);
            hits++;
            if (hits < 5) return a.say(lines[hits - 1], 530, 100);
            fries.innerHTML = P2.fries(true);
            Object.assign(el.style, { transition: 'left .4s, top .4s, transform .4s', left: '560px', top: '86px', transform: 'rotate(0deg)' });
            el.innerHTML = P2.bottle('#e53935', 'KETCHUP', 17, 'happy');
            a.say('SPLAT!', 380, 230);
            a.win('SPLAT! Perfect fries.');
          },
          onDrop(el, back) {
            if (flipped || !a.over(el, fries)) return back();
            flipped = true;
            Object.assign(el.style, { left: '330px', top: '18px', transform: 'rotate(180deg)', zIndex: 6 });
            a.say('Upside down!', 530, 100);
          },
        });
        a.drag(mustard, {
          onTap: () => { a.wrong(mustard); a.say('Not me!', 835, 110); },
          onDrop(el, back) {
            if (a.over(el, fries)) { a.wrong(fries); a.say('Ketchup, please!', 380, 240); }
            back();
          },
        });
      },
    },

    // ---------- 15: the grandpa alarm ----------
    {
      id: 'tvnap',
      q: ['Wake up Grandpa!'],
      hint: 'Grandpa insists he\'s not asleep. He\'s "just watching TV".',
      answer: 'Turn off the TV — "Hey! I was watching that!"',
      setup(a) {
        a.stage.style.background = 'linear-gradient(#f6e3c6 0 340px, #8a6448 340px 346px, #a3785a 346px)';
        a.put(P2.sideTable(), 70, 256, 150, 130, { z: 1 });
        const clock = a.put(P2.alarm(false), 90, 150, 110, 120, { z: 2 });
        a.tap(clock, () => {
          clock.innerHTML = P2.alarm(true);
          a.wrong(clock);
          a.say('RIIING!', 145, 150);
          setTimeout(() => { clock.innerHTML = P2.alarm(false); a.say('Zzz…', 470, 120); }, 700);
        });
        const gramps = a.put(P2.sofa(false), 270, 120, 380, 270, { z: 2 });
        a.tap(gramps, () => { a.wrong(gramps); a.say('Snrrk… 5 more mins…', 460, 130); });
        const tv = a.put(P2.tv(true), 710, 128, 200, 260, { z: 2 });
        a.tap(tv, () => {
          tv.innerHTML = P2.tv(false);
          gramps.innerHTML = P2.sofa(true);
          a.say('Hey! I was watching that!', 460, 110);
          a.win('Works every time!');
        });
      },
    },

    // ---------- 16: dolls inside dolls ----------
    {
      id: 'nesting',
      q: ['Put all the dolls in the toy box.'],
      hint: 'The box is small, but these dolls have a hollow secret.',
      answer: 'Put each doll inside a bigger one, then the big doll goes in the box.',
      setup(a) {
        a.stage.style.background = 'linear-gradient(#fde2e4 0 350px, #c9a27e 350px 356px, #e0c097 356px)';
        const specs = [[230, 40, '#e53935'], [130, 236, '#42a5f5'], [175, 368, '#66bb6a'], [95, 530, '#ffca28']];
        const dolls = specs.map(([h, x, col]) => {
          const w = Math.round(h * 0.66);
          const el = a.put(P2.doll(col), x, 404 - h, w, h, { z: 3 });
          return { el, h, out: true };
        });
        const box = a.put(P2.toybox(), 690, 244, 230, 170, { z: 8 });
        const outside = () => dolls.filter((d) => d.out);
        for (const d of dolls) {
          a.drag(d.el, {
            onTap(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); a.say('Hehe!', a.box(el).cx, a.box(el).y); },
            onDrop(el, back) {
              const target = outside().find((e) => e !== d && a.over(el, e.el));
              if (target) {
                if (target.h < d.h) { a.wrong(target.el); a.say('Too big!', a.box(target.el).cx, a.box(target.el).y); return back(); }
                d.out = false;
                el.style.display = 'none';
                Sfx.play('pop');
                a.say('Click!', a.box(target.el).cx, a.box(target.el).y);
                return;
              }
              if (a.over(el, box)) {
                if (outside().length > 1) { a.wrong(box); a.say('Only room for one!', 805, 240); return back(); }
                const B = a.box(box), w = parseFloat(el.style.width);
                Object.assign(el.style, { left: B.cx - w / 2 + 'px', top: B.y + 70 - d.h * 0.55 + 'px', zIndex: 4 });
                return a.win('All four, snug as a bug!');
              }
              back();
            },
          });
        }
      },
    },

    // ---------- 17: look out the window ----------
    {
      id: 'thirsty',
      q: ['The plant is thirsty. Help it!'],
      hint: 'Is there any other water in this picture?',
      answer: 'Put the plant out of the window — it\'s raining!',
      setup(a) {
        a.stage.style.background = 'linear-gradient(#e3f0f7 0 356px, #a98462 356px 362px, #c9a27e 362px)';
        const win = a.put(P2.window(), 610, 24, 300, 270, { z: 1 });
        a.tap(win, () => a.say('Pitter-patter…', 760, 64));
        a.put(P2.plantTable(), 60, 290, 240, 120, { z: 1 });
        const plant = a.put(P2.plant(false), 110, 116, 140, 180, { z: 3 });
        const can = a.put(P2.can(), 380, 300, 170, 120, { z: 4 });
        a.drag(plant, {
          onTap: () => a.say('So… thirsty…', 180, 116),
          onDrop(el, back) {
            if (!a.over(el, win)) return back();
            const W = a.box(win);
            Object.assign(el.style, { left: W.cx - 70 + 'px', top: W.y + 236 - 172 + 'px' });
            el.innerHTML = P2.plant(true);
            a.say('Ahhh!', W.cx, W.y + 40);
            a.win('Free water from the sky!');
          },
        });
        a.drag(can, {
          onTap: () => { a.wrong(can); a.say('I\'m empty!', 465, 300); },
          onDrop(el, back) {
            if (a.over(el, plant)) { a.wrong(el); a.say('Drip… it has a hole!', 180, 116); }
            back();
          },
        });
      },
    },
  );
}
