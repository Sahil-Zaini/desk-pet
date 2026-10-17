/*!
 * Desk Pet v2.0 — a tiny pixel pet that lives on your website (and your desktop).
 * https://github.com/sahil-zaini/desk-pet · MIT © Sahil Zaini
 *
 * <script src="https://sahil-zaini.github.io/desk-pet/pet.js" data-pet="cat" defer></script>
 *
 * Options (data-attributes on the script tag):
 *   data-pet      cat | camel | dog                               (default: cat)
 *   data-color    cat: ginger | black | white | grey · dog: brown | golden | husky
 *   data-name     shown when you hover the pet
 *   data-size     1 – 5 pixel scale                                (default: 3)
 *   data-say      your own lines, separated by |
 *   data-bottom   lift the floor N pixels (e.g. above a cookie bar)
 *   data-outfit   auto | none | santa | party | crown | uae | ramadan | witch   (default: auto = by date)
 *   data-guide    tour: "selector|message;;selector|message" — the pet walks to each element and points at it
 *   data-climb    "false" keeps the pet on the floor (no jumping on your page content)
 *   data-credit   "false" hides the small credit link in the hover card
 *
 * Visitors:  click = pet · drag = carry (and throw!) · Alt+click = drop food · hold Shift = laser pointer
 *            select some text = the pet comes and sits on it
 *
 * JavaScript: var p = DeskPet.spawn({ pet, color, name, ... }); p.say("Hi"); p.feed(); p.celebrate();
 *             DeskPet.removeAll(); DeskPet.celebrate();
 */
