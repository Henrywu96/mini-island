// The people of Quest Town: who they are, how they look, where they hang out and what they say.
//
// mode:   'stroll' wanders between a few spots, 'route' walks a loop of streets, 'post' stays at one spot
// look:   colours and parts for the chibi villager builder (see game/actors/rig.js)
// alt:    the F action next to "Talk" (E)
// dialog: nodes with text and choices. A choice goes `to` another node, runs a town action (`do`) or ends.

export const NPCS = [
  {
    id: 'mayor', name: 'Mayor Maple', role: 'Mayor of Quest Town', color: '#e6a400',
    look: { skin: '#e8b38c', hair: '#d8d2c8', hairStyle: 'bun', top: '#3f4d73', bottom: '#2a3656', shoes: '#3a2a22', hat: 'top', hatColor: '#202b45', acc: ['sash', 'glasses'], sash: '#e6a400' },
    mode: 'stroll', island: 'hub', speed: 1.05,
    spots: [[-1.7, -2.1], [1.9, -2.4], [2.2, 3.4], [-1.9, 4.6], [.6, 5.9], [-4.4, -1.2]],
    alt: { label: 'Shake hands', act: 'handshake' },
    barks: ['Welcome to Quest Town!', 'Have you met everyone yet?', 'Lovely day for a stroll.', 'Mind the hamster, please.'],
    dialog: {
      start: 'hi',
      nodes: {
        hi: { text: "Welcome to Quest Town! I'm Mayor Maple. Henry built this town to show his work, and the rest of us moved in for the scenery.", choices: [{ label: 'Tell me about the town', to: 'town' }, { label: 'Any tasks for me?', do: 'census' }, { label: 'Who is Henry?', to: 'henry' }, { label: 'Show me around', do: 'tour' }, { label: 'Goodbye', end: true }] },
        town: { text: 'Every glowing totem is a project. The golden one in the garden up north is the Bridgly case study. The live sites sit in the market, the LRT park, the Stackyard yard and the showroom. Snacks are by the pond.', next: 'hi' },
        henry: { text: 'A UI/UX designer who likes research, prototypes and his hamster, in that order. Mostly. His Character Sheet is on the desk next to the signpost.', choices: [{ label: 'Open his Character Sheet', do: 'about' }, { label: 'Back', to: 'hi' }] },
      },
    },
  },
  {
    id: 'jules', name: 'Jules', role: 'Street musician', color: '#8b5cf6',
    look: { skin: '#c98d68', hair: '#2c201a', hairStyle: 'curly', top: '#8b5cf6', bottom: '#2a3656', shoes: '#f6f3ee', hat: 'beanie', hatColor: '#ffd166', acc: ['guitar'] },
    mode: 'post', at: [4.4, 4.9], face: [-.85, .5], pose: 'strum',
    alt: { label: 'Tip a coin', act: 'busker' },
    barks: ['♪ Two cities, one heart… ♪', 'Requests welcome!', '♪ La la la… ♪'],
    dialog: {
      start: 'hi',
      nodes: {
        hi: { text: "Requests? I mostly know songs about bridges and long-distance love. Drop a coin in the case and I'll play one.", choices: [{ label: 'Tip a coin', do: 'busker' }, { label: 'How long have you played here?', to: 'gig' }, { label: 'Bye', end: true }] },
        gig: { text: 'Since the first street lamp went up. The dogs are my biggest fans. Well, Mochi is. Bean is more of a critic.', next: 'hi' },
      },
    },
  },
  {
    id: 'mei', name: 'Auntie Mei', role: 'Bubble tea stand', color: '#c98a4b',
    look: { skin: '#f0c4a0', hair: '#1f1a1a', hairStyle: 'bun', top: '#f27b78', bottom: '#3f4d73', shoes: '#2a2a30', acc: ['apron'], apron: '#fff4e6' },
    mode: 'post', at: [-6.35, 16.2], face: [1, 0], pose: 'serve', talkAt: [-4.75, 16.2],
    alt: { label: 'Order bubble tea', act: 'boba' },
    barks: ['Fresh pearls!', 'Brown sugar milk tea, best in town!', 'Boba time!'],
    dialog: {
      start: 'hi',
      nodes: {
        hi: { text: 'Bubble tea, made the Taipei way with fresh tapioca pearls. Henry grew up on this stuff.', choices: [{ label: 'One boba, please', do: 'boba' }, { label: "What's good here?", to: 'menu' }, { label: 'Bye', end: true }] },
        menu: { text: 'Brown sugar milk tea is the classic. Extra pearls give you extra bounce. That part is science, trust me.', next: 'hi' },
      },
    },
  },
  {
    id: 'lin', name: 'Uncle Lin', role: 'Night market cart', color: '#d98c5f',
    look: { skin: '#e3ae86', hair: '#3a3a3a', hairStyle: 'short', top: '#ffffff', bottom: '#2a3656', shoes: '#2a2a30', hat: 'cap', hatColor: '#ec6a4e', acc: ['apron'], apron: '#ec6a4e' },
    mode: 'post', at: [6.35, 16.2], face: [-1, 0], pose: 'cook', talkAt: [4.75, 16.2],
    alt: { label: 'Buy a scallion pancake', act: 'snack' },
    barks: ['Scallion pancakes, hot off the griddle!', 'Crispy and chewy!', 'Night market snacks here!'],
    dialog: {
      start: 'hi',
      nodes: {
        hi: { text: 'Scallion pancakes! Crispy outside, chewy inside. Like a good design critique.', choices: [{ label: "I'll take one", do: 'snack' }, { label: 'A night market, here?', to: 'market' }, { label: 'Bye', end: true }] },
        market: { text: 'In Taipei the night markets glow until midnight. Here I get the pond, the ducks and a poutine truck next door. Not bad at all.', next: 'hi' },
      },
    },
  },
  {
    id: 'rosa', name: 'Chef Rosa', role: 'Prairie Poutine truck', color: '#2fb67c',
    look: { skin: '#d9a07a', hair: '#5a3a28', hairStyle: 'pony', top: '#ffffff', bottom: '#3f4d73', shoes: '#2a2a30', hat: 'chef', hatColor: '#ffffff', acc: ['apron'], apron: '#2fb67c', scale: .9 },
    mode: 'post', at: [0, 22.75], face: [0, 1], pose: 'cook', talkAt: [0, 24.45], inTruck: true,
    alt: { label: 'Order poutine', act: 'truck' },
    barks: ['Order up!', 'Fries, gravy, squeaky curds!', 'Prairie Poutine, now serving!'],
    dialog: {
      start: 'hi',
      nodes: {
        hi: { text: 'Welcome to the Prairie Poutine truck! Fries, gravy and squeaky cheese curds. Edmonton winter fuel, served all year.', choices: [{ label: 'One poutine, please', do: 'truck' }, { label: "Why 'squeaky'?", to: 'curds' }, { label: 'Bye', end: true }] },
        curds: { text: "Fresh curds squeak against your teeth. If they don't squeak, they're not fresh. Chef's rule.", next: 'hi' },
      },
    },
  },
  {
    id: 'wen', name: 'Grandpa Wen', role: 'Duck enthusiast', color: '#8a93a6',
    look: { skin: '#e6b893', hair: '#e9e6e0', hairStyle: 'bald', top: '#5b8c6a', bottom: '#8a5a44', shoes: '#3a2a22', hat: 'straw', hatColor: '#e7cf8f', acc: ['glasses', 'beard'] },
    mode: 'post', at: [-1.2, 11.95], face: [0, 1], pose: 'sit', talkAt: [-2.55, 12.3],
    alt: { label: 'Feed the ducks', act: 'ducks' },
    barks: ['Quack yourself.', 'Lovely ducks today.', 'Mm, poutine smells good.'],
    dialog: {
      start: 'hi',
      nodes: {
        hi: { text: 'Sit a while. The ducks and I have an understanding. I bring crumbs, they bring gossip.', choices: [{ label: 'Feed the ducks', do: 'ducks' }, { label: 'Any advice?', to: 'advice' }, { label: 'Bye', end: true }] },
        advice: { text: 'Talk to people before you design for them. Henry learned that from twelve interviews about long-distance love.', next: 'hi' },
      },
    },
  },
  {
    id: 'noor', name: 'Noor', role: 'Mail carrier', color: '#3b82f6',
    look: { skin: '#b9825f', hair: '#1f1a1a', hairStyle: 'pony', top: '#3b82f6', bottom: '#2a3656', shoes: '#f6f3ee', hat: 'cap', hatColor: '#202b45', acc: ['bag'] },
    mode: 'route', route: 'mail', speed: 1.7,
    alt: { label: 'Ask for mail', act: 'mail' },
    barks: ['Mail call!', 'Another hug for the cottage.', 'Rain or shine!'],
    dialog: {
      start: 'hi',
      nodes: {
        hi: { text: 'Mail is moving! Most of my route goes to the little cottage past the garden. Somebody up there gets a lot of hugs.', choices: [{ label: 'Any mail for me?', do: 'mail' }, { label: 'Bye', end: true }] },
      },
    },
  },
  {
    id: 'oskar', name: 'Oskar', role: 'Morning jogger', color: '#ec6a4e',
    look: { skin: '#f2c7a5', hair: '#c7a15a', hairStyle: 'short', top: '#ec6a4e', bottom: '#202b45', shoes: '#ffffff', acc: ['headband'], headband: '#ffffff' },
    mode: 'route', route: 'loop', speed: 3.1, jog: true,
    alt: { label: 'Jog together', act: 'jog' },
    barks: ['On your left!', 'Lap five!', 'Keep moving!'],
    dialog: {
      start: 'hi',
      nodes: {
        hi: { text: "Can't stop for long, I'm on lap four! My loop goes through the market, past the showroom, around the Skill Tree and back through the square.", choices: [{ label: 'Jog with you', do: 'jog' }, { label: 'Bye', end: true }] },
      },
    },
  },
  {
    id: 'priya', name: 'Priya', role: 'Painter', color: '#f27b78',
    look: { skin: '#a8714f', hair: '#1f1a1a', hairStyle: 'long', top: '#fbe3d8', bottom: '#5b6478', shoes: '#2a2a30', hat: 'beret', hatColor: '#ec6a4e', acc: ['brush'] },
    mode: 'post', at: [-3.9, -24.4], face: [1, -.45], pose: 'paint',
    alt: { label: 'Ask for a sketch', act: 'sketch' },
    barks: ['Hold still, heart.', 'Just one more brushstroke.', 'The light is perfect.'],
    dialog: {
      start: 'hi',
      nodes: {
        hi: { text: "I'm painting the heart over the garden. Harder than it looks. It keeps beating.", choices: [{ label: 'Can I see a sketch?', do: 'sketch' }, { label: 'Bye', end: true }] },
      },
    },
  },
  {
    id: 'theo', name: 'Theo', role: 'Kite flyer', color: '#2fb67c', kid: true,
    look: { skin: '#f3c9a6', hair: '#7a4a2a', hairStyle: 'curly', top: '#ffd166', bottom: '#3b82f6', shoes: '#ec6a4e', hat: 'cap', hatColor: '#2fb67c', acc: [], scale: .76 },
    mode: 'post', at: [-19.4, 12.4], face: [1, -.6], pose: 'kite',
    alt: { label: 'Help with the kite', act: 'kite' },
    barks: ['Higher! Higher!', 'Look at my kite!', 'Wind, please!'],
    dialog: {
      start: 'hi',
      nodes: {
        hi: { text: "My kite is shaped like a skill orb! If you shake the big tree, the real orbs glow. Can you help me get it higher?", choices: [{ label: 'Help fly the kite', do: 'kite' }, { label: 'Bye', end: true }] },
      },
    },
  },
  {
    id: 'sam', name: 'Sam', role: 'Commuter', color: '#2f6fdd',
    look: { skin: '#e0b090', hair: '#4a3020', hairStyle: 'short', top: '#2f6fdd', bottom: '#3a4258', shoes: '#2a2a30', acc: ['scarf', 'glasses'], scarf: '#e0393e' },
    mode: 'post', at: [-20.4, -11.05], face: [0, -1], pose: 'wait',
    alt: { label: 'Ask about the LRT', act: 'lrtfacts' },
    barks: ['Train should be here any minute.', 'Two stops to go.', 'I love this map.'],
    dialog: {
      start: 'hi',
      nodes: {
        hi: { text: "Waiting on the next train. Henry's live map says it's almost here, and it's usually right.", choices: [{ label: 'Tell me an LRT fact', do: 'lrtfacts' }, { label: 'Bye', end: true }] },
      },
    },
  },
];

// A few lines for the actions that return text.
export const POSTCARDS = [
  'A postcard from Taipei: “Wish you were here!”',
  'A postcard from London: “Morning already? Call me later!”',
  'A flyer: “Fresh boba by the pond. Ask for Auntie Mei.”',
  'A note from Mayor Maple: “Town meeting cancelled. Everyone went for poutine.”',
];
export const LRT_FACTS = [
  "Edmonton's LRT opened in 1978, the same year the city hosted the Commonwealth Games.",
  'The Metro Line opened in 2015, heading north from downtown toward NAIT.',
  'The Valley Line Southeast opened in 2023, with low-floor trains out to Mill Woods.',
];
export const SKETCHES = ['heart', 'train', 'house', 'hamster'];
