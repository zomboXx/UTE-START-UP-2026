(() => {
  const script = document.currentScript;
  const endpoint = script.dataset.endpoint;
  const isDemo = script.dataset.page === "demo";
  if (!endpoint || !window.crypto?.randomUUID) return;
  const preferenceKey = "brain10-analytics-choice";
  const sessionKey = "brain10-analytics-session";
  let choice;
  try { choice = localStorage.getItem(preferenceKey); } catch { return; }
  const control = document.getElementById("analytics-choice");
  let lastTick = Date.now();
  let lastInteraction = lastTick;
  let session;
  let reportedDemo;

  function send(kind, activeMs = 0) {
    const now = Date.now();
    if (choice !== "yes") return;
    if (!session || now - session.last > 30 * 60000 || now - session.start > 3600000) {
      session = { id: crypto.randomUUID(), start: now, last: now };
      reportedDemo = undefined;
    }
    if (isDemo && kind !== "demo_start" && reportedDemo !== session.id) {
      reportedDemo = session.id;
      send("demo_start");
    }
    session.last = now;
    sessionStorage.setItem(sessionKey, JSON.stringify(session));
    fetch(endpoint, { method: "POST", mode: "cors", keepalive: true, credentials: "omit",
      headers: { "Content-Type": "text/plain" }, body: JSON.stringify({
        id: crypto.randomUUID(), sessionId: session.id, kind,
        elapsedMs: Math.max(0, now - session.start), activeMs
      }) }).catch(() => {});
  }

  function tick() {
    const now = Date.now();
    const active = document.visibilityState === "visible" && document.hasFocus() && now - lastInteraction < 60000;
    const delta = Math.min(10000, Math.max(0, now - lastTick));
    lastTick = now;
    if (isDemo && active && delta) send("demo_time", delta);
  }

  function resetClock() {
    lastTick = Date.now();
  }

  function updateChoice() {
    if (!control) return;
    control.querySelector("[data-allow]").hidden = choice === "yes";
    control.querySelector("[data-deny]").textContent = choice === "yes" ? "Tắt thống kê" : "Từ chối";
    control.open = choice === null;
  }
  function start() {
    try { session = JSON.parse(sessionStorage.getItem(sessionKey)); } catch { session = undefined; }
    resetClock();
    send("visit");
  }
  control?.addEventListener("click", (event) => {
    if (!event.target.matches("[data-allow], [data-deny]")) return;
    choice = event.target.hasAttribute("data-allow") ? "yes" : "no";
    localStorage.setItem(preferenceKey, choice);
    if (choice === "yes") start();
    else { sessionStorage.removeItem(sessionKey); session = undefined; reportedDemo = undefined; }
    updateChoice();
  });
  updateChoice();
  if (choice === "yes") start();
  for (const type of ["pointerdown", "keydown", "scroll", "touchstart"]) {
    addEventListener(type, () => { lastInteraction = Date.now(); }, { passive: true });
  }
  setInterval(tick, 10000);
  document.addEventListener("visibilitychange", resetClock);
  addEventListener("focus", resetClock);
  addEventListener("blur", resetClock);
  addEventListener("pagehide", tick);
  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("a");
    if (!link) return;
    if (link.id === "android-download") {
      if (link.getAttribute("aria-disabled") !== "true" && link.hasAttribute("href")) send("download_click");
    } else if (link.hash === "#download") {
      send("android_interest");
    }
  });
})();