(function () {
  "use strict";
  if (window.DeskPet && window.DeskPet.version) return;

  var W = 32, H = 31, TOP = 7;     // logical pixel canvas (7 rows of headroom for hats)
  var REPO = "https://github.com/sahil-zaini/desk-pet";
  var G = 2200;                    // gravity, px/s²

  var PALETTES = {
    cat: {
      ginger: { o: "#5a2d10", f: "#f08c3a", d: "#d16a1f", l: "#ffe0bf", p: "#f7a1a8", e: "#1d1410" },
      black:  { o: "#0d0d12", f: "#2b2b36", d: "#1b1b24", l: "#4a4a5a", p: "#f29aa6", e: "#d8f04a" },
      white:  { o: "#6b6b78", f: "#f6f4ef", d: "#dcd8cf", l: "#ffffff", p: "#f6a3ad", e: "#3a7bd5" },
      grey:   { o: "#2f3340", f: "#8e95a6", d: "#6f7688", l: "#c9ced9", p: "#f39fab", e: "#1b1e26" }
    },
    camel: {
      sand: { o: "#6b4220", f: "#dba564", d: "#c08640", l: "#f3d3a0", p: "#c2333b", e: "#1f140b", g: "#f3c33c" }
    },
    dog: {
      brown:  { o: "#3d2412", f: "#9b6235", d: "#7a4a24", l: "#e9cfa8", p: "#f08f9b", e: "#140c06" },
      golden: { o: "#6a4310", f: "#e3a94a", d: "#c78a2c", l: "#fbe3b0", p: "#f08f9b", e: "#1c1208" },
      husky:  { o: "#272b33", f: "#6d7482", d: "#4f5563", l: "#f4f5f7", p: "#f08f9b", e: "#3d8fe0" }
    }
  };
  var OUTFIT_COLORS = { R: "#d62828", W: "#ffffff", Y: "#ffd23f", P: "#7b2cbf", K: "#16161d", N: "#00843d", U: "#ef3340", A: "#f5c518", B: "#2b59c3", O: "#16161d" };

  var LINES = {
    cat: ["meow", "mrrp?", "🐟?", "purrr…", "pet me", "*stretches*", "this heading is comfy"],
    camel: ["Marhaba!", "Yalla!", "Habibi 🐪", "need water…", "dates? 🌴", "slow and steady", "khalas, nap time"],
    dog: ["woof!", "ball? 🎾", "*wags*", "good human", "walkies?", "🦴?", "ZOOMIES!"]
  };
  var FOOD = { cat: "🐟", dog: "🦴", camel: "🌴" };

  // How each animal behaves. Cats climb and leap, dogs run and play, camels take it slow.
  var SPECIES = {
    cat:   { speed: 58, run: 120, jumpUp: 300, jumpX: 380, climb: .40, wander: .30, idle: .18, sleep: .07, drop: .05, zoom: 0,   social: .12, read: .55, selection: 1,  laser: 1,   cursor: .6, nap: [8, 16] },
    dog:   { speed: 80, run: 210, jumpUp: 150, jumpX: 260, climb: .16, wander: .38, idle: .14, sleep: .05, drop: .10, zoom: .10, social: .17, read: .30, selection: .5, laser: .8, cursor: 1,  nap: [6, 12] },
    camel: { speed: 30, run: 55,  jumpUp: 70,  jumpX: 160, climb: .05, wander: .40, idle: .25, sleep: .14, drop: .14, zoom: 0,   social: .10, read: .10, selection: .2, laser: 0,  cursor: .4, nap: [12, 24] }
  };

  // ---------------------------------------------------------------- drawing
  // Each pose = list of [x, y, w, h, colourKey]. The first pass draws every
  // rect grown by 1px in outline colour, the second pass fills the colours.
  function catParts(s) {
    var b = s.breath, step = s.step, P = [];
    if (s.pose === "sleep") {
      P.push([7, 15, 16, 7, "f"], [9, 15, 10, 2, "d"], [8, 19, 13, 3, "l"]);           // curled body
      P.push([19, 14, 8, 7, "f"], [20, 12, 2, 2, "f"], [25, 12, 2, 2, "f"]);         // head + ears
      P.push([20, 13, 1, 1, "p"], [26, 13, 1, 1, "p"]);
      P.push([21, 17, 2, 1, "e"], [24, 17, 2, 1, "e"], [23, 19, 1, 1, "p"]);         // closed eyes
      P.push([5, 20, 18, 2, "f"], [5, 20, 4, 2, "d"]);                                 // tail around
      return P;
    }
    var lift = s.pose === "walk" ? 1 : 0;
    var legY = 18, a = step % 2 === 0;
    P.push([5 + (s.wag ? 1 : 0), 7, 2, 3, "f"], [4, 9, 2, 4, "f"], [5, 12, 4, 2, "f"]); // tail
    P.push([8, 11 - b, 14, 7 + b, "f"], [10, 11 - b, 9, 2, "d"], [10, 16, 10, 2, "l"]); // body
    // legs (back pair x 9/12, front pair x 17/20)
    var L = [[9, a], [12, !a], [17, !a], [20, a]];
    L.forEach(function (l) { var up = lift && l[1] ? 1 : 0; P.push([l[0] + (lift && l[1] ? 1 : 0), legY, 2, 4 - up, "f"], [l[0] + (lift && l[1] ? 1 : 0), legY + 3 - up, 2, 1, "l"]); });
    var hy = s.pose === "happy" ? -1 : 0;
    P.push([19, 6 + hy, 9, 8, "f"]);                                                  // head
    P.push([19, 3 + hy, 3, 3, "f"], [20, 2 + hy, 1, 1, "f"], [25, 3 + hy, 3, 3, "f"], [26, 2 + hy, 1, 1, "f"]); // ears
    P.push([20, 4 + hy, 1, 2, "p"], [26, 4 + hy, 1, 2, "p"]);
    if (s.blink || s.pose === "happy") P.push([21, 9 + hy, 2, 1, "e"], [25, 9 + hy, 2, 1, "e"]);
    else P.push([21, 8 + hy, 2, 2, "e"], [25, 8 + hy, 2, 2, "e"], [21, 8 + hy, 1, 1, "l"], [25, 8 + hy, 1, 1, "l"]);
    P.push([23, 11 + hy, 2, 1, "p"], [22, 12 + hy, 4, 1, "l"]);                     // nose + muzzle
    P.push([28, 10 + hy, 2, 1, "l"], [28, 12 + hy, 2, 1, "l"]);                      // whiskers
    return P;
  }

  function camelParts(s) {
    var b = s.breath, step = s.step, P = [];
    if (s.pose === "sleep") {
      P.push([6, 16, 18, 6, "f"], [9, 12, 8, 4, "f"], [10, 11, 6, 1, "f"]);           // lying body + hump
      P.push([9, 15, 9, 2, "p"], [9, 15, 9, 1, "g"]);                                  // blanket
      P.push([22, 13, 3, 6, "f"], [23, 10, 7, 4, "f"], [29, 12, 2, 2, "d"], [23, 9, 1, 1, "f"]); // neck + head down
      P.push([25, 11, 2, 1, "e"]);
      P.push([4, 17, 2, 3, "d"]);
      return P;
    }
    var walk = s.pose === "walk", a = step % 2 === 0, hy = s.pose === "happy" ? -1 : 0;
    P.push([5, 11, 2, 4, "d"], [4, 14, 2, 2, "d"]);                                  // tail
    P.push([7, 10 - b, 16, 6 + b, "f"], [9, 15, 13, 1, "l"]);                         // body
    P.push([10, 6 - b, 8, 4, "f"], [11, 5 - b, 6, 1, "f"], [12, 4 - b, 4, 1, "f"]);  // hump
    P.push([10, 9 - b, 8, 2, "p"], [10, 9 - b, 8, 1, "g"], [11, 11 - b, 6, 1, "g"]); // saddle blanket
    var L = [[8, a], [11, !a], [18, !a], [21, a]];
    L.forEach(function (l) { var dx = walk && l[1] ? 1 : 0; P.push([l[0] + dx, 16, 2, 6 - (walk && l[1] ? 1 : 0), "f"], [l[0] + dx, 21 - (walk && l[1] ? 1 : 0), 2, 1, "d"]); });
    P.push([21, 5 + hy, 3, 7, "f"]);                                                  // neck
    P.push([22, 2 + hy, 6, 4, "f"], [27, 3 + hy, 3, 3, "f"], [29, 5 + hy, 1, 1, "d"]); // head + snout
    P.push([22, 1 + hy, 1, 1, "f"], [24, 1 + hy, 1, 1, "f"]);                        // ears
    if (s.blink) P.push([25, 3 + hy, 2, 1, "e"]); else P.push([25, 3 + hy, 1, 2, "e"]);
    P.push([28, 6 + hy, 2, 1, "d"]);                                                  // mouth
    return P;
  }

  function dogParts(s) {
    var b = s.breath, step = s.step, P = [];
    if (s.pose === "sleep") {
      P.push([6, 15, 17, 7, "f"], [8, 15, 10, 2, "d"], [8, 19, 12, 3, "l"]);
      P.push([19, 14, 9, 7, "f"], [19, 13, 3, 6, "d"], [27, 17, 3, 3, "f"], [29, 17, 1, 1, "o"]);
      P.push([23, 16, 2, 1, "e"]);
      P.push([3, 18, 4, 2, "f"]);
      return P;
    }
    var walk = s.pose === "walk", a = step % 2 === 0, hy = s.pose === "happy" ? -1 : 0;
    P.push([4 + (s.wag ? 0 : 1), 8 + (s.wag ? 0 : 1), 2, 4, "f"], [5, 11, 3, 2, "f"]); // tail
    P.push([7, 11 - b, 15, 7 + b, "f"], [9, 11 - b, 8, 2, "d"], [9, 16, 11, 2, "l"]); // body
    var L = [[8, a], [11, !a], [17, !a], [20, a]];
    L.forEach(function (l) { var dx = walk && l[1] ? 1 : 0; P.push([l[0] + dx, 18, 2, 4 - (walk && l[1] ? 1 : 0), "f"], [l[0] + dx, 21 - (walk && l[1] ? 1 : 0), 2, 1, "l"]); });
    P.push([19, 5 + hy, 8, 8, "f"], [26, 8 + hy, 4, 4, "f"], [24, 10 + hy, 4, 2, "l"]); // head + snout
    P.push([19, 4 + hy, 3, 7, "d"]);                                                   // floppy ear
    P.push([29, 8 + hy, 2, 2, "o"]);                                                   // nose
    if (s.blink) P.push([23, 8 + hy, 2, 1, "e"]); else P.push([23, 7 + hy, 2, 2, "e"], [23, 7 + hy, 1, 1, "l"]);
    if (s.pose === "happy" || s.pose === "idle" && s.breath) P.push([27, 12 + hy, 2, 2, "p"]); // tongue
    return P;
  }


  var DRAW = { cat: catParts, camel: camelParts, dog: dogParts };
  var HEAD = { cat: [23, 3], dog: [23, 5], camel: [25, 2] };   // hat anchor (centre x, top y)
  var FLAG_X = { cat: 10, dog: 10, camel: 7 };

  function outfitParts(kind, outfit, s) {
    if (!outfit || outfit === "none" || s.pose === "sleep") return [];
    var hy = s.pose === "happy" ? -1 : 0, ax = HEAD[kind][0], ay = HEAD[kind][1] + hy;
    switch (outfit) {
      case "santa": return [[ax - 3, ay - 3, 7, 2, "R"], [ax - 2, ay - 5, 5, 2, "R"], [ax - 1, ay - 6, 3, 1, "R"], [ax - 4, ay - 1, 9, 1, "W"], [ax + 2, ay - 7, 2, 2, "W"]];
      case "party": return [[ax - 2, ay - 2, 5, 2, "P"], [ax - 1, ay - 4, 3, 2, "Y"], [ax, ay - 6, 1, 2, "P"], [ax - 1, ay - 7, 3, 1, "Y"]];
      case "crown": return [[ax - 3, ay - 2, 7, 2, "A"], [ax - 3, ay - 3, 1, 1, "A"], [ax, ay - 4, 1, 2, "A"], [ax + 3, ay - 3, 1, 1, "A"], [ax, ay - 2, 1, 1, "R"]];
      case "witch": return [[ax - 5, ay - 1, 11, 1, "K"], [ax - 3, ay - 3, 7, 2, "K"], [ax - 2, ay - 5, 5, 2, "K"], [ax - 1, ay - 7, 3, 2, "K"], [ax - 3, ay - 2, 7, 1, "P"]];
      case "ramadan": var lx = Math.min(ax + 4, W - 5); return [[lx + 1, ay - 9, 1, 1, "A"], [lx, ay - 8, 3, 1, "A"], [lx, ay - 7, 3, 3, "Y"], [lx + 1, ay - 6, 1, 1, "R"], [lx, ay - 4, 3, 1, "A"]];  // Ramadan lantern
      case "uae": var fx = FLAG_X[kind]; return [[fx, 1, 1, 10, "K"], [fx + 1, 1, 1, 3, "U"], [fx + 2, 1, 4, 1, "N"], [fx + 2, 2, 4, 1, "W"], [fx + 2, 3, 4, 1, "K"]];
    }
    return [];
  }

  function autoOutfit(d) {
    d = d || new Date();
    var m = d.getMonth() + 1, day = d.getDate(), hm = 0, hd = 0;
    try {
      var parts = new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura", { month: "numeric", day: "numeric" }).formatToParts(d);
      parts.forEach(function (p) { if (p.type === "month") hm = parseInt(p.value, 10); if (p.type === "day") hd = parseInt(p.value, 10); });
    } catch (e) {}
    if (hm === 9) return "ramadan";
    if ((hm === 10 && hd <= 3) || (hm === 12 && hd >= 10 && hd <= 13)) return "party";   // Eid al-Fitr / Eid al-Adha
    if (m === 12 && day >= 1 && day <= 3) return "uae";                                  // UAE National Day
    if (m === 12 && day >= 20) return "santa";
    if (m === 1 && day <= 2) return "party";
    if ((m === 10 && day >= 29) || (m === 11 && day === 1)) return "witch";
    return "none";
  }

  function paint(ctx, kind, pal, s, outfit) {
    var parts = DRAW[kind](s).concat(outfitParts(kind, outfit, s));
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = pal.o;
    parts.forEach(function (r) { ctx.fillRect(r[0] - 1, r[1] - 1 + TOP, r[2] + 2, r[3] + 2); });
    parts.forEach(function (r) { ctx.fillStyle = pal[r[4]] || OUTFIT_COLORS[r[4]] || pal.f; ctx.fillRect(r[0], r[1] + TOP, r[2], r[3]); });
  }

  // ---------------------------------------------------------------- styles
  var CSS = "" +
    ":host{all:initial}" +
    ".pet{position:fixed;left:0;top:0;z-index:2147483000;touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab;will-change:transform}" +
    ".pet:active{cursor:grabbing}" +
    ".body{display:block;transform-origin:50% 100%}" +
    ".flip .body{transform:scaleX(-1)}" +
    "canvas{display:block;image-rendering:pixelated;image-rendering:crisp-edges}" +
    ".bubble{position:absolute;bottom:calc(100% - 8px);left:50%;transform:translateX(-50%);white-space:nowrap;font:600 12px/1.2 system-ui,-apple-system,'Segoe UI',sans-serif;color:#1d1d24;background:#fff;border:2px solid #1d1d24;border-radius:10px;padding:4px 8px;box-shadow:2px 2px 0 #1d1d24;opacity:0;transition:opacity .2s;pointer-events:none}" +
    ".bubble.on{opacity:1}" +
    ".bubble:after{content:'';position:absolute;left:50%;top:100%;transform:translateX(-50%);border:6px solid transparent;border-top-color:#1d1d24}" +
    ".z{position:absolute;font:700 13px/1 ui-monospace,Menlo,monospace;color:#6c7aa8;pointer-events:none;animation:z 2.4s linear infinite;opacity:0}" +
    "@keyframes z{0%{opacity:0;transform:translate(0,0) scale(.7)}20%{opacity:1}100%{opacity:0;transform:translate(14px,-34px) scale(1.2)}}" +
    ".fx{position:absolute;pointer-events:none;font-size:16px;animation:h 1.1s ease-out forwards}" +
    "@keyframes h{from{opacity:1;transform:translate(0,0) scale(.6)}to{opacity:0;transform:translate(var(--dx),-46px) scale(1.2)}}" +
    ".card{position:absolute;bottom:calc(100% - 4px);left:50%;transform:translateX(-50%);font:12px/1.4 system-ui,-apple-system,'Segoe UI',sans-serif;background:#1d1d24;color:#fff;border-radius:8px;padding:7px 10px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .15s}" +
    ".pet:hover .card{opacity:1;pointer-events:auto}" +
    ".pet.talking .card,.pet.dragging .card,.pet.air .card{opacity:0!important}" +
    ".card b{font-weight:700}.card a{color:#ffd166;text-decoration:none}.card a:hover{text-decoration:underline}" +
    ".meter{display:inline-block;width:46px;height:5px;border-radius:9px;background:#3b3b48;vertical-align:middle;overflow:hidden;margin:0 6px 0 3px}.meter i{display:block;height:100%}" +
    ".card small{color:#b9b9c8}" +
    "@media (prefers-reduced-motion:reduce){.z,.fx{animation:none;display:none}}";

  var SHARED_CSS = "" +
    ":host{all:initial}" +
    ".laser{position:fixed;left:0;top:0;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:#ff2d2d;box-shadow:0 0 8px 3px rgba(255,40,40,.75);pointer-events:none;z-index:2147483001;display:none}" +
    ".food{position:fixed;left:0;top:0;font-size:22px;line-height:1;pointer-events:none;z-index:2147482999;transform-origin:50% 100%}";

  // ---------------------------------------------------------------- shared world
  var pets = [];
  var reduced = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var world = {
    mouse: { x: -1, y: -1, t: 0 },
    laser: { on: false, x: 0, y: 0, t: 0 },
    selection: null,          // { x1, x2, y, t }
    reading: { t: 0, y: 0 },  // last scroll
    foods: [],                // { x, y, vy, el, landed, kind }
    typing: { t: 0, el: null, n: 0 },
    host: null, root: null, laserEl: null
  };

  function sharedLayer() {
    if (world.root) return world.root;
    var h = document.createElement("div"); h.setAttribute("data-desk-pet-world", "");
    var r = h.attachShadow ? h.attachShadow({ mode: "open" }) : h;
    var st = document.createElement("style"); st.textContent = SHARED_CSS; r.appendChild(st);
    var l = document.createElement("div"); l.className = "laser"; r.appendChild(l);
    document.body.appendChild(h);
    world.host = h; world.root = r; world.laserEl = l;
    return r;
  }

  // ---------------------------------------------------------------- platforms (page content the pets can stand on)
  var PLATFORM_SEL = "h1,h2,h3,h4,h5,p,li,blockquote,pre,img,video,button,input,textarea,select,table,figure,[role=button],a.btn,.btn,.button,[data-pet-platform]";
  var TEXTY = { H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, P: 1, LI: 1, BLOCKQUOTE: 1 };
  var platformCache = { t: 0, list: [] };

  function lineRect(el) {
    // the first line of real text, so the pet stands on the letters, not on an empty full-width box
    try {
      var rg = document.createRange(); rg.selectNodeContents(el);
      var rs = rg.getClientRects();
      if (rs.length) {
        var top = rs[0].top, x1 = rs[0].left, x2 = rs[0].right;
        for (var i = 1; i < rs.length; i++) { if (Math.abs(rs[i].top - top) < 3 && rs[i].width > 0) { x1 = Math.min(x1, rs[i].left); x2 = Math.max(x2, rs[i].right); } }
        if (x2 - x1 > 4) return { x1: x1, x2: x2, y: top };
      }
    } catch (e) {}
    return null;
  }

  function scanPlatforms(minWidth) {
    var now = performance.now();
    if (now - platformCache.t < 350) return platformCache.list;
    var out = [], els = document.querySelectorAll(PLATFORM_SEL), vh = innerHeight, vw = innerWidth;
    for (var i = 0; i < els.length && out.length < 160; i++) {
      var el = els[i];
      if (el.closest("[data-pet-ignore],[data-desk-pet],[data-desk-pet-world]")) continue;
      var r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 6 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) continue;
      var seg = TEXTY[el.tagName] ? lineRect(el) : null;
      if (!seg) seg = { x1: r.left, x2: r.right, y: r.top };
      seg.x1 = Math.max(0, seg.x1); seg.x2 = Math.min(vw, seg.x2);
      if (seg.x2 - seg.x1 < minWidth || seg.y < 50 || seg.y > vh - 30) continue;
      // something covering the top edge (e.g. a sticky header)? skip
      var probe = document.elementFromPoint((seg.x1 + seg.x2) / 2, seg.y + 2);
      if (probe && probe !== el && !el.contains(probe) && !probe.contains(el)) continue;
      seg.el = el; seg.heading = /^H[1-3]$/.test(el.tagName); seg.input = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
      out.push(seg);
    }
    platformCache = { t: now, list: out };
    return out;
  }

  function refreshSeg(seg) {
    if (!seg || !seg.el) return seg;
    if (!seg.el.isConnected) return null;
    var fresh = TEXTY[seg.el.tagName] ? lineRect(seg.el) : null;
    if (!fresh) { var r = seg.el.getBoundingClientRect(); fresh = { x1: r.left, x2: r.right, y: r.top }; }
    seg.x1 = Math.max(0, fresh.x1); seg.x2 = Math.min(innerWidth, fresh.x2); seg.y = fresh.y;
    return seg;
  }

  // ---------------------------------------------------------------- global listeners
  var listening = false;
  function listen() {
    if (listening) return; listening = true;
    addEventListener("pointermove", function (e) {
      var m = world.mouse; m.x = e.clientX; m.y = e.clientY; m.t = performance.now();
      if (e.shiftKey && !reduced) { world.laser.on = true; world.laser.x = e.clientX; world.laser.y = e.clientY; world.laser.t = m.t; }
      pets.forEach(function (p) { p._seen(); });
    }, { passive: true });
    addEventListener("keydown", function (e) {
      if (e.key === "Shift") world.laser.t = performance.now();
      var a = document.activeElement;
      if (a && /^(INPUT|TEXTAREA)$/.test(a.tagName) || a && a.isContentEditable) { var t = world.typing; t.n = performance.now() - t.t < 1500 ? t.n + 1 : 1; t.t = performance.now(); t.el = a; }
      pets.forEach(function (p) { p._seen(); });
    });
    addEventListener("keyup", function (e) { if (e.key === "Shift") world.laser.on = false; });
    addEventListener("blur", function () { world.laser.on = false; });
    addEventListener("scroll", function () { world.reading.t = performance.now(); platformCache.t = 0; pets.forEach(function (p) { p._seen(); }); }, { passive: true });
    addEventListener("resize", function () { platformCache.t = 0; });
    var selPoke = 0;
    document.addEventListener("selectionchange", function () {
      var s = document.getSelection();
      if (!s || s.isCollapsed || !s.rangeCount) { world.selection = null; return; }
      var host = s.anchorNode && (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement);
      if (host && host.closest && host.closest("input,textarea,[data-pet-ignore]")) return;
      var rs = s.getRangeAt(0).getClientRects(); if (!rs.length) return;
      var r = rs[0];
      if (r.width < 10) return;
      world.selection = { x1: r.left, x2: r.right, y: r.top, t: performance.now() };
      clearTimeout(selPoke);                   // when the selection settles, a cat drops what it's doing
      selPoke = setTimeout(function () {
        pets.slice().sort(function (a, b) { return (b._sp().selection) - (a._sp().selection); }).forEach(function (p) { if (world.selection) p._poke(); });
      }, 450);
    });
    document.addEventListener("click", function (e) {
      if (!e.altKey || e.defaultPrevented) return;
      if (e.target.closest && e.target.closest("[data-desk-pet]")) return;
      e.preventDefault(); dropFood(e.clientX, e.clientY);
    }, true);
    document.addEventListener("submit", function () { api.celebrate(); }, true);
    document.addEventListener("copy", function () { var p = pets[0]; if (p && Math.random() < .5) p.say("copied! 📋", 1400); });
    document.addEventListener("mouseout", function (e) {
      if (e.relatedTarget || e.clientY > 0) return;
      try { if (sessionStorage.getItem("deskpet:bye")) return; sessionStorage.setItem("deskpet:bye", "1"); } catch (x) {}
      var p = pets[0]; if (p) p.say("wait, don't go! 🥺", 2600);
    });
    document.addEventListener("visibilitychange", function () { pets.forEach(function (p) { p._visible(!document.hidden); }); });
  }

  function dropFood(x, y) {
    var kinds = pets.map(function (p) { return p.kind; });
    var k = kinds[Math.floor(Math.random() * kinds.length)] || "cat";
    var el = document.createElement("div"); el.className = "food"; el.textContent = FOOD[k];
    sharedLayer().appendChild(el);
    var f = { x: x, y: y, vy: 0, el: el, landed: false, kind: k, taken: false };
    world.foods.push(f);
    return f;
  }

  function stepWorld(dt) {
    // food falls onto whatever is below it
    world.foods.forEach(function (f) {
      if (!f.landed) {
        var prev = f.y; f.vy += G * dt; f.y += f.vy * dt;
        var floor = innerHeight - floorOffset();
        var land = f.y >= floor ? floor : null;
        scanPlatforms(20).forEach(function (s) { if (prev <= s.y && f.y >= s.y && f.x >= s.x1 && f.x <= s.x2 && (land == null || s.y < land)) land = s.y; });
        if (land != null) { f.y = land; f.vy = 0; f.landed = true; }
      }
      f.el.style.transform = "translate(" + (f.x - 11) + "px," + (f.y - 22) + "px)";
    });
    // laser dot
    var l = world.laser, le = world.laserEl;
    var lon = l.on && performance.now() - l.t < 2500;
    if (lon && !le) { sharedLayer(); le = world.laserEl; }
    if (le) { le.style.display = lon ? "block" : "none"; if (lon) le.style.transform = "translate(" + l.x + "px," + l.y + "px)"; }
  }
  var floorOffsetValue = 0;
  function floorOffset() { return floorOffsetValue; }

  // ---------------------------------------------------------------- the pet
  function Pet(opt) {
    var self = this;
    var kind = DRAW[opt.pet] ? opt.pet : "cat";
    var SP = SPECIES[kind];
    var pals = PALETTES[kind];
    var pal = pals[opt.color] || pals[Object.keys(pals)[0]];
    var scale = Math.max(1, Math.min(5, parseInt(opt.size, 10) || 3));
    var lines = opt.say ? String(opt.say).split("|").map(function (x) { return x.trim(); }).filter(Boolean) : LINES[kind];
    var outfit = opt.outfit && opt.outfit !== "auto" ? opt.outfit : autoOutfit();
    var climb = opt.climb !== false && opt.climb !== "false" && !reduced;
    var desktop = typeof opt.platforms === "function";
    var stay = !!opt.stay;
    var bottom = parseInt(opt.bottom, 10) || 0;
    floorOffsetValue = Math.max(floorOffsetValue, bottom);
    var k = scale / 3;                                    // speeds scale with pet size
    var jk = k * (typeof opt.platforms === "function" ? 2.2 : 1);   // on a desktop, windows are far apart: jump higher
    this.kind = kind;

    // DOM
    var host = document.createElement("div");
    host.setAttribute("data-desk-pet", kind);
    var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
    var style = document.createElement("style"); style.textContent = CSS; root.appendChild(style);
    var el = document.createElement("div"); el.className = "pet"; el.setAttribute("role", "img");
    el.setAttribute("aria-label", (opt.name ? opt.name + ", a " : "A ") + "pixel " + kind + " living on this page");
    var body = document.createElement("div"); body.className = "body";
    var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    var pw = W * scale, ph = H * scale;
    cv.style.width = pw + "px"; cv.style.height = ph + "px";
    body.appendChild(cv); el.appendChild(body);
    var bubble = document.createElement("div"); bubble.className = "bubble"; el.appendChild(bubble);
    var card = document.createElement("div"); card.className = "card"; el.appendChild(card);
    bubble.style.bottom = card.style.bottom = "calc(100% - " + ((TOP - 3) * scale) + "px)";   // sit just above the head, not the hat headroom
    root.appendChild(el);
    document.body.appendChild(host);
    var ctx = cv.getContext("2d");
    if (!desktop) { listen(); sharedLayer(); }

    // persistent needs (hunger / mood), per pet name
    var KEY = "deskpet:" + kind + ":" + (opt.name || "");
    var needs = { hunger: 20, mood: 70, t: Date.now() };
    try { var sv = JSON.parse(localStorage.getItem(KEY) || "null"); if (sv) needs = sv; } catch (e) {}
    function tickNeeds() {
      var mins = (Date.now() - needs.t) / 60000;
      needs.hunger = Math.min(100, needs.hunger + mins * 0.7);
      needs.mood = Math.max(0, needs.mood - mins * 0.25);
      needs.t = Date.now();
      try { localStorage.setItem(KEY, JSON.stringify(needs)); } catch (e) {}
    }
    tickNeeds();
    function renderCard() {
      var mood = Math.round(needs.mood), hunger = Math.round(needs.hunger);
      card.innerHTML = (opt.name ? "<b>" + esc(opt.name) + "</b> the " + kind + "<br>" : "") +
        "❤️<span class='meter'><i style='width:" + mood + "%;background:#ff6b8b'></i></span>" +
        "🍖<span class='meter'><i style='width:" + (100 - hunger) + "%;background:#ffd166'></i></span>" +
        "<br><small>click to pet · drag to throw" + (desktop ? "" : " · Alt+click to feed") + "</small>" +
        (opt.credit === "false" || opt.credit === false ? "" : "<br><a href='" + REPO + "' target='_blank' rel='noopener'>🐾 get your own desk pet</a>");
    }
    el.addEventListener("pointerenter", function () { tickNeeds(); renderCard(); });
    renderCard();

    // state
    var floorY = function () { return desktop && opt.floor ? opt.floor() : innerHeight - bottom; };
    var st = {
      cx: opt.x != null ? +opt.x + pw / 2 : pw / 2 + Math.random() * Math.max(0, innerWidth - pw),
      fy: 0, vx: 0, vy: 0, air: false, on: null, dir: Math.random() < .5 ? 1 : -1,
      pose: "idle", step: 0, breath: 0, blink: false, wag: false,
      goal: null, until: 0, lastSeen: performance.now(), dragging: false, talkUntil: 0, visible: true
    };
    st.fy = floorY();
    if (opt.y != null) { st.fy = +opt.y; st.air = true; }
    var raf, frameT = 0, last = performance.now(), zTimer = null, guideSteps = parseGuide(opt.guide);

    function say(text, ms) {
      if (!text) return;
      bubble.textContent = text; bubble.classList.add("on"); el.classList.add("talking");
      st.talkUntil = performance.now() + (ms || 2200);
    }
    function fx(chars, n) {
      if (reduced) return;
      for (var i = 0; i < (n || 5); i++) (function (i) {
        setTimeout(function () {
          var h = document.createElement("span"); h.className = "fx"; h.textContent = chars[i % chars.length];
          h.style.left = pw * (.3 + Math.random() * .4) + "px"; h.style.top = ph * .15 + "px";
          h.style.setProperty("--dx", (Math.random() * 40 - 20) + "px");
          el.appendChild(h); setTimeout(function () { h.remove(); }, 1200);
        }, i * 90);
      })(i);
    }
    function pose(p, ms) { st.pose = p; st.until = performance.now() + (ms || 0); if (p === "sleep") startZ(); else stopZ(); }
    function startZ() {
      if (zTimer || reduced) return;
      zTimer = setInterval(function () {
        var z = document.createElement("span"); z.className = "z"; z.textContent = "z";
        z.style.left = pw * (st.dir > 0 ? .72 : .2) + "px"; z.style.top = ph * .3 + "px";
        el.appendChild(z); setTimeout(function () { z.remove(); }, 2400);
      }, 900);
    }
    function stopZ() { clearInterval(zTimer); zTimer = null; }
    function surfaceY() { return st.on ? st.on.y : floorY(); }
    function same(a, b) { return !!a && !!b && (a === b || (a.el && a.el === b.el) || (a.id != null && a.id === b.id)); }
    function platforms() {
      if (desktop) return (opt.platforms() || []).filter(function (s) { return s.x2 - s.x1 >= pw * .6; });
      return climb ? scanPlatforms(pw * .6) : [];
    }

    // ------------------------------------------------------------ movement helpers
    function reach(seg) {                       // can we jump from here onto seg?
      var tx = clampX(st.cx, seg), dx = Math.abs(tx - st.cx), up = surfaceY() - seg.y;
      return dx <= SP.jumpX * jk && up <= SP.jumpUp * jk && Math.abs(up) > 4;
    }
    function clampX(x, seg) {
      var a = seg ? seg.x1 + pw * .35 : pw / 2, b = seg ? seg.x2 - pw * .35 : innerWidth - pw / 2;
      if (a > b) return (a + b) / 2;
      return Math.max(a, Math.min(b, x));
    }
    function jumpTo(seg, x) {                   // ballistic jump that lands on seg at x (seg null = floor)
      var tx = seg ? clampX(x != null ? x : st.cx, seg) : Math.max(pw / 2, Math.min(innerWidth - pw / 2, x != null ? x : st.cx));
      var ty = seg ? seg.y : floorY();
      var dx = tx - st.cx, dy = ty - st.fy;
      var T = Math.max(.42, Math.min(.9, .38 + Math.hypot(dx, dy) / 1100));
      st.vx = dx / T; st.vy = (dy - .5 * G * T * T) / T;
      st.air = true; st.on = null; st.dir = dx >= 0 ? 1 : -1; st.target = seg;
      pose("jump", 0);
    }
    function hop() { if (!st.air) { st.vx = 0; st.vy = -380 * Math.sqrt(k); st.air = true; st.on = null; pose("jump", 0); } }
    // pick a route towards a target surface: jump straight there, or via a stepping stone
    function routeTo(seg, x) {
      if (seg ? same(seg, st.on) : !st.on) { st.goal = { type: "walk", x: x }; return true; }
      var up = surfaceY() - (seg ? seg.y : floorY());
      if (!seg || up <= 0) {                     // going down: just jump / drop
        if (seg && Math.abs(clampX(st.cx, seg) - st.cx) > SP.jumpX * jk * 1.4) { st.goal = { type: "walk", x: Math.max(seg.x1, Math.min(seg.x2, st.cx)) }; return true; }
        jumpTo(seg, x); return true;
      }
      if (reach(seg)) { jumpTo(seg, x); return true; }
      // stepping stone: a reachable platform that gets us closer
      var best = null, bestD = Infinity, tY = seg.y, tX = clampX(x, seg);
      platforms().forEach(function (p) {
        if (same(p, st.on) || !reach(p)) return;
        var d = Math.abs(p.y - tY) + Math.abs(clampX(tX, p) - tX) * .5;
        if (d < bestD && p.y < surfaceY()) { bestD = d; best = p; }
      });
      st.dest = { seg: seg, x: x, t: performance.now() };              // remember where we are really going
      if (best) { jumpTo(best, tX); return true; }
      // walk under it and try again from there
      if (st.on && (tX < st.on.x1 || tX > st.on.x2)) { st.goal = { type: "drop", x: tX }; return true; }
      st.goal = { type: "walk", x: tX }; return true;
    }
    function nearestPlatform(x, y, maxDy) {
      var best = null, bd = Infinity;
      platforms().forEach(function (p) { if (x < p.x1 || x > p.x2) return; var d = Math.abs(p.y - y); if (d < bd && d <= (maxDy || 80)) { bd = d; best = p; } });
      return best;
    }

    // ------------------------------------------------------------ the brain
    function decide(now) {
      tickNeeds(); st.dest = null;
      var hour = new Date().getHours(), night = hour >= 23 || hour < 6;
      if (!desktop && now - st.lastSeen > 30000 && st.pose !== "sleep") { pose("sleep", 1e9); st.goal = null; return; }
      if (stay) { pose(Math.random() < .25 ? "sleep" : "idle", 4000 + Math.random() * 5000); return; }
      if (reduced) { pose(Math.random() < .3 ? "sleep" : "idle", 4000 + Math.random() * 4000); return; }

      // 1. food on the floor or a platform
      var food = world.foods.filter(function (f) { return f.landed && !f.taken && !(f.skip && f.skip[kind]); })
        .sort(function (a, b) { return Math.abs(a.x - st.cx) - Math.abs(b.x - st.cx); })[0];
      if (food && (food.kind === kind || needs.hunger > 30 || Math.random() < .5)) {
        food.taken = true; food.claimT = now; st.goal = { type: "food", food: food };
        var fs = Math.abs(food.y - floorY()) < 3 ? null : nearestPlatform(food.x, food.y, 4);
        say(needs.hunger > 50 ? "FOOD!" : "ooh, snack", 1200);
        routeTo(fs, food.x); st.goal = st.air ? { type: "food", food: food } : { type: "food", food: food, x: food.x };
        return;
      }
      // 2. the pet watches you type
      var tp = world.typing;
      if (!desktop && climb && tp.el && now - tp.t < 3000 && tp.n > 4 && Math.random() < .5) {
        var ts = nearestPlatform(tp.el.getBoundingClientRect().left + 30, tp.el.getBoundingClientRect().top, 6) || null;
        if (ts) { routeTo(ts, ts.x1 + pw); say("watching you type 👀", 1800); st.goal = st.goal || { type: "sit" }; return; }
      }
      // 3. selected text → go and sit on it
      var sel = world.selection;
      if (!desktop && climb && sel && now - sel.t < 8000 && Math.random() < SP.selection) {
        var ss = nearestPlatform((sel.x1 + sel.x2) / 2, sel.y, 30) || { x1: sel.x1, x2: Math.max(sel.x2, sel.x1 + pw), y: sel.y };
        world.selection = null;
        routeTo(ss, (sel.x1 + sel.x2) / 2); st.after = function () { say(kind === "cat" ? "I'm reading this too 📖" : "what's this?", 1800); pose("idle", 3000); };
        return;
      }
      // 4. guided tour step
      if (!desktop && guideSteps.length) {
        for (var gi = 0; gi < guideSteps.length; gi++) {
          var g = guideSteps[gi], gel = g.el();
          if (!gel || g.done()) continue;
          var gr = gel.getBoundingClientRect();
          if (gr.top < 60 || gr.bottom > innerHeight - 20) continue;
          var gs = nearestPlatform(gr.left + gr.width / 2, gr.top, 6);
          var gx = gr.left + Math.min(gr.width, pw * 1.2);
          (function (g) { st.after = function () { pose("happy", 1500); say(g.text, 4200); fx(["👇", "✨"], 3); g.mark(); }; })(g);
          var beside = gr.right + pw * .6 > innerWidth ? gr.left - pw * .6 : gr.right + pw * .6;
          if (gs) routeTo(gs, gx); else if (st.on) jumpTo(null, beside); else st.goal = { type: "walk", x: beside };
          return;
        }
      }
      // 5. follow the reader: sit on a heading near where they are reading
      if (!desktop && climb && now - world.reading.t < 4000 && now - world.reading.t > 350 && Math.random() < SP.read) {
        var hs = platforms().filter(function (p) { return p.heading && p.y > innerHeight * .12 && p.y < innerHeight * .6; });
        if (hs.length) { var h = hs[Math.floor(Math.random() * hs.length)]; routeTo(h, h.x1 + (h.x2 - h.x1) * Math.random()); world.reading.t = 0; return; }
      }
      // 6. other pets: say hi / nap together
      var buddy = pets.filter(function (p) { return p !== self && Math.abs(p._st.fy - st.fy) < 6 && Math.abs(p._st.cx - st.cx) < 320; })[0];
      if (buddy && Math.random() < SP.social) {
        var side = buddy._st.cx > st.cx ? -1 : 1;
        st.goal = { type: "walk", x: buddy._st.cx + side * pw * .8 };
        st.after = function () {
          st.dir = buddy._st.cx > st.cx ? 1 : -1;
          if (buddy._st.pose === "sleep") { pose("sleep", 8000); return; }
          say(["👋", "hi friend!", "💛"][Math.floor(Math.random() * 3)], 1500); fx(["💛"], 2); pose("happy", 1200); buddy._greet(self);
        };
        return;
      }

      // 7. free will, weighted by species and time of day
      var r = Math.random(), w = SP;
      var sleepW = w.sleep * (night ? 3 : 1) + (needs.mood < 25 ? .05 : 0);
      var opts = [["wander", w.wander], ["idle", w.idle], ["sleep", sleepW], ["climb", climb ? w.climb : 0], ["drop", st.on ? w.drop * 2 : 0], ["zoom", w.zoom], ["talk", .05]];
      var total = opts.reduce(function (a, o) { return a + o[1]; }, 0), acc = 0, pick = "idle";
      for (var i = 0; i < opts.length; i++) { acc += opts[i][1] / total; if (r <= acc) { pick = opts[i][0]; break; } }
      switch (pick) {
        case "wander":
          var s = st.on, a = s ? s.x1 + pw * .4 : pw / 2, b = s ? s.x2 - pw * .4 : innerWidth - pw / 2;
          st.goal = { type: "walk", x: a + Math.random() * Math.max(0, b - a) }; break;
        case "climb":
          var cands = platforms().filter(function (p) { return !same(p, st.on) && (reach(p) || p.y > surfaceY()); });
          if (kind === "cat") cands.sort(function (x, y) { return x.y - y.y; });            // cats love high places
          if (cands.length) { var c = cands[Math.floor(Math.random() * Math.min(cands.length, kind === "cat" ? 4 : cands.length))]; routeTo(c, c.x1 + Math.random() * (c.x2 - c.x1)); }
          else st.goal = { type: "walk", x: pw / 2 + Math.random() * (innerWidth - pw) };
          break;
        case "drop":
          st.goal = { type: "drop", x: Math.random() < .5 ? st.on.x1 - pw * .2 : st.on.x2 + pw * .2 }; break;
        case "zoom":
          st.goal = { type: "zoom", left: 4 + Math.floor(Math.random() * 3) }; say("ZOOMIES!", 1400); break;
        case "sleep":
          var n = w.nap; pose("sleep", (n[0] + Math.random() * (n[1] - n[0])) * 1000); if (night && Math.random() < .4) say("it's late… 😴", 1600); break;
        case "talk":
          say(needs.hunger > 70 ? "I'm hungry… (Alt+click)" : lines[Math.floor(Math.random() * lines.length)]); pose("idle", 2200); break;
        default:
          pose("idle", 1500 + Math.random() * 3000);
      }
      if (Math.random() < .12 && pick !== "talk") say(lines[Math.floor(Math.random() * lines.length)]);
    }

    function arrive() {
      st.goal = null;
      var D = st.dest;
      if (D) {
        if (D.seg && D.seg.el) D.seg = refreshSeg(D.seg);
        var there = D.seg ? same(st.on, D.seg) : !st.on;
        if (!there && D.seg && performance.now() - D.t < 15000) { pose("idle", 0); routeTo(D.seg, D.x); if (st.dest === D && !st.air && !st.goal) st.dest = null; return; }
        st.dest = null;
      }
      if (st.after) { var f = st.after; st.after = null; f(); return; }
      pose("idle", 1200 + Math.random() * 2500);
    }

    // ------------------------------------------------------------ frame loop
    function tick(now) {
      var dt = Math.min(48, now - last) / 1000; last = now;
      if (!st.visible) { raf = requestAnimationFrame(tick); return; }
      if (pets[0] === self && !desktop) stepWorld(dt);
      if (st.talkUntil && now > st.talkUntil) { bubble.classList.remove("on"); el.classList.remove("talking"); st.talkUntil = 0; }
      var fl = floorY();

      if (!st.dragging) {
        var wasOn = st.on;
        if (st.on && !desktop) { st.on = refreshSeg(st.on); }
        if (st.on && desktop) { st.on = (opt.platforms() || []).filter(function (p) { return p.id === st.on.id; })[0] || null; }
        if (wasOn && !st.on && !st.air) { st.air = true; st.vy = 0; st.vx = 0; }
        if (st.on && (st.on.y < ph * .6 || st.on.y > fl - 4 || st.cx < st.on.x1 - pw * .15 || st.cx > st.on.x2 + pw * .15)) {
          st.on = null; st.air = true; st.vy = -60; st.vx = st.dir * 40;                   // the ground disappeared / walked off the edge
        }
        if (!st.air) st.fy = surfaceY();

        // laser pointer chase
        var L = world.laser;
        if (!desktop && L.on && now - L.t < 2500 && SP.laser > 0) {
          if (st.pose === "sleep") { pose("idle", 0); say("!", 600); }
          if (!st.air && !(st.goal && st.goal.type === "laser")) st.goal = { type: "laser" };
        } else if (st.goal && st.goal.type === "laser") { st.goal = null; pose("idle", 800); }

        // curious about the cursor near the floor
        var M = world.mouse;
        if (!desktop && !st.air && !st.goal && st.pose !== "sleep" && M.t && now - M.t < 1200 && !stay && !reduced &&
            M.y > fl - ph * 2.2 && !st.on && Math.random() < SP.cursor * .05) {
          var gap = M.x - st.cx;
          if (Math.abs(gap) < pw * 3.5 && Math.abs(gap) > pw) st.goal = { type: "walk", x: M.x - Math.sign(gap) * pw * .9 };
        }

        if (st.air) {
          var prevY = st.fy;
          st.vy += G * dt; st.cx += st.vx * dt; st.fy += st.vy * dt;
          if (st.cx < pw / 2) { st.cx = pw / 2; st.vx = Math.abs(st.vx) * .4; }
          if (st.cx > innerWidth - pw / 2) { st.cx = innerWidth - pw / 2; st.vx = -Math.abs(st.vx) * .4; }
          if (st.fy < ph * .5 && st.vy < 0) st.vy *= .5;
          if (st.vy > 0) {                                   // landing
            var land = null;
            if (!desktop) platformCache.t = 0;
            platforms().forEach(function (p) {
              if (st.target && !same(p, st.target) && p.y < st.target.y - 2) return;   // aiming lower: drop through text on the way
              if (prevY <= p.y + 1 && st.fy >= p.y && st.cx >= p.x1 && st.cx <= p.x2 && (!land || p.y < land.y)) land = p;
            });
            if (land) { st.on = land; st.fy = land.y; }
            else if (st.fy >= fl) { st.on = null; st.fy = fl; land = true; }
            if (land) {
              var hard = st.vy > 1400;
              st.air = false; st.vx = 0; st.vy = 0; st.target = null;
              if (st.goal && st.goal.type !== "food" && st.goal.type !== "laser" && st.goal.type !== "drop") st.goal = null;
              if (hard) { say(kind === "cat" ? "*lands perfectly*" : kind === "dog" ? "again! again!" : "khalas… 😵", 1300); }
              if (!st.goal) arrive(); else pose("idle", 0);
            }
          }
        } else if (st.goal) {
          var g = st.goal, sp = (g.type === "zoom" || g.type === "laser" || (g.type === "food" && needs.hunger > 50) ? SP.run : SP.speed) * k;
          var tx = g.x;
          if (g.type === "laser") {
            tx = L.x;
            var ls = nearestPlatform(L.x, L.y + 2, 40);
            var lsY = ls ? ls.y : fl;
            if (Math.abs(lsY - surfaceY()) > 8 && Math.abs(L.y - surfaceY()) > ph * .6) {
              if (ls && !same(ls, st.on) && reach(ls)) { jumpTo(ls, L.x); st.goal = { type: "laser" }; }
              else if (!ls && st.on && L.y > surfaceY()) { jumpTo(null, L.x); st.goal = { type: "laser" }; }
            }
            if (Math.abs(tx - st.cx) < pw * .25 && !st.air && Math.random() < .03) { hop(); st.goal = { type: "laser" }; }
          }
          if (g.type === "food" && g.food && now - (g.food.claimT || now) > 9000) {   // can't reach it: let someone else try
            g.food.taken = false; (g.food.skip = g.food.skip || {})[kind] = true;
            st.goal = null; say(kind === "cat" ? "hmph 😿" : kind === "dog" ? "too high… 🥺" : "not worth it", 1400); pose("idle", 1500);
            g = { type: "none" };
          }
          if (g.type === "food" && g.food) {
            tx = g.food.x;
            var foodSurf = Math.abs(g.food.y - surfaceY()) < 4;
            if (!foodSurf && !st.air) { var fs2 = Math.abs(g.food.y - fl) < 3 ? null : nearestPlatform(g.food.x, g.food.y, 4); routeTo(fs2, g.food.x); st.goal = { type: "food", food: g.food }; }
            if (foodSurf && Math.abs(tx - st.cx) < pw * .3) {
              var idx = world.foods.indexOf(g.food); if (idx >= 0) world.foods.splice(idx, 1);
              g.food.el.remove(); st.goal = null;
              needs.hunger = Math.max(0, needs.hunger - 45); needs.mood = Math.min(100, needs.mood + 12); tickNeeds();
              pose("happy", 1300); fx(["😋", "💛"], 4); say(kind === "camel" ? "shukran! 🌴" : "yum!", 1400);
            }
          }
          if (g.type === "zoom") {
            if (g.x == null || Math.abs(g.x - st.cx) < 4) { if (g.left-- <= 0) { st.goal = null; pose("idle", 1500); } else g.x = st.cx > innerWidth / 2 ? pw : innerWidth - pw; }
            tx = g.x;
          }
          if (g.type === "drop" && st.on) {
            tx = g.x;
            if (st.cx <= st.on.x1 + 2 || st.cx >= st.on.x2 - 2) { st.on = null; st.air = true; st.vx = st.dir * sp; st.vy = -160; pose("jump", 0); st.goal = null; }
          } else if (g.type === "drop") { st.goal = null; }
          if (st.goal && tx != null) {
            var lo = st.on ? st.on.x1 + (g.type === "drop" ? -pw : pw * .35) : pw / 2, hi = st.on ? st.on.x2 - (g.type === "drop" ? -pw : pw * .35) : innerWidth - pw / 2;
            var dest = Math.max(lo, Math.min(hi, tx)), d = dest - st.cx;
            st.dir = d >= 0 ? 1 : -1;
            if (Math.abs(d) < 2) { if (g.type === "walk") arrive(); else if (g.type === "food" && !g.food) arrive(); }
            else { st.cx += Math.sign(d) * Math.min(Math.abs(d), sp * dt); if (st.pose !== "walk") pose("walk", 0); }
            if (g.type === "laser" && Math.abs(d) < 2) pose("idle", 0);
          }
        } else if (now > st.until) decide(now);
      }

      // pixel animation ~8 fps
      if (now - frameT > (st.pose === "walk" ? (st.goal && (st.goal.type === "zoom" || st.goal.type === "laser") ? 80 : 140) : 260)) {
        frameT = now; st.step++;
        st.breath = st.pose === "sleep" ? 0 : (st.step % 6 < 3 ? 0 : 1);
        st.wag = st.step % 2 === 0;
        st.blink = st.pose !== "sleep" && Math.random() < .07;
        var drawPose = st.pose === "jump" ? (st.vy < 0 ? "happy" : "walk") : st.pose;
        paint(ctx, kind, pal, { pose: drawPose, step: st.step, breath: st.breath, wag: st.wag, blink: st.blink }, outfit);
      }
      el.classList.toggle("flip", st.dir < 0);
      el.classList.toggle("air", st.air || st.dragging);
      var lift = st.pose === "happy" && !st.air && !st.dragging ? 6 : 0;
      el.style.transform = "translate(" + Math.round(st.cx - pw / 2) + "px," + Math.round(st.fy - ph - lift) + "px)";
      raf = requestAnimationFrame(tick);
    }

    // ------------------------------------------------------------ interaction: pet, carry, throw
    var down = null, hist = [];
    el.addEventListener("pointerdown", function (e) {
      down = { x: e.clientX, y: e.clientY, cx: st.cx, fy: st.fy, moved: false };
      hist = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
      if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    el.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (!down.moved && Math.hypot(dx, dy) > 6) { down.moved = true; st.dragging = true; st.on = null; st.air = false; stopZ(); st.pose = "happy"; st.goal = null; if (opt.onDrag) opt.onDrag(true); }
      if (down.moved) {
        st.cx = Math.max(pw / 2, Math.min(innerWidth - pw / 2, down.cx + dx)); st.fy = Math.min(floorY(), down.fy + dy);
        hist.push({ x: e.clientX, y: e.clientY, t: performance.now() }); if (hist.length > 6) hist.shift();
      }
    });
    function up() {
      if (!down) return;
      if (!down.moved) {
        self._seen();
        if (st.pose === "sleep") { pose("idle", 1500); say("*yawn*", 1400); }
        else { pose("happy", 1300); fx(["💖", "💛"], 5); needs.mood = Math.min(100, needs.mood + 8); tickNeeds(); say(lines[Math.floor(Math.random() * lines.length)], 1600); }
        if (opt.onPet) opt.onPet();
      } else {
        // throw: velocity from the last pointer moves
        var a = hist[0], b = hist[hist.length - 1], t = Math.max(16, b.t - a.t) / 1000;
        st.vx = Math.max(-1600, Math.min(1600, (b.x - a.x) / t)); st.vy = Math.max(-1600, Math.min(1600, (b.y - a.y) / t));
        st.dragging = false; st.air = true; st.on = null; pose("jump", 0);
        if (Math.hypot(st.vx, st.vy) > 900) say(kind === "cat" ? "wheee!" : kind === "dog" ? "WHEEE! 🐶" : "ya salaam!", 1200);
        if (opt.onDrag) opt.onDrag(false);
      }
      down = null;
    }
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("dblclick", function () { hop(); });
    if (opt.onHover) { el.addEventListener("pointerenter", function () { opt.onHover(true); }); el.addEventListener("pointerleave", function () { if (!down) opt.onHover(false); }); }

    // ------------------------------------------------------------ public bits
    this._st = st;
    this._seen = function () {
      st.lastSeen = performance.now();
      if (st.pose === "sleep" && st.until - performance.now() > 1e8) { pose("idle", 1200); say("!", 800); }
    };
    this._sp = function () { return SP; };
    this._poke = function () {
      if (st.air || st.dragging || stay || desktop || (st.goal && st.goal.type !== "walk")) return;
      st.goal = null; if (st.pose === "sleep") say("!", 600); pose("idle", 0); decide(performance.now());
    };
    this._visible = function (v) { st.visible = v; last = performance.now(); };
    this._greet = function (other) { if (st.pose === "sleep" || st.air) return; st.dir = other._st.cx > st.cx ? 1 : -1; setTimeout(function () { say("👋", 1200); pose("happy", 1000); }, 450); };
    this.say = function (t, ms) { say(t, ms); return self; };
    this.feed = function () { needs.hunger = Math.max(0, needs.hunger - 45); needs.mood = Math.min(100, needs.mood + 10); tickNeeds(); pose("happy", 1300); fx(["😋", "💛"], 4); return self; };
    this.celebrate = function () { if (!st.air && !st.dragging) { hop(); } fx(["🎉", "✨", "💛"], 6); say(kind === "camel" ? "Mabrook! 🎉" : "yay! 🎉", 1800); return self; };
    this.sleep = function (ms) { pose("sleep", ms || 1e9); st.goal = null; return self; };
    this.wake = function () { pose("idle", 1000); return self; };
    this.moveTo = function (x) {                 // a number (x on the current surface) or an element to climb onto
      if (x && x.nodeType === 1) {
        var seg = null; platforms().forEach(function (p) { if (!seg && (p.el === x || (p.el && x.contains(p.el)))) seg = p; });
        if (seg) { st.dest = null; routeTo(seg, (seg.x1 + seg.x2) / 2); return self; }
        var r = x.getBoundingClientRect(); x = r.left + r.width / 2;
      }
      st.goal = { type: "walk", x: +x }; return self;
    };
    this.remove = function () { cancelAnimationFrame(raf); stopZ(); host.remove(); pets = pets.filter(function (p) { return p !== self; }); };

    pose("idle", 1200);
    paint(ctx, kind, pal, st, outfit);
    raf = requestAnimationFrame(tick);
    if (!reduced && opt.greet !== false) setTimeout(function () {
      if (!desktop && /404|not found/i.test(document.title)) { say("lost? 🥺 the home page is nice", 3500); return; }
      say(opt.name ? "Hi, I'm " + opt.name + "!" : lines[0], 2400);
    }, 900);
  }

  function parseGuide(s) {
    if (!s) return [];
    return String(s).split(";;").map(function (part) {
      var i = part.indexOf("|"); if (i < 0) return null;
      var sel = part.slice(0, i).trim(), text = part.slice(i + 1).trim(), key = "deskpet:guide:" + sel;
      return {
        text: text,
        el: function () { try { return document.querySelector(sel); } catch (e) { return null; } },
        done: function () { try { return sessionStorage.getItem(key) === "1"; } catch (e) { return false; } },
        mark: function () { try { sessionStorage.setItem(key, "1"); } catch (e) {} }
      };
    }).filter(Boolean);
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  var api = {
    version: "2.0.0",
    pets: Object.keys(DRAW),
    colors: { cat: Object.keys(PALETTES.cat), camel: Object.keys(PALETTES.camel), dog: Object.keys(PALETTES.dog) },
    outfits: ["auto", "none", "santa", "party", "crown", "uae", "ramadan", "witch"],
    spawn: function (opt) { var p = new Pet(opt || {}); pets.push(p); return p; },
    removeAll: function () { pets.slice().forEach(function (p) { p.remove(); }); pets = []; world.foods.forEach(function (f) { f.el.remove(); }); world.foods = []; },
    celebrate: function () { pets.forEach(function (p) { p.celebrate(); }); },
    feed: function (x, y) { return dropFood(x != null ? x : innerWidth / 2, y != null ? y : innerHeight / 3); },
    list: function () { return pets.slice(); },
    autoOutfit: autoOutfit,
    _paint: function (canvas, kind, color, pose, step, outfit) {
      var pals = PALETTES[kind]; paint(canvas.getContext("2d"), kind, pals[color] || pals[Object.keys(pals)[0]],
        { pose: pose || "idle", step: step || 0, breath: 0, wag: false, blink: false }, outfit || "none");
    }
  };
  window.DeskPet = api;

  var me = document.currentScript;
  function boot() {
    if (!me || me.getAttribute("data-auto") === "false") return;
    var d = me.dataset;
    api.spawn({ pet: d.pet, color: d.color, name: d.name, size: d.size, say: d.say, credit: d.credit, bottom: d.bottom, outfit: d.outfit, guide: d.guide, climb: d.climb });
  }
  if (document.body) boot(); else document.addEventListener("DOMContentLoaded", boot);
})();
