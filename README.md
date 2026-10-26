# Henry's Quest Town

A playable 3D version of my UI/UX design portfolio. Stroll around a little storybook town, open each case study at its quest totem, chat with the people who live there and play with the things you find along the way.

Main portfolio: [henrywu.link](https://henrywu.link/) · [LinkedIn](https://www.linkedin.com/in/min-tzu-wu-7910851b4/)

Built with **React 19 + Vite 7** for the interface and **three.js 0.160** for the town.

## Around town

Walk anywhere on the streets, squares and lawns. Only the houses, trees, stalls and the duck pond get in your way, and clicking a spot finds a route around them.

| Place | What you find |
| --- | --- |
| Bridgly Garden | Featured case study (Legendary) in a blossom park. Send a hug to the cottage down the lane. |
| LRT Station Park | Edmonton LRT Live: a loop of track, a live map board and a two-car train. Press `F` to dispatch it. |
| Toronto Plaza | Toronto Transit Live, down the street from the LRT park: a subway platform between two tunnel portals, a live map board of the Toronto lines and a little CN Tower. Press `F` to send the train into the tunnel; the next one pulls in on another line. |
| Stackyard Yard | Stackyard Ops: warehouse racks, a delivery van and an AGV that picks and ships an order when you press `F`. |
| Arcline Showroom | Arcline One on a turntable. Press `F` to change the paint. |
| Market Square | Side quests: Emberline Coffee and the Job Tracking Web App, both linked to their live sites. Brew a coffee, move a job card. |
| Skill Tree Park | Six UX abilities hanging from the tree. Shake it. |
| Town Square | About me, contact, a hamster wheel, a beach ball, and two dogs and two cats who live there. |
| Food Court | Around the duck pond south of the square: a bubble tea stand, a night market cart, a poutine truck, picnic tables and string lights that glow at night. |

**Canadian touches:** the woods around town are spruce and maple, the squares have red and gold maples with leaves drifting down, a Maple Leaf flag flies in the town square, an inukshuk stands at the lookout and a red canoe rests in the Bridgly garden.

**Canadian wildlife,** every kind as a male and female pair: two beavers gnaw beside their lodge at the duck pond (walk up and they slap their tails), two common loons swim and dive on the pond and call when you come close, a bull and a cow moose graze where the town meets the woods (only the bull has antlers), and four pairs of Canada geese fly over in a V.

**Map view:** press `O` (or **Map view** at the top, or **See the town map** on the start screen) and the camera lifts off Henry to show the whole town from above. Every stop has a numbered label: click a label, a totem or a row in the project list and the camera flies there and opens its card, framed beside the card so it never hides behind it. **Next** in a card goes through the stops in map order, and **Walk here with Henry** drops back into the town and walks him over. The project list (`L`) groups the stops into the case study, live projects and the stops about Henry, with a check on the ones already opened.

**Connections:** the work is linked by six threads, such as *Research first*, *Brand storytelling*, *3D in the browser* and *Live data and simulation*. In the map view they are dashed arcs between the stops that share them; pick one in the **Connections** row to see just that thread. Every card lists what the project is made of (**Inside**) and its **Connected work**, with buttons that jump to the related stops. Threads and parts live in `src/data/content.js` (`THREADS`, `PARTS`).

**Story tour:** press `T` (or **Take the story tour** on the start screen, or ask Mayor Maple to show you around) for a 13-chapter story in the map view: from the Bridgly research to the live sites, the skills behind them and how to get in touch. Each chapter frames its stops above the caption, brings out its thread and plays on by itself. Pause with `Space`, step with `←` `→`, open the stop from the card, or leave with `Esc`. The chapters are in `STORY` in `src/data/content.js`.

**The island:** the town sits on an island now, with a sandy beach, foam along the shore, small islands on the horizon, a lighthouse that sweeps the sea at night (gulls circle it by day), a jetty with a rowboat and sailboats going round. Zoom the map all the way out to see the whole island.

**Everyday crowd:** up to 32 small townsfolk leave their houses and walk the streets to wherever people go at that hour: the LRT park, the Toronto plaza and the coffee booth in the morning, the food court at lunch, the parks in the afternoon and the square in the evening. Most go home at night. They step round Henry rather than walk through him. The townsfolk you can talk to keep their spots, so they are always there to meet.

There are also 7 tool coins to collect, 32 interactions to discover, 11 townsfolk to meet, a story tour, a photo mode and a **Quick view** for anyone who would rather skim the work than play.

## Townsfolk

Walk up to anyone and press `E` to chat (pick a reply with the number keys), or press `F` for the thing they do best. People you haven't met yet have a speech bubble over their head.

| Who | Where | `F` |
| --- | --- | --- |
| Mayor Maple | Strolls around the town square | Shake hands. Ask her for a task to start the **town census**. |
| Jules, street musician | Town square | Tip a coin and Jules plays a song |
| Auntie Mei | Bubble tea stand | Brown sugar boba: higher hops for 20 seconds |
| Uncle Lin | Night market cart | A scallion pancake, shared with the hamster |
| Chef Rosa | Prairie Poutine truck | Poutine with squeaky curds |
| Grandpa Wen | Bench by the pond | Feed the ducks (they paddle over) |
| Noor, mail carrier | Walks a mail route through town | A postcard |
| Oskar, jogger | Jogs a loop through the market, showroom and Skill Tree | Jog together: +25% speed for 20 seconds |
| Priya, painter | Bridgly Garden | A quick sketch |
| Theo, kite flyer | Skill Tree Park | Help fly the kite higher |
| Sam, commuter | LRT platform | A fact about Edmonton's LRT (and maybe a train) |

**Town census:** Mayor Maple asks you to say hi to everyone in town. Meet all 11 townsfolk and go back to her for the key to Quest Town and +10 XP. The quest log shows who you have met so far.

## Dogs and cats

Mochi (a Shiba) and Bean (a Border collie) share the doghouse; Mango (an orange tabby) and Sesame (a tuxedo cat) own the cat tree. They wander the town square on their own, nap, eat, groom, get the zoomies and come over to say hi.

- Walk up to one and press `E` to pet it. Cats only put up with so many pets in a row.
- Press `F` to ask a dog for a trick (spin, high five, roll over, play bow) or to toss a ball of yarn for a cat to pounce on.
- Kick the beach ball and the nearest dog plays fetch, nosing it back to you.
- Dogs join in when Henry dances or cheers. The cats are not impressed.
- At night, or in rain and snow, they get sleepy and curl up in their beds.

## Live local time and weather

The town follows each visitor's own day:

- **Date and time** come from the visitor's clock and are shown in the weather card at the top.
- **Sky** runs on a 24-hour clock: night, a pink dawn, day, sunset and night again, using the real sunrise and sunset times for the visitor's area once the weather has loaded. The sun button opens a time slider with Dawn, Noon, Sunset and Night, **My local time**, and **Watch a day go by** (a whole day in under a minute). `N` steps through auto, day, sunset and night.
- **Weather** comes from [Open-Meteo](https://open-meteo.com/), is shown in degrees Celsius and refreshes every 15 minutes. Rain, snow, fog, overcast skies, wind and thunderstorms all show up in town, windows, street lamps and the food court lights glow after dark, and Henry opens an umbrella when it rains.
- Clicking the weather card previews clear sky, rain, snow and a thunderstorm, then returns to live weather.

**Privacy:** the approximate area is looked up from the visitor's IP address with [GeoJS](https://www.geojs.io/) (fallback: [ipwho.is](https://ipwho.is/)). The pin button asks the browser for a precise location instead, and its place name comes from [BigDataCloud](https://www.bigdatacloud.com/). The location is only cached in the visitor's own browser for six hours and is not sent to analytics. If any of these services are unreachable, the town still works and simply shows the local time.

**Analytics:** the site uses [Google Analytics 4](https://marketingplatform.google.com/about/analytics/) to count visits and see which case studies and features people use (for example opening a case study, Quick view, the story tour, the map view, town interactions and meeting the townsfolk). It collects no names, emails or precise locations. You can block it with any content blocker or by opting out with the [Google Analytics opt-out add-on](https://tools.google.com/dlpage/gaoptout).

## Controls

| Action | Keys |
| --- | --- |
| Walk / run | `W` `A` `S` `D` or arrow keys · hold `Shift` |
| Walk to a spot | Click or tap the ground |
| Open or use | `E` · second action `F` |
| Talk to townsfolk | Walk up · `E` · replies `1` `2` `3` · `Esc` to leave |
| Hop | `Space` |
| Wave · dance · cheer | `1` `2` `3` |
| Pet the hamster | `H` |
| Pet a dog or cat · trick or yarn | Walk up · `E` · `F` |
| Story tour | `T` · pause `Space` · back and next `←` `→` |
| Auto · day · sunset · night | `N` |
| Weather preview | Click the weather card |
| Photo mode | `P` |
| Sound on or off | `M` |
| Quest log | `Q` |
| Camera | Drag to turn · scroll to zoom |
| Map view · project list | `O` · `L` |
| Move the map | Drag · `W` `A` `S` `D` or arrow keys |
| Turn or tilt the map | Right-drag (or `Shift`-drag) · `Q` `E` · two-finger twist |
| Zoom the map | Scroll · `+` `−` · pinch |
| Leave the map | `O` · `Esc` · **Back to Henry** |

## Run it locally

You need [Node.js](https://nodejs.org/) 20.19 or newer (22 recommended).

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Deploy (Vercel)

The site is deployed on Vercel. Every push to `main` builds and deploys automatically.
Project settings: **Framework Preset** Vite · **Build Command** `npm run build` · **Output Directory** `dist` · **Node.js** 20.x or newer.

## Performance

- The canvas renders at up to 1.5x resolution and steps down to 1x by itself when frames run slow.
- The shadow map follows the camera, the woods outside town skip it, and small props cast no shadow.
- The glow pass only runs when it shows (sunset and night), and unlit lamps are switched off in the daytime.
- Cards over the town use a solid background instead of a live blur, and the town pauses while Quick view is open.
- The map view redraws shadows every third frame while the view is still (they are too small to notice from that high), which keeps it about as light as the start screen.
- The crowd is five instanced meshes (a few draw calls for all 32 people) and shares out its path finding at one new route per frame; the connection arcs are a couple of lines each.

## Project structure

```
index.html              page shell (meta tags, fonts, Google Analytics)
public/img/             images served as-is
src/
  main.jsx, App.jsx     React entry and layout
  components/           HUD: weather card, player card, quest log, prompts, dock, minimap,
                        quest drawer, dialogue box, start screen, quick view
  state/store.js        tiny store shared by the engine (writes) and React (reads)
  data/                 portfolio content, town layout, townsfolk and their dialogue
  game/
    engine.js           builds the town, input, frame loop, the API React calls
    gfx.js nav.js       renderer, materials, collision and path finding
    world/              squares and parks, houses and pond, the food court, the coast
    actors/             Henry, the hamster, dogs and cats, townsfolk, the everyday crowd
    play/               player, quest stops, effects, ball, camera, map view, threads, story, minimap
    sky/                time of day, weather
  styles/app.css
```

Everything in the town, including the people, is built in code; there are no 3D model files. To add someone to town, add an entry to `src/data/npcs.js` (look, where they hang out, what they say) and, if they do something new, an action in `src/game/actors/npcs.js`.

## Built with

- [React](https://react.dev/) 19 and [Vite](https://vite.dev/) 7
- [three.js](https://threejs.org/) 0.160 (3D scene, bloom, labels)
- [Open-Meteo](https://open-meteo.com/) for weather, [GeoJS](https://www.geojs.io/) for approximate location (no API keys needed)

© 2026 Henry Wu. All rights reserved.
