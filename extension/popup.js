(function () {
  var DEF = { on: true, pet: "cat", color: "ginger", name: "Mishmish", size: 3, outfit: "auto", climb: true, two: false, off: [] };
  var NAMES = { cat: "Mishmish", dog: "Biscuit", camel: "Habibi" };
  var $ = function (id) { return document.getElementById(id); };
  var C, host = "";
  function colors() {
    var list = DeskPet.colors[$("pet").value], cur = $("color").value;
    $("color").innerHTML = list.map(function (c) { return "<option value='" + c + "'>" + c[0].toUpperCase() + c.slice(1) + "</option>"; }).join("");
    if (list.indexOf(cur) >= 0) $("color").value = cur;
  }
  function preview() { DeskPet._paint($("pv"), $("pet").value, $("color").value, "idle", 0, $("outfit").value === "auto" ? DeskPet.autoOutfit() : $("outfit").value); }
  function save() {
    var off = (C.off || []).filter(function (h) { return h !== host; }); if ($("site").checked && host) off.push(host);
    C = { on: $("on").checked, pet: $("pet").value, color: $("color").value, name: $("name").value.trim(), size: +$("size").value,
          outfit: $("outfit").value, climb: $("climb").checked, two: $("two").checked, off: off };
    chrome.storage.sync.set(C); preview();
  }
  function send(cmd) { chrome.tabs.query({ active: true, currentWindow: true }, function (t) { if (t[0]) chrome.tabs.sendMessage(t[0].id, { cmd: cmd }, function () { void chrome.runtime.lastError; }); }); }
  chrome.tabs.query({ active: true, currentWindow: true }, function (t) {
    try { host = new URL(t[0].url).hostname; } catch (e) {}
    $("host").textContent = host || "this site"; if (!host) $("site").disabled = true;
    chrome.storage.sync.get(DEF, function (c) {
      C = c; $("on").checked = c.on; $("pet").value = c.pet; colors(); $("color").value = c.color; $("name").value = c.name; $("size").value = c.size;
      $("outfit").value = c.outfit; $("climb").checked = c.climb; $("two").checked = c.two; $("site").checked = (c.off || []).indexOf(host) >= 0; preview();
    });
  });
  $("pet").addEventListener("change", function () { var n = $("name").value; if (!n || Object.values(NAMES).indexOf(n) >= 0) $("name").value = NAMES[this.value]; colors(); save(); });
  ["on", "color", "outfit", "size", "climb", "two", "site"].forEach(function (id) { $(id).addEventListener("change", save); });
  $("name").addEventListener("change", save);
  $("feed").addEventListener("click", function () { send("feed"); });
  $("party").addEventListener("click", function () { send("party"); });
})();
