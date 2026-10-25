// Portfolio content shown in the town (mirrors henrywu.link).
export const BASE = (import.meta.env && import.meta.env.BASE_URL) || './';
export const asset = p => BASE + p;

export const SITE = 'https://henrywu.link/';
export const LINKEDIN = 'https://www.linkedin.com/in/min-tzu-wu-7910851b4/';

export const QUEST = {
  bridgly: {
    rarity: 'Legendary', lv: 50, tags: ['Mobile App', 'Relationship', 'UX / UI'], timeline: 'May – Jul 2024 · 10 weeks',
    type: 'Personal concept · Mobile app', tools: 'Figma',
    lede: "Designing for emotional presence across distance: a mobile app that helps long-distance couples feel part of each other's day.",
    pivot: "Bridgly began as a shared goal tracker. Research showed couples didn't need another task manager — they wanted to feel present in each other's daily lives, so the design moved to partner context, warm contact and shared plans.",
    problem: "Messages arrive, but presence doesn't. Across time zones, couples couldn't tell when the other was awake or free, and messaging apps left no space for shared memories or plans.",
    did: 'Solo, 10 weeks. 12 interviews, 87 survey responses and a review of 6 apps led me to pivot from a goal tracker to V2: a warm, photo-led app built around partner awareness, warm contact, shared anticipation and shared memories.',
    outcome: 'In a 2-week Think-Aloud test with 8 users, V2 felt warmer and more personal than V1, and most reached partner context and the reunion countdown on the first try. V2 is the final design.',
    covers: 'the problem, research, competitive analysis, ideation, iterations, final design, results and reflection',
    request: 'The clickable prototype, slide deck and Figma file are available on request.',
  },
  greenpath: {
    rarity: 'Epic', lv: 38, tags: ['Mobile App', 'Lifestyle', 'UX UI'], timeline: 'Feb – Apr 2024 · 8 weeks',
    lede: 'A sustainable living companion that replaces guilt-tripping with actionable low-carbon alternatives and habit-building micro-rewards.',
    pivot: "GreenPath started as a carbon calculator, but research showed guilt doesn't change behavior. I redesigned it around convenience, quick daily logging and impact you can read: kg of CO₂ saved against a daily goal.",
    problem: 'People already knew the carbon problem. Slow logging and guilt-heavy warnings made them give up.',
    did: 'Solo, 8 weeks. 10 interviews and 120 survey responses led me to a quick log and a nutrition-label format: every action shows kg of CO₂ and its percent of a daily goal.',
    outcome: "Testers logged actions with fewer hesitations than V1's form and described V2 as encouraging rather than guilt-inducing. The final label design has a validation plan ready.",
  },
  studyflow: {
    rarity: 'Rare', lv: 27, tags: ['Mobile App', 'Productivity', 'UX UI'], timeline: 'Sep – Nov 2023 · 9 weeks',
    lede: 'A frictionless focus workspace that lowers the activation energy of starting, so students spend less time planning and more time in flow.',
    pivot: "StudyFlow started as a strict scheduling tool. Research showed rigid time planning was the problem, not the solution, so I redesigned it around one principle: make starting so easy there's no excuse not to.",
    problem: 'Students failed at starting, not studying. Detailed planning made them abandon sessions before the first minute.',
    did: 'Solo, 9 weeks. 9 interviews and a 15-person diary study led me to replace calendar setup with a one-tap hourglass: turn the glass, and the sand shows time left.',
    outcome: 'In testing with 8 users, more completed a full session in V2, and feedback described it as “less stressful to open.” The final hourglass design has a validation plan ready.',
  },
};

export const SIDE = {
  emberline: { title: 'Emberline Coffee', desc: 'A cinematic coffee product landing page crafted around brand storytelling and an immersive browsing experience.', tags: ['Web Design', 'UI Design', 'Branding'], url: 'https://emberline-landing.vercel.app/' },
  jobtracker: { title: 'Job Tracking Web App', desc: 'A focused workspace for organizing job applications and keeping every opportunity moving forward.', tags: ['Web App', 'UX UI', 'Development'], url: 'https://mern-project-job.onrender.com/landing' },
  edmontonlrt: { title: 'Edmonton LRT Live', desc: 'An interactive Edmonton LRT map with tiny 3D trains across the Capital, Metro and Valley lines, driven by ETS schedules.', tags: ['Transit', 'Three.js', 'React'], url: 'https://edmonton-lrt-live.vercel.app/' },
  arcline: { title: 'Arcline One', desc: 'A cinematic electric-vehicle landing page with a 3D car configurator, paint options and range calculator.', tags: ['Web Design', 'EV', '3D Interaction'], url: 'https://arcline-landing-kappa.vercel.app/' },
  stackyard: { title: 'Stackyard Warehouse Ops', desc: 'A live-feeling 3D warehouse dashboard with automated vehicles, pallet racks and simulated fulfillment tasks.', tags: ['3D Dashboard', 'Simulation', 'Operations'], url: 'https://stackyard-warehouse-ops.vercel.app/' },
};
export const SIDE_ORDER = ['emberline', 'jobtracker', 'edmontonlrt', 'arcline', 'stackyard'];

