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
| Home Base | About me, contact, a hamster wheel, a beach ball and jump pads. |

There are also 7 tool coins to collect, 12 interactions to discover, a day / sunset / night switch, a guided tour, a photo mode and a **Quick view** for anyone who would rather skim the work than play.

## Controls

| Action | Keys |
| --- | --- |
| Walk / run | `W` `A` `S` `D` or arrow keys · hold `Shift` |
| Walk to a spot | Click or tap the ground |
| Open or use | `E` · second action `F` |
| Hop | `Space` |
| Wave · dance · cheer | `1` `2` `3` |
| Pet the hamster | `H` |
| Guided tour | `T` |
| Day · sunset · night | `N` |
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
- Fredoka and Inter from Google Fonts
- Plain HTML, CSS and JavaScript in a single `index.html`; all 3D models are built in code

© 2026 Henry Wu. All rights reserved.
