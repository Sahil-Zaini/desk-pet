/*!
 * Desk Pet v1.0 — a tiny pixel pet that lives on your website.
 * https://github.com/sahil-zaini/desk-pet · MIT © Sahil Zaini
 *
 * <script src="https://sahil-zaini.github.io/desk-pet/pet.js" data-pet="cat" defer></script>
 *
 * Options (data-attributes on the script tag):
 *   data-pet     cat | camel | dog              (default: cat)
 *   data-color   cat: ginger | black | white | grey · dog: brown | golden | husky
 *   data-name    shown when you hover the pet    (default: none)
 *   data-size    1 – 5 pixel scale               (default: 3)
 *   data-say     custom lines, separated by |    (e.g. "Hello!|Welcome to my site")
 *   data-bottom  lift the pet N pixels above the bottom edge (e.g. over a cookie bar)
 *   data-credit  "false" hides the small credit link in the hover card
 *
 * JavaScript: DeskPet.spawn({ pet, color, name, size, say, bottom }) · DeskPet.removeAll()
 */
(function () {
  "use strict";
  if (window.DeskPet && window.DeskPet.version) return;

  var W = 32, H = 24;           // logical pixel canvas
  var REPO = "https://github.com/sahil-zaini/desk-pet";

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
  var LINES = {
    cat: ["meow", "mrrp?", "🐟?", "purrr…", "pet me", "*stretches*"],
    camel: ["Marhaba!", "Yalla!", "Habibi 🐪", "need water…", "dates? 🌴", "zzz… desert nap"],
    dog: ["woof!", "ball? 🎾", "*wags*", "good human", "walkies?", "🦴?"]
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

  function paint(ctx, kind, pal, s) {
    var parts = DRAW[kind](s);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = pal.o;
    parts.forEach(function (r) { ctx.fillRect(r[0] - 1, r[1] - 1, r[2] + 2, r[3] + 2); });
    parts.forEach(function (r) { ctx.fillStyle = pal[r[4]] || pal.f; ctx.fillRect(r[0], r[1], r[2], r[3]); });
  }

  // ---------------------------------------------------------------- styles
  var CSS = "" +
    ":host{all:initial}" +
    ".pet{position:fixed;left:0;bottom:0;z-index:2147483000;touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab;will-change:transform}" +
    ".pet:active{cursor:grabbing}" +
    ".body{display:block;transform-origin:50% 100%}" +
    ".flip .body{transform:scaleX(-1)}" +
    "canvas{display:block;image-rendering:pixelated;image-rendering:crisp-edges}" +
    ".bubble{position:absolute;bottom:calc(100% + 4px);left:50%;transform:translateX(-50%);white-space:nowrap;font:600 12px/1.2 system-ui,-apple-system,'Segoe UI',sans-serif;color:#1d1d24;background:#fff;border:2px solid #1d1d24;border-radius:10px;padding:4px 8px;box-shadow:2px 2px 0 #1d1d24;opacity:0;transition:opacity .2s;pointer-events:none}" +
    ".bubble.on{opacity:1}" +
    ".bubble:after{content:'';position:absolute;left:50%;top:100%;transform:translateX(-50%);border:6px solid transparent;border-top-color:#1d1d24}" +
    ".z{position:absolute;font:700 13px/1 ui-monospace,Menlo,monospace;color:#6c7aa8;pointer-events:none;animation:z 2.4s linear infinite;opacity:0}" +
    "@keyframes z{0%{opacity:0;transform:translate(0,0) scale(.7)}20%{opacity:1}100%{opacity:0;transform:translate(14px,-34px) scale(1.2)}}" +
    ".heart{position:absolute;pointer-events:none;font-size:16px;animation:h 1.1s ease-out forwards}" +
    "@keyframes h{from{opacity:1;transform:translate(0,0) scale(.6)}to{opacity:0;transform:translate(var(--dx),-46px) scale(1.2)}}" +
    ".card{position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);font:12px/1.35 system-ui,-apple-system,'Segoe UI',sans-serif;background:#1d1d24;color:#fff;border-radius:8px;padding:6px 9px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .15s}" +
    ".pet:hover .card{opacity:1;pointer-events:auto}" +
    ".pet.talking .card,.pet.dragging .card{opacity:0!important}" +
    ".card b{font-weight:700}.card a{color:#ffd166;text-decoration:none}.card a:hover{text-decoration:underline}" +
    "@media (prefers-reduced-motion:reduce){.z,.heart{animation:none;display:none}}";

  // ---------------------------------------------------------------- pet
  var pets = [];
  var reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function Pet(opt) {
    var kind = DRAW[opt.pet] ? opt.pet : "cat";
    var pals = PALETTES[kind];
    var pal = pals[opt.color] || pals[Object.keys(pals)[0]];
    var scale = Math.max(1, Math.min(5, parseInt(opt.size, 10) || 3));
    var lines = opt.say ? String(opt.say).split("|").map(function (x) { return x.trim(); }).filter(Boolean) : LINES[kind];

    var host = document.createElement("div");
    host.setAttribute("data-desk-pet", kind);
    var root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
    var style = document.createElement("style"); style.textContent = CSS; root.appendChild(style);

    var el = document.createElement("div"); el.className = "pet"; el.setAttribute("role", "img");
    el.setAttribute("aria-label", (opt.name ? opt.name + ", a " : "A ") + "pixel " + kind + " walking on this page");
    var body = document.createElement("div"); body.className = "body";
    var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    cv.style.width = W * scale + "px"; cv.style.height = H * scale + "px";
    body.appendChild(cv); el.appendChild(body);
    var bubble = document.createElement("div"); bubble.className = "bubble"; el.appendChild(bubble);
    var card = document.createElement("div"); card.className = "card";
    card.innerHTML = (opt.name ? "<b>" + esc(opt.name) + "</b> · " : "") + "click to pet, drag to carry" +
      (opt.credit === "false" ? "" : "<br><a href='" + REPO + "' target='_blank' rel='noopener'>🐾 get your own desk pet</a>");
    el.appendChild(card);
    el.style.bottom = (parseInt(opt.bottom, 10) || 0) + "px";
    root.appendChild(el);
    document.body.appendChild(host);

    var ctx = cv.getContext("2d");
    var pw = W * scale, ph = H * scale;
    var st = {
      x: opt.x != null ? +opt.x : Math.random() * Math.max(0, innerWidth - pw), y: 0, vy: 0, dir: Math.random() < .5 ? 1 : -1,
      pose: "idle", step: 0, breath: 0, blink: false, wag: false,
      until: 0, target: null, lastSeen: performance.now(), dragging: false, talkUntil: 0
    };
    var mouse = { x: -1, y: -1, t: 0 };
    var keep = pw * (0.7 + Math.random() * 0.6);   // personal space from the cursor
    var raf, frameT = 0, last = performance.now(), zTimer = null;

    function say(text, ms) {
      bubble.textContent = text; bubble.classList.add("on"); el.classList.add("talking");
      st.talkUntil = performance.now() + (ms || 2200);
    }
    function setPose(p, ms) { st.pose = p; st.until = performance.now() + ms; if (p === "sleep") startZ(); else stopZ(); }
    function startZ() {
      if (zTimer || reduced) return;
      zTimer = setInterval(function () {
        var z = document.createElement("span"); z.className = "z"; z.textContent = "z";
        z.style.left = pw * (st.dir > 0 ? .72 : .2) + "px"; z.style.top = ph * .25 + "px";
        el.appendChild(z); setTimeout(function () { z.remove(); }, 2400);
      }, 900);
    }
    function stopZ() { clearInterval(zTimer); zTimer = null; }
    function hearts() {
      for (var i = 0; i < 5; i++) (function (i) {
        setTimeout(function () {
          var h = document.createElement("span"); h.className = "heart"; h.textContent = i % 2 ? "💛" : "💖";
          h.style.left = pw * (.3 + Math.random() * .4) + "px"; h.style.top = ph * .1 + "px";
          h.style.setProperty("--dx", (Math.random() * 40 - 20) + "px");
          el.appendChild(h); setTimeout(function () { h.remove(); }, 1200);
        }, i * 90);
      })(i);
    }

    function decide(now) {
      if (now - st.lastSeen > 30000 && st.pose !== "sleep") { setPose("sleep", 1e9); return; }
      if (st.pose === "sleep") return;
      var r = Math.random();
      if (reduced) { setPose(r < .3 ? "sleep" : "idle", 4000 + Math.random() * 4000); return; }
      if (r < .55) { st.target = Math.random() * Math.max(0, innerWidth - pw); setPose("walk", 9000); }
      else if (r < .9) setPose("idle", 1800 + Math.random() * 3200);
      else setPose("sleep", 6000 + Math.random() * 6000);
      if (Math.random() < .18) say(lines[Math.floor(Math.random() * lines.length)]);
    }

    function tick(now) {
      var dt = Math.min(64, now - last) / 1000; last = now;
      if (st.talkUntil && now > st.talkUntil) { bubble.classList.remove("on"); el.classList.remove("talking"); st.talkUntil = 0; }

      if (!st.dragging) {
        // gravity (after being dropped)
        if (st.y > 0 || st.vy) { st.vy -= 1400 * dt; st.y += st.vy * dt; if (st.y <= 0) { st.y = 0; st.vy = 0; setPose("happy", 700); } }
        // curious: walk to a recently moved cursor near the bottom
        if (mouse.t && now - mouse.t < 1500 && st.pose !== "sleep" && !reduced && mouse.y > innerHeight - 220) {
          var mx = mouse.x - pw / 2, gap = mx - st.x;
          // only notice a cursor that is fairly close, and stop at this pet's own distance from it
          if (Math.abs(gap) < pw * 3.5 && Math.abs(gap) > keep) {
            st.target = mx - Math.sign(gap) * keep;
            if (st.pose !== "walk") setPose("walk", 4000);
          }
        }
        if (st.pose === "walk" && st.target != null) {
          var d = st.target - st.x;
          st.dir = d >= 0 ? 1 : -1;
          var sp = 48 * (scale / 3);
          if (Math.abs(d) < 2) { st.target = null; setPose("idle", 1500 + Math.random() * 2500); }
          else st.x += Math.sign(d) * Math.min(Math.abs(d), sp * dt);
        }
        if (now > st.until && st.y === 0) decide(now);
      }
      st.x = Math.max(0, Math.min(innerWidth - pw, st.x));

      // pixel animation at ~8 fps
      if (now - frameT > (st.pose === "walk" ? 140 : 260)) {
        frameT = now; st.step++;
        st.breath = st.pose === "sleep" ? 0 : (st.step % 6 < 3 ? 0 : 1);
        st.wag = st.step % 2 === 0;
        st.blink = st.pose !== "sleep" && Math.random() < .07;
        paint(ctx, kind, pal, st);
      }
      el.classList.toggle("flip", st.dir < 0);
      el.style.transform = "translate(" + Math.round(st.x) + "px," + Math.round(-st.y - (st.pose === "happy" && !st.dragging ? 6 : 0)) + "px)";
      raf = requestAnimationFrame(tick);
    }

    // interaction: click = pet, drag = carry
    var down = null;
    el.addEventListener("pointerdown", function (e) {
      down = { x: e.clientX, y: e.clientY, sx: st.x, sy: st.y, moved: false };
      el.setPointerCapture && el.setPointerCapture(e.pointerId);
    });
    el.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (!down.moved && Math.hypot(dx, dy) > 6) { down.moved = true; st.dragging = true; el.classList.add("dragging"); stopZ(); st.pose = "happy"; }
      if (down.moved) { st.x = down.sx + dx; st.y = Math.max(0, down.sy - dy); st.vy = 0; }
    });
    function up() {
      if (!down) return;
      if (!down.moved) {
        st.lastSeen = performance.now();
        if (st.pose === "sleep") { setPose("idle", 1500); say("*yawn*", 1400); }
        else { setPose("happy", 1300); hearts(); say(lines[Math.floor(Math.random() * lines.length)], 1600); }
      } else { st.dragging = false; el.classList.remove("dragging"); st.vy = 0; if (st.y === 0) setPose("happy", 600); else st.until = performance.now() + 9999; }
      down = null;
    }
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("dblclick", function () { if (!st.y) st.vy = 420; });

    function onMove(e) {
      mouse.x = e.clientX; mouse.y = e.clientY; mouse.t = performance.now();
      st.lastSeen = mouse.t;
      if (st.pose === "sleep" && Math.abs(e.clientX - (st.x + pw / 2)) < pw && e.clientY > innerHeight - ph * 1.6) { setPose("idle", 1500); say("!", 900); }
    }
    function onKey() { st.lastSeen = performance.now(); }
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("keydown", onKey);

    setPose("idle", 1200);
    paint(ctx, kind, pal, st);
    raf = requestAnimationFrame(tick);
    if (!reduced) setTimeout(function () { say(opt.name ? "Hi, I'm " + opt.name + "!" : lines[0], 2400); }, 900);

    this.remove = function () {
      cancelAnimationFrame(raf); stopZ();
      removeEventListener("pointermove", onMove); removeEventListener("keydown", onKey);
      host.remove();
    };
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  var api = {
    version: "1.0.0",
    pets: Object.keys(DRAW),
    colors: { cat: Object.keys(PALETTES.cat), camel: Object.keys(PALETTES.camel), dog: Object.keys(PALETTES.dog) },
    spawn: function (opt) { var p = new Pet(opt || {}); pets.push(p); return p; },
    removeAll: function () { pets.forEach(function (p) { p.remove(); }); pets = []; },
    _paint: function (canvas, kind, color, pose, step) {   // used by the demo page for previews
      var pals = PALETTES[kind]; paint(canvas.getContext("2d"), kind, pals[color] || pals[Object.keys(pals)[0]],
        { pose: pose || "idle", step: step || 0, breath: 0, wag: false, blink: false });
    }
  };
  window.DeskPet = api;

  var me = document.currentScript;
  function boot() {
    if (!me || me.getAttribute("data-auto") === "false") return;
    var d = me.dataset;
    api.spawn({ pet: d.pet, color: d.color, name: d.name, size: d.size, say: d.say, credit: d.credit, bottom: d.bottom });
  }
  if (document.body) boot(); else document.addEventListener("DOMContentLoaded", boot);
})();