export const SKILLS = [
  ['UX Research', '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>'],
  ['UI Design', '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.6 7.6"/><circle cx="11" cy="11" r="2"/>'],
  ['Prototyping', '<circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><circle cx="12" cy="18" r="3"/><path d="M8 8.5l2.6 6.8M16 8.5l-2.6 6.8M9 6h6"/>'],
  ['Design Systems', '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'],
  ['Interaction Design', '<path d="M9 9l5 12 1.8-5.2L21 14z"/><path d="M7.2 2.2 8 5.1M5.1 8 2.2 7.2M14 4.1 12 6.2M6.2 12l-2.1 2"/>'],
  ['Usability Testing', '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>'],
];

// Tool coins hidden around town. `m` and `y` are filled in by the engine.
export const TOOLS = [
  { n: 'Figma', a: 'Fi', c: '#a259ff', at: [5.4, 3.2] },
  { n: 'Framer', a: 'Fr', c: '#1f6bff', at: [8.6, -26.7] },
  { n: 'FigJam', a: 'FJ', c: '#f2683a', at: [-25.7, -6.5] },
  { n: 'Notion', a: 'N', c: '#2f3437', at: [23.4, -5.2] },
  { n: 'Maze', a: 'Mz', c: '#ff8a2a', at: [-19.6, 17.6] },
  { n: 'Lottie', a: 'Lo', c: '#14b8a6', at: [18.8, 18.5] },
  { n: 'Spline', a: 'Sp', c: '#3b5bdb', at: [0, -12.6] },
];

export const GLYPH_SVG = {
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  cup: '<path d="M4 9h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3c-.8 1 .8 2 0 3M12 3c-.8 1 .8 2 0 3"/>',
  board: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9 4v16M15 4v16"/><path d="M5 8h2M11 8h2M17 8h2M5 11h2M11 11h2"/>',
  train: '<rect x="4" y="5" width="16" height="14" rx="4"/><path d="M8 5V2h8v3M4 12h16M7 22l3-3M17 22l-3-3M8 9h2M14 9h2"/>',
  car: '<path d="M5 16 3 13l2-5h14l2 5-2 3H5z"/><path d="m7 8 2-4h6l2 4M6 16v3M18 16v3M7 13h2M15 13h2"/>',
  warehouse: '<path d="M3 21V8l9-5 9 5v13M3 10h18M7 21v-8h10v8M7 17h10M11 13v8"/>',
};

export const ABOUT = {
  headline: 'UI/UX Designer. Hamster Lover. Problem Solver.',
  bio: "I'm Henry Wu, a UI/UX designer who crafts meaningful digital experiences with empathy and curiosity. When I'm not designing, you'll find me hanging out with my hamster, gaming, or working out.",
};

/** one line for each stop in the map view's project list */
export const BLURB = {
  ...Object.fromEntries(Object.entries(QUEST).map(([id, q]) => [id, q.lede])),
  ...Object.fromEntries(Object.entries(SIDE).map(([id, q]) => [id, q.desc])),
  skills: 'Six core skills, plus the design tools hidden around town as coins.',
  about: 'Who I am, what I focus on and the tools I use every day.',
  contact: 'The quickest way to reach me about a role or a project.',
};

/* ---- how the work connects ---- */
/** what each stop is made of, shown as "Inside" in its card */
export const PARTS = {
  bridgly: ['Problem', 'Research', 'Competitive analysis', 'Ideation', 'Iterations', 'Final design', 'Results', 'Reflection'],
  emberline: ['Cinematic product landing page', 'Brand storytelling', 'Immersive browsing'],
  jobtracker: ['Application workspace', 'Keeps every opportunity moving'],
  edmontonlrt: ['Interactive LRT map', 'Tiny 3D trains', 'Capital, Metro and Valley lines', 'ETS schedules'],
  arcline: ['3D car configurator', 'Paint options', 'Range calculator'],
  stackyard: ['Automated vehicles', 'Pallet racks', 'Simulated fulfillment tasks'],
  skills: ['UX Research', 'UI Design', 'Prototyping', 'Design Systems', 'Interaction Design', 'Usability Testing'],
};
/**
 * Threads run through several stops: the same way of working, or the same kind of build.
 * `why` says what each stop brings to the thread. The map view draws them as arcs between the stops.
 */
