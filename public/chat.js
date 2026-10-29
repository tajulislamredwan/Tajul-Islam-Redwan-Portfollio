// Personal AI chat widget for Tajul Islam Redwan's site.
(() => {
  const $ = (s) => document.querySelector(s);
  const fab = $("#chat-fab"), panel = $("#chat-panel"), log = $("#chat-log"), form = $("#chat-form"),
    input = $("#chat-input"), send = $("#chat-send"), sugg = $("#chat-sugg");
  if (!fab || !panel) return;

  let history = [];
  try { history = JSON.parse(sessionStorage.getItem("chat") || "[]"); } catch (_) { history = []; }
  let busy = false;

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hasBn = (s) => /[\u0980-\u09FF]/.test(s);

  function renderSources(items) {
    const safe = (Array.isArray(items) ? items : []).slice(0, 5).filter((item) => {
      try { return new URL(item.url).protocol === "https:"; } catch (_) { return false; }
    });
    if (!safe.length) return "";
    return `<div class="sources"><strong>Sources / উৎস:</strong><ul>${safe.map((item) => `<li><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(item.title || "Open source")}</a></li>`).join("")}</ul></div>`;
  }

  // Minimal, safe Markdown: escape first, then bold/italic/code/links/lists/headings.
  function md(text) {
    const inline = (t) => esc(t)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
    const out = [];
    let list = null;
    const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
    for (const raw of String(text).split(/\r?\n/)) {
      const line = raw.trimEnd();
      let m;
      if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) {
        if (list !== "ul") { close(); out.push("<ul>"); list = "ul"; }
        out.push(`<li>${inline(m[1])}</li>`);
      } else if ((m = line.match(/^\s*(\d+)[.)]\s+(.*)$/))) {
        // Keep the author's own numbering even when bullets or blank lines split the list.
        if (list !== "ol") { close(); out.push(`<ol start="${Math.min(Number(m[1]) || 1, 9999)}">`); list = "ol"; }
        out.push(`<li value="${Math.min(Number(m[1]) || 1, 9999)}">${inline(m[2])}</li>`);
      } else if ((m = line.match(/^\s*#{1,4}\s+(.*)$/))) {
        close(); out.push(`<p><strong>${inline(m[1])}</strong></p>`);
      } else if (!line.trim()) {
        // A blank line alone does not end a list; the next non-list line will.
      } else {
        close(); out.push(`<p>${inline(line)}</p>`);
      }
    }
    close();
    return out.join("");
  }

  function add(role, html, cls = "") {
    const d = document.createElement("div");
    d.className = `msg ${role} ${cls}`.trim();
    d.innerHTML = `<div class="bubble">${html}</div>`;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }

  function restore() {
    for (const m of history) add(m.role === "user" ? "user" : "bot", m.role === "user" ? esc(m.content).replace(/\n/g, "<br>") : md(m.content) + renderSources(m.sources));
    if (history.length && sugg) sugg.hidden = true;
  }

  function open() {
    panel.hidden = false;
    fab.setAttribute("aria-expanded", "true");
    document.body.classList.add("chat-open");
    setTimeout(() => input.focus({ preventScroll: true }), 50);
    log.scrollTop = log.scrollHeight;
  }
  function close() {
    panel.hidden = true;
    fab.setAttribute("aria-expanded", "false");
    document.body.classList.remove("chat-open");
    fab.focus({ preventScroll: true });
  }

  async function ask(q) {
    q = q.trim();
    if (!q || busy) return;
    busy = true; send.disabled = true;
    if (sugg) sugg.hidden = true;
    add("user", esc(q).replace(/\n/g, "<br>"));
    input.value = ""; resize();
    const typing = add("bot", '<span class="dots"><i></i><i></i><i></i></span>', "typing");
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 60000);
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: q, history: history.slice(-8) }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const j = await r.json().catch(() => ({}));
      typing.remove();
      if (!r.ok || !j.ok) {
        add("bot", esc(j.error || (hasBn(q) ? "দুঃখিত, এখন উত্তর দিতে পারছি না। একটু পরে আবার চেষ্টা করুন।" : "Sorry, I couldn't answer right now. Please try again.")), "err");
      } else {
        const sources = Array.isArray(j.sources) ? j.sources : [];
        add("bot", md(j.answer) + renderSources(sources));
        history.push({ role: "user", content: q }, { role: "assistant", content: j.answer, sources });
        history = history.slice(-12);
        try { sessionStorage.setItem("chat", JSON.stringify(history)); } catch (_) {}
      }
    } catch (e) {
      typing.remove();
      add("bot", esc(hasBn(q) ? "সংযোগে সমস্যা হয়েছে বা সময় শেষ হয়ে গেছে। আবার চেষ্টা করুন।" : "Connection problem or the request timed out. Please try again."), "err");
    } finally {
      busy = false; send.disabled = false;
      if (matchMedia("(hover: hover)").matches) input.focus({ preventScroll: true });
    }
  }

  function resize() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 140) + "px";
  }

  fab.addEventListener("click", () => (panel.hidden ? open() : close()));

  // Slide the floating button out of the way while it would cover a hero button,
  // a social icon or the contact form's send button (mostly an issue on phones).
  const guarded = () => document.querySelectorAll(".hero .cta a, .hero .socials a, #contact-form [type=submit]");
  let ticking = false;
  const checkOverlap = () => {
    ticking = false;
    // offset* values ignore the slide-away transform, so this is the button's resting spot.
    const f = { l: fab.offsetLeft - 8, r: fab.offsetLeft + fab.offsetWidth + 8, t: fab.offsetTop - 8, b: fab.offsetTop + fab.offsetHeight + 8 };
    let hit = false;
    for (const el of guarded()) {
      const e = el.getBoundingClientRect();
      if (e.width && e.left < f.r && e.right > f.l && e.top < f.b && e.bottom > f.t) { hit = true; break; }
    }
    fab.classList.toggle("tucked", hit);
  };
  const queue = () => { if (!ticking) { ticking = true; requestAnimationFrame(checkOverlap); } };
  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue);
  addEventListener("load", queue);
  // Hero buttons slide in with an entrance animation and web fonts can shift layout,
  // so check again once those settle.
  document.addEventListener("transitionend", queue, true);
  document.addEventListener("animationend", queue, true);
  document.fonts?.ready?.then(queue);
  [300, 900, 1800, 3000].forEach((ms) => setTimeout(queue, ms));
  checkOverlap();
  $("#chat-close").addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) close(); });
  document.querySelectorAll("[data-open-chat]").forEach((a) =>
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const menu = document.getElementById("menu");
      if (menu) menu.classList.remove("open");
      const b = document.querySelector(".burger");
      if (b) b.setAttribute("aria-expanded", "false");
      open();
    })
  );
  form.addEventListener("submit", (e) => { e.preventDefault(); ask(input.value); });
  input.addEventListener("input", resize);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing && matchMedia("(hover: hover)").matches) {
      e.preventDefault(); ask(input.value);
    }
  });
  if (sugg) sugg.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) ask(b.textContent); });
  if (location.hash === "#ask-ai") open();
  restore();
})();
