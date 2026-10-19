// Flavour content: guest quotes, special-night scripts, near-miss lines.
// docs/design/03-content.md §3, §4, §5. Guest.quote is an index into QUOTES.

import { QUOTE_COUNT } from '../engine/traits.js';

/** 60 rule-neutral quotes (each ≤ 8 words). Index = Guest.quote. */
export const QUOTES = [
  'I know the DJ. Personally.',
  'My cousin is on the list.',
  "I've been practicing my dance moves.",
  'Is this the line for fun?',
  'I brought exact change. For nothing.',
  "My mom said I'm cool.",
  "I'm basically famous in my building.",
  "Please, I've waited all week.",
  'I only dance on Tuesdays.',
  'Do you validate parking? For bikes?',
  "I'm here for the vibes.",
  'I wore my lucky socks.',
  'Is the floor sticky? Asking for me.',
  'I can moonwalk. Badly.',
  'You have kind eyebrows.',
  'I rehearsed this in the mirror.',
  "My horoscope said tonight's the night.",
  "I'm not nervous. You're nervous.",
  "I've never been rejected. Ever. Today.",
  'Can I just peek inside?',
  "I'm the plus-one of a plus-one.",
  'Nice door. Very door-like.',
  "I've got a good feeling about this.",
  'Do you like jokes? I have three.',
  'My grandma got in last week.',
  "I'll be quiet. Mostly.",
  "I've been told I'm delightful.",
  'Is there a secret handshake?',
  'I brought my best smile.',
  "I'm only here to stand nearby.",
  'My robot vacuum believes in me.',
  'I came all the way from next door.',
  'Is this where the party lives?',
  "Psst. What's the password?",
  "I'm the mystery guest. Surprise!",
  "I dance like nobody's paying attention.",
  "I've waited in line since breakfast.",
  "I promise I'm not three raccoons.",
  'Will there be confetti?',
  'I wrote you a tiny poem.',
  'My shoes are new. Be gentle.',
  "Hi! I'm extremely normal.",
  "I've heard the music is loud.",
  'Can my shadow come too?',
  "I'm on a very important mission.",
  'This is my best outfit. Probably.',
  'I can do the worm.',
  'My goldfish says hello.',
  "Please, it's my un-birthday.",
  "I searched 'how to look cool.'",
  "I'm just here for the music.",
  'One dance. Then I leave. Maybe.',
  'Do I look like a winner?',
  'My aunt owns a very nice spoon.',
  'I trust your judgment completely.',
  "I've been here before. In a dream.",
  "Let me in, I'm hilarious.",
  "I've got rhythm. Somewhere.",
  "I'll tell everyone you're awesome.",
  'Whatever happens, I respect you.',
];

if (QUOTES.length !== QUOTE_COUNT) {
  // Contract guard; tests also check this.
  throw new Error(`QUOTES has ${QUOTES.length}, expected ${QUOTE_COUNT}`);
}

/** Quote text for a guest (special guests have their own line). */
export function quoteFor(guest) {
  if (guest?.special && SPECIAL[guest.special]) return SPECIAL[guest.special].quote;
  return QUOTES[guest?.quote] ?? '';
}

/**
 * Special-night scripts (plan §2: Boss in Disguise c1s9, Dog in a Trench Coat c2s9).
 * The intro line is the on-screen clue, shown before the trick guest arrives.
 * `introKey` matches Level.intro (a strings.en key) when WP-A sets it.
 */
export const SPECIAL = {
  boss: {
    club: 1,
    shift: 9,
    introKey: 'special.boss.intro',
    intro: 'Rule one: never turn away the boss.',
    name: 'Sug',
    face: '🥸',
    quote: "I definitely don't own this place.",
    right: 'You saw right through me!',
    wrong: "Hey! It's me, Gus! Rule one, buddy.",
    label: true, // ADMIT
  },
  trenchcoat: {
    club: 2,
    shift: 9,
    introKey: 'special.trenchcoat.intro',
    intro: 'Darling... not every guest... is what they seem.',
    name: 'Definitely Steve',
    coat: '🧥',
    glasses: '🕶️',
    reveal: '🐶',
    quote: 'I am one tall human. Woof. I mean hi.',
    tap: 'Tap the coat',
    right: 'A dog in a coat! Nicely spotted, darling.',
    wrong: 'Darling... that was a dog. In a coat.',
    label: false, // REJECT
  },
};

/** Intro lines for special nights, keyed by special id. */
export const SPECIAL_INTROS = Object.fromEntries(Object.entries(SPECIAL).map(([k, v]) => [k, v.intro]));

/** Fired-screen near-miss lines. {n} = guests short of a win. */
export const NEAR_MISS = {
  1: '1 more and you had it!',
  2: 'So close! Just 2 more.',
  many: 'You were {n} good calls from clearing it.',
};

/** @param {number} n guests short of a win (from state.nearMiss().toWin) */
export function nearMissLine(n) {
  const k = Math.max(1, n | 0);
  const s = NEAR_MISS[k] ?? NEAR_MISS.many;
  return s.replace('{n}', String(k));
}

/** Light reactions for rejected / admitted guests (never humiliating, 03 §5). */
export const REJECT_REACTIONS = ['Aw, next time!', 'Off to the 🍦 cart!', '*happy shrug*', 'Fair enough!'];
export const ADMIT_REACTIONS = ['Woo!', 'Yes! 🥳', 'Dance time!', 'Thank you!'];
