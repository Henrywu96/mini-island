# Henry's Quest Island

A playable 3D version of my UI/UX design portfolio. Walk a small sky island, open each case study at its quest totem, and play with the things you find along the way.

Main portfolio: [henrywu.link](https://henrywu.link/) · [LinkedIn](https://www.linkedin.com/in/min-tzu-wu-7910851b4/)

## What's on the island

| Island | What you find |
| --- | --- |
| Bridgly | Featured case study (Legendary). Send a hug to the lookout cottage. |
| GreenPath | Case study (Epic). Log a green action and watch a tree grow. |
| StudyFlow | Case study (Rare). Turn the hourglass to start a focus session. |
| Side Quests | Emberline Coffee and the Job Tracking Web App, both linked to their live sites. Brew a coffee, move a job card. |
| Skill Tree | Six UX abilities hanging from the tree. Shake it. |
| Home Base | About me, contact, a hamster wheel, a beach ball, and two dogs and two cats who live there. |

There are also 7 tool coins to collect, 16 interactions to discover, a guided tour, a photo mode and a **Quick view** for anyone who would rather skim the work than play.

## Dogs and cats

Mochi (a Shiba) and Bean (a Border collie) share the doghouse; Mango (an orange tabby) and Sesame (a tuxedo cat) own the cat tree. They wander Home Base on their own, nap, eat, groom, get the zoomies and come over to say hi.

- Walk up to one and press `E` to pet it. Cats only put up with so many pets in a row.
- Press `F` to ask a dog for a trick (spin, high five, roll over, play bow) or to toss a ball of yarn for a cat to pounce on.
- Kick the beach ball and the nearest dog plays fetch, nosing it back to you.
- Dogs join in when Henry dances or cheers. The cats are not impressed.
- At night, or in rain and snow, they get sleepy and curl up in their beds.

## Live local time and weather

The island follows each visitor's own day:

- **Date and time** come from the visitor's clock and are shown in the weather card at the top.
- **Sky** switches automatically between day, sunset and night, using the real sunrise and sunset times for the visitor's area once the weather has loaded. The sun button (`N`) can override it.
- **Weather** comes from [Open-Meteo](https://open-meteo.com/), is shown in degrees Celsius and refreshes every 15 minutes. Rain, snow, fog, overcast skies, wind and thunderstorms all show up on the island, and Henry opens an umbrella when it rains.
- Clicking the weather card previews clear sky, rain, snow and a thunderstorm, then returns to live weather.

**Privacy:** the approximate area is looked up from the visitor's IP address with [GeoJS](https://www.geojs.io/) (fallback: [ipwho.is](https://ipwho.is/)). The pin button asks the browser for a precise location instead, and its place name comes from [BigDataCloud](https://www.bigdatacloud.com/). The location is only cached in the visitor's own browser for six hours; no data is stored anywhere else. If any of these services are unreachable, the island still works and simply shows the local time.

## Controls

| Action | Keys |
| --- | --- |
| Walk / run | `W` `A` `S` `D` or arrow keys · hold `Shift` |
| Walk to a spot | Click or tap the ground |
| Open or use | `E` · second action `F` |
| Hop | `Space` |
| Wave · dance · cheer | `1` `2` `3` |
| Pet the hamster | `H` |
| Pet a dog or cat · trick or yarn | Walk up · `E` · `F` |
| Guided tour | `T` |
| Auto · day · sunset · night | `N` |
| Weather preview | Click the weather card |
| Photo mode | `P` |
| Sound on or off | `M` |
| Quest log | `Q` |
| Camera | Drag to turn · scroll to zoom |

## Run it locally

No build step. Because the page loads images and ES modules, open it through a local server rather than double-clicking the file:

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Built with

- [three.js](https://threejs.org/) 0.160, loaded from the jsDelivr CDN (3D scene, bloom, labels)
- [Open-Meteo](https://open-meteo.com/) for weather, [GeoJS](https://www.geojs.io/) for approximate location (no API keys needed)
- Fredoka and Inter from Google Fonts
- Plain HTML, CSS and JavaScript in a single `index.html`; all 3D models are built in code

© 2026 Henry Wu. All rights reserved.