export const THREADS = [
  {
    id: 'research', name: 'Research first', color: '#ec6a4e',
    desc: 'Talking to people and testing with them decides what gets designed.',
    why: { bridgly: '12 interviews, 87 survey responses and a Think-Aloud test with 8 users shaped V2.', skills: 'UX Research and Usability Testing are two of my six core skills.' },
  },
  {
    id: 'daily', name: 'Built around daily life', color: '#8b5cf6',
    desc: "Products that fit into someone's everyday routine.",
    why: { bridgly: "Helps long-distance couples feel part of each other's day.", jobtracker: 'A focused workspace that keeps every job application moving.' },
  },
  {
    id: 'story', name: 'Brand storytelling', color: '#e6a400',
    desc: 'Landing pages that sell a product by telling its story.',
    why: { emberline: 'A cinematic coffee landing page crafted around brand storytelling.', arcline: 'A cinematic electric-vehicle landing page.' },
  },
  {
    id: '3d', name: '3D in the browser', color: '#3b82f6',
    desc: 'Interactive 3D scenes that run on a web page, like this town.',
    why: { arcline: 'A 3D car configurator with paint options.', edmontonlrt: 'Tiny 3D trains running across the LRT lines.', stackyard: 'A 3D warehouse with automated vehicles and pallet racks.' },
  },
  {
    id: 'live', name: 'Live data and simulation', color: '#2fb67c',
    desc: 'Interfaces that move on their own, from real schedules or a simulation.',
    why: { edmontonlrt: 'Trains are driven by ETS schedules.', stackyard: 'Fulfillment tasks are simulated so the dashboard feels live.' },
  },
  {
    id: 'shipped', name: 'Designed and shipped', color: '#57677d',
    desc: 'Side projects that went all the way to a live site you can visit.',
    why: { emberline: 'Live landing page.', jobtracker: 'Live web app.', edmontonlrt: 'Live transit map.', arcline: 'Live landing page.', stackyard: 'Live dashboard.' },
  },
];
for (const th of THREADS) th.stops = Object.keys(th.why);
export const THREAD = Object.fromEntries(THREADS.map(th => [th.id, th]));
/** the threads a stop belongs to */
export const threadsOf = id => THREADS.filter(th => th.stops.includes(id));

/* ---- the story tour: chapters the map camera flies through (press T) ---- */
// shot: a stop to frame, `fit` to frame several stops, or 'home' for the whole town
export const STORY = [
  { kicker: 'Welcome', title: 'A town made of my work', text: 'Every square in Quest Town holds a project. This short story walks through how they connect, from research to things you can visit live.', shot: 'home' },
  { kicker: 'Case study', stop: 'bridgly', thread: 'research', title: 'It started with people', text: 'Bridgly began as a shared goal tracker. 12 interviews, 87 survey responses and a review of 6 apps showed couples wanted to feel present in each other’s day, not another task manager.' },
  { kicker: 'Case study', stop: 'bridgly', thread: 'research', title: 'Test, learn, redesign', text: 'In a 2-week Think-Aloud test with 8 users, V2 felt warmer and more personal than V1, and most people reached partner context and the reunion countdown on the first try.', yaw: .7, dist: 18 },
  { kicker: 'Skills', stop: 'skills', thread: 'research', title: 'The skills behind it', text: 'UX research, UI design, prototyping, design systems, interaction design and usability testing. Seven of my design tools are hidden around town as coins.' },
  { kicker: 'Connection', fit: ['bridgly', 'jobtracker'], thread: 'daily', title: 'Built around daily life', text: 'Like Bridgly, the Job Tracker fits into someone’s routine: a focused workspace that keeps every job application moving.' },
  { kicker: 'Live project', stop: 'emberline', thread: 'story', title: 'Telling a brand’s story', text: 'Emberline Coffee is a cinematic landing page crafted around brand storytelling and an immersive browsing experience.' },
  { kicker: 'Live project', stop: 'arcline', thread: 'story', title: 'From coffee to cars', text: 'Arcline One takes the same storytelling to an electric vehicle, with paint options and a range calculator.' },
  { kicker: 'Connection', fit: ['arcline', 'edmontonlrt', 'stackyard'], thread: '3d', title: '3D in the browser', text: 'Arcline’s car configurator, the LRT’s tiny trains and Stackyard’s warehouse are all interactive 3D on a web page, like this town.' },
  { kicker: 'Live project', stop: 'edmontonlrt', thread: 'live', title: 'Driven by real schedules', text: 'Edmonton LRT Live puts tiny 3D trains on the Capital, Metro and Valley lines, moving to ETS schedules.' },
  { kicker: 'Live project', stop: 'stackyard', thread: 'live', title: 'A warehouse that runs itself', text: 'Stackyard Warehouse Ops simulates fulfillment tasks, with automated vehicles moving between pallet racks.' },
  { kicker: 'About me', stop: 'about', title: 'Who made all this', text: 'I’m Henry Wu, a UI/UX designer who crafts meaningful digital experiences with empathy and curiosity. When I’m not designing, I’m hanging out with my hamster, gaming or working out.' },
  { kicker: 'The end', stop: 'contact', title: 'Let’s talk', text: 'Want to talk design, a role or a project? The quickest way to reach me is LinkedIn. You can also open any stop on the map, or walk the town with me.', end: true },
];
