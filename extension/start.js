/* Desk Pet extension · Designed & Developed by Sahil Zaini / Zaini Developers · Powered by YCS Trust */
(function () {
  var DEF = { on: true, pet: "cat", color: "ginger", name: "Mishmish", size: 3, outfit: "auto", climb: true, two: false, off: [] };
  var host = location.hostname;
  function apply(c) {
    if (!window.DeskPet) return;
    DeskPet.removeAll();
    if (!c.on || (c.off || []).indexOf(host) >= 0) return;
    DeskPet.spawn({ pet: c.pet, color: c.color, name: c.name || undefined, size: +c.size || 3, outfit: c.outfit, climb: c.climb });
    if (c.two) DeskPet.spawn({ pet: c.pet === "camel" ? "cat" : "camel", size: +c.size || 3, outfit: c.outfit, climb: c.climb, greet: false });
  }
  chrome.storage.sync.get(DEF, apply);
  chrome.storage.onChanged.addListener(function () { chrome.storage.sync.get(DEF, apply); });
  chrome.runtime.onMessage.addListener(function (m) {
    if (!window.DeskPet) return;
    if (m.cmd === "feed") DeskPet.feed(innerWidth / 2, innerHeight * .3);
    if (m.cmd === "party") DeskPet.celebrate();
  });
})();
