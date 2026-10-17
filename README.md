<div align="center">

# 🐾 Desk Pet

**A tiny pixel pet that lives on your website and on your desktop.**

It climbs your headings, jumps from paragraph to paragraph, sits on the text you select, chases a laser pointer, gets hungry, wears a Ramadan lantern when it's Ramadan, and reminds you to take breaks.

### [▶ Adopt yours, with a live demo](https://sahil-zaini.github.io/desk-pet/) · [⬇ Download the desktop app](https://github.com/Sahil-Zaini/desk-pet/releases/latest)

![Desk Pet demo](demo.gif)

</div>

---

## Add it to your site

Paste this just before `</body>`:

```html
<script src="https://sahil-zaini.github.io/desk-pet/pet.js" data-pet="cat" defer></script>
```

That's it. To choose a pet, colour, outfit and name in a few clicks, use the **[adopt page](https://sahil-zaini.github.io/desk-pet/)**.

## Your page is a playground

Most website pets walk along the bottom of the screen. Desk Pet scans your page and treats every heading, paragraph, image, button and form field as a platform. It stands on the first line of the text and jumps between them using real gravity.

| What you do | What the pet does |
|---|---|
| Scroll | Hops along to the heading you're reading |
| Select some text | Walks over and sits right on it |
| Hold **Shift** and move the mouse | A red laser dot appears and the pet chases it |
| **Alt + click** | Drops food (fish, bone or dates). The pet runs over to eat it |
| Drag the pet | Picks it up. Let go mid-move to throw it |
| Click the pet | Pets it ❤️ and shows its mood and hunger |
| Type in a form | Hops onto the field to watch you |
| Submit a form | Celebrates 🎉 |
| Move to leave the page | "wait, don't go!" (once per visit) |

## Three personalities

| Pet | `data-pet` | `data-color` | Personality |
|---|---|---|---|
| 🐈 Cat | `cat` | `ginger` · `black` · `white` · `grey` | The climber. Big jumps, wants the highest heading, sits on your selections and is obsessed with the laser. |
| 🐕 Dog | `dog` | `brown` · `golden` · `husky` | The runner. Fast, follows the cursor, gets zoomies and loves being thrown. |
| 🐪 Camel | `camel` | `sand` | The calm one. Walks slowly, barely jumps, takes long naps and ignores the laser. |

Pets also have **hunger and mood** (saved in the visitor's browser), get **sleepy late at night**, and two pets on the same page **meet each other** and nap together.

## Outfits

With `data-outfit="auto"` (the default) the pet dresses for the date:

| Date | Outfit |
|---|---|
| Ramadan (Hijri calendar) | 🏮 lantern |
| Eid al-Fitr and Eid al-Adha | 🎉 party hat |
| 1–3 December, UAE National Day | 🇦🇪 flag |
| 20–31 December | 🎅 Santa hat |
| New Year | 🎉 party hat |
| Halloween | 🧙 witch hat |

You can also pick one yourself: `none`, `santa`, `party`, `crown`, `uae`, `ramadan`, `witch`.

## Options

| Attribute | What it does | Default |
|---|---|---|
| `data-pet` | `cat`, `camel` or `dog` | `cat` |
| `data-color` | colour, see the table above | first colour |
| `data-name` | its name, shown when you hover over it | Mishmish / Habibi / Biscuit |
| `data-size` | pixel scale from `2` to `5` | `3` |
| `data-say` | your own messages, separated by `\|` | built-in messages |
| `data-outfit` | `auto`, `none` or an outfit name | `auto` |
| `data-climb` | `false` keeps the pet on the bottom edge | `true` |
| `data-guide` | tour-guide steps: `selector\|message;;selector\|message` | none |
| `data-bottom` | gap above the bottom of the window, in px | `0` |
| `data-credit` | `false` hides the small "Desk Pet" link in the hover card | `true` |

**Several pets:** add the script tag more than once.

**Tour guide example.** The pet walks to each element in turn, points at it and says the message. Each step shows once per visit:

```html
<script src="https://sahil-zaini.github.io/desk-pet/pet.js" data-pet="dog"
        data-guide="#pricing|Plans start at 0 AED!;;#contact|Say hi here 👋" defer></script>
```

**Exclude or add platforms.** Add `data-pet-platform` to any element to make it a platform, or `data-pet-ignore` to keep the pet off it.

## JavaScript API

```js
const pet = DeskPet.spawn({ pet: "dog", color: "husky", name: "Luna", outfit: "crown" });
pet.say("Hello!");
pet.feed();          // feeds it right away
pet.celebrate();
pet.moveTo(document.querySelector("h2")); // climb onto an element (or pass an x number)
pet.sleep(); pet.wake();
pet.remove();

DeskPet.celebrate(); // every pet on the page celebrates
DeskPet.feed(x, y);  // drop food at a point
DeskPet.list();      // all pets
DeskPet.removeAll();
```

Add `data-auto="false"` to the script tag if you only want to use the API.

## 🖥️ Desktop app

The same pets, now on your computer, plus a break buddy.

- **Walks on your taskbar and jumps onto your open windows** (Windows). On macOS and Linux it walks along the bottom of the screen.
- **Breaks:** every 50 minutes (you choose) the pet sits in the middle of a calm screen with a countdown and tips.
  - **Soft mode:** snooze or skip.
  - **Strict mode:** the screen stays covered until the timer ends. Ctrl+Alt+Del always still works, so you're never stuck.
- **💧 Water and 👀 20-20-20 eye reminders.** The pet walks to the middle of the screen and tells you.
- **🍅 Focus sessions (Pomodoro).** The pet naps in the corner while you work, then calls you for a break.
- **Knows when you're away.** It falls asleep and says "oh, you're back!". Time away counts as a break.
- **Tray menu:** switch pet, feed, take a break now, start focus, settings, start with Windows.

### Install

Download from **[Releases](https://github.com/Sahil-Zaini/desk-pet/releases/latest)**:

| System | File |
|---|---|
| Windows | `DeskPet-Setup-x.y.z.exe` (installer) or `DeskPet-Portable-x.y.z.exe` (no install) |
| macOS | `DeskPet-x.y.z-mac.dmg` |
| Linux | `DeskPet-x.y.z-linux.AppImage` |

The app isn't code-signed yet:

- **Windows:** if you see "Windows protected your PC", click **More info → Run anyway**.
- **macOS:** right-click the app, then choose **Open**.

### Build from source

```bash
cd desktop
npm install
npm start          # run it
npm run dist       # build an installer for your system
```

`npm start` copies `../pet.js` into the app first, so the website and the desktop app always use the same pet.

### Releases

Pushing a tag like `v2.0.0` makes GitHub Actions build Windows, macOS and Linux versions and attach them to a release. See `.github/workflows/desktop.yml`.

## Why it's nice to have around

- **Small:** one script, about 15 KB gzipped, with no dependencies. The pets are drawn in code, with no image files.
- **Isolated:** it uses Shadow DOM, so it can't break your CSS and your CSS can't break it.
- **Never in the way:** it ignores clicks except on itself, and it stays calm for visitors who prefer reduced motion.
- **Private:** no tracking and no network requests. Mood and hunger are saved only in the visitor's own browser.

## License

MIT. Use it anywhere.

---

<div align="center">
Designed &amp; Developed by <b>Sahil Zaini</b> / Zaini Developers · Powered by YCS Trust
</div>
