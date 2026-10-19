// The 6 clubs (docs/design/03-content.md §1). English text lives here directly;
// it is flavour copy, not UI chrome. Quips stay under 10 words (03 §5).
//
// colors: bg = main background, accent = neon/trim, door = door fill,
//         text = readable text on bg.

/**
 * @typedef {Object} Club
 * @property {number} id
 * @property {string} key
 * @property {string} name
 * @property {number} tier
 * @property {{name:string, emoji:string, blurb:string}} manager
 * @property {{bg:string, accent:string, door:string, text:string}} colors
 * @property {string[]} decor
 * @property {{intro:string, praise:string, scold:string, fired:string, win:string}} quips
 * @property {string} fairGuess  line for a forgiven (lenient) wrong call
 */

/** @type {Club[]} */
export const CLUBS = [
  {
    id: 1,
    key: 'juicebox',
    name: 'The Juice Box',
    tier: 1,
    manager: { name: 'Gus', emoji: '🐻', blurb: 'A big soft bear who takes his clipboard very seriously.' },
    colors: { bg: '#FF9F1C', accent: '#FFE66D', door: '#FFF3D6', text: '#2B1A00' },
    decor: ['🧃', '🍊', '🪩'],
    quips: {
      intro: 'Watch me work. Then you try.',
      praise: 'Beautiful. I might cry into my juice.',
      scold: 'Nope! Did you even look?',
      fired: 'Hand back the clipboard, buddy.',
      win: "You're a natural! Go tell the Snail.",
    },
    fairGuess: "Fair guess! Here's the rule-book page.",
  },
  {
    id: 2,
    key: 'discosnail',
    name: 'Disco Snail',
    tier: 2,
    manager: { name: 'Madame Shelly', emoji: '🐌', blurb: 'Very slow, very fabulous, never rushes a decision.' },
    colors: { bg: '#7B2CBF', accent: '#FF5DA2', door: '#3C1361', text: '#FFFFFF' },
    decor: ['🐌', '🪩', '✨'],
    quips: {
      intro: 'Darling... take... your... time.',
      praise: 'Exquisite. Like a perfect slow dance.',
      scold: 'Ugh. I felt that in my shell.',
      fired: 'Off you glide, sweetie.',
      win: 'Fabulous! The Burrow needs you.',
    },
    fairGuess: "Fair guess, darling! Here's the rule-book page.",
  },
  {
    id: 3,
    key: 'velvetburrow',
    name: 'The Velvet Burrow',
    tier: 3,
    manager: { name: 'Professor Hops', emoji: '🐰', blurb: 'A rabbit accountant who counts everything twice.' },
    colors: { bg: '#1B4332', accent: '#D4A017', door: '#2D6A4F', text: '#F5F0E1' },
    decor: ['🐇', '🕯️', '🔢'],
    quips: {
      intro: 'Numbers never lie. Count carefully.',
      praise: 'Correct! Carry the one!',
      scold: 'Wrong. Did you count on your ears?',
      fired: "You're subtracted. Goodbye.",
      win: 'Perfect score. Noodles await.',
    },
    fairGuess: "Fair guess! Here's the rule-book page. Page one.",
  },
  {
    id: 4,
    key: 'neonnoodle',
    name: 'Neon Noodle',
    tier: 4,
    manager: { name: 'Chef Twirl', emoji: '🐙', blurb: 'An octopus who does eight things at once and expects you to do two.' },
    colors: { bg: '#111111', accent: '#00F5D4', door: '#F15BB5', text: '#FFFFFF' },
    decor: ['🍜', '🏮', '🥢'],
    quips: {
      intro: 'Two rules, one door. Keep up!',
      praise: "Delicious call. Chef's kiss times eight.",
      scold: 'You forgot half the recipe!',
      fired: "You're overcooked. Out!",
      win: 'Impressive. The Lodge sent an invitation.',
    },
    fairGuess: "Fair guess! Here's the recipe page.",
  },
  {
    id: 5,
    key: 'riddlelodge',
    name: 'The Riddle Lodge',
    tier: 5,
    manager: { name: 'Grand Hoot', emoji: '🦉', blurb: 'A secret-society owl who speaks only in whispers and winks.' },
    colors: { bg: '#14213D', accent: '#E9D8A6', door: '#0B132B', text: '#E9D8A6' },
    decor: ['🦉', '🗝️', '📜'],
    quips: {
      intro: 'Here, guests are judged... by each other.',
      praise: 'Hoo. You see what others miss.',
      scold: 'Look again. Look between them.',
      fired: "You're now a former member. Shh.",
      win: "You've earned the Moon key.",
    },
    fairGuess: "Hoo. Fair guess. Here's the secret page.",
  },
  {
    id: 6,
    key: 'moonroom',
    name: 'The Moon Room',
    tier: 6,
    manager: { name: 'Zib', emoji: '👽', blurb: 'A tiny alien who has been to every club in the galaxy and finds Earth adorable.' },
    colors: { bg: '#3C096C', accent: '#C0C0D8', door: '#240046', text: '#F0F0FF' },
    decor: ['🌙', '🪐', '👽'],
    quips: {
      intro: 'Any rule, any time. Ready, Earthling?',
      praise: 'Zibtastic! Earth is lucky to have you.',
      scold: 'Even my moon rock knew that.',
      fired: 'Beaming you home now. Bye!',
      win: "Legend! You run the galaxy's door.",
    },
    fairGuess: "Fair guess, Earthling! Here's the rule-book page.",
  },
];

export const CLUB_IDS = CLUBS.map((c) => c.id);

/** @returns {Club|undefined} */
export function clubById(id) {
  return CLUBS.find((c) => c.id === Number(id));
}

/** Pseudo-club used for the Daily Door header (manager Gus hosts it). */
export const DAILY_CLUB = {
  id: 0,
  key: 'daily',
  name: 'Daily Door',
  tier: 0,
  manager: { name: 'Gus', emoji: '🐻', blurb: 'Same door for everyone today.' },
  colors: { bg: '#222244', accent: '#FFE66D', door: '#FFF3D6', text: '#FFFFFF' },
  decor: ['📅', '🚪', '🔥'],
  quips: {
    intro: 'Same rule for everyone today. Good luck!',
    praise: 'Nice call!',
    scold: 'Oof. Logged it anyway.',
    fired: 'No firing today. Keep going!',
    win: 'Door done! Share your score.',
  },
  fairGuess: "Fair guess! Here's the rule-book page.",
};
