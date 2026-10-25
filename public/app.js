(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (typeof u === "string" && /^(https?:|mailto:|\/)/i.test(u) ? u : "");
  const visible = (arr) => (Array.isArray(arr) ? arr.filter((x) => x && !x.hidden) : []);
  const ext = (u, label, cls = "more") => (safeUrl(u) ? `<a class="${cls}" href="${esc(u)}" target="_blank" rel="noopener">${esc(label || "Open")} ↗</a>` : "");
  const initials = (s) => String(s).replace(/[^A-Za-z\s]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "•";

  const ICONS = {
    linkedin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.5h-2.8V24C19.62 23.1 24 18.1 24 12.07z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.04 21.8h-.01a9.8 9.8 0 0 1-5-1.37l-.36-.21-3.72.98 1-3.63-.24-.37a9.8 9.8 0 0 1-1.5-5.2c0-5.42 4.41-9.83 9.84-9.83a9.77 9.77 0 0 1 9.82 9.84c0 5.42-4.41 9.83-9.83 9.83zm8.37-18.2A11.76 11.76 0 0 0 12.04.13C5.5.13.2 5.43.2 11.97c0 2.09.55 4.13 1.59 5.93L.1 24l6.25-1.64a11.8 11.8 0 0 0 5.68 1.45h.01c6.53 0 11.84-5.31 11.84-11.84 0-3.16-1.23-6.14-3.47-8.37z"/></svg>',
    email: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 5.5A2.5 2.5 0 0 1 4.5 3h15A2.5 2.5 0 0 1 22 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 18.5v-13zm2.3-.5 7.7 6.2L19.7 5H4.3zM20 6.6l-7.37 5.93a1 1 0 0 1-1.26 0L4 6.6v11.9c0 .28.22.5.5.5h15a.5.5 0 0 0 .5-.5V6.6z"/></svg>',
  };

  async function loadContent() {
    try {
      const r = await fetch("/api/content", { headers: { accept: "application/json" } });
      if (!r.ok) throw new Error(r.status);
      return (await r.json()).content;
    } catch (e) {
      const r = await fetch("/content.json");
      return r.json();
    }
  }

  function render(c) {
    const p = c.profile || {};
    document.querySelectorAll("[data-bind]").forEach((el) => {
      const v = el.dataset.bind.split(".").reduce((o, k) => (o ? o[k] : undefined), c);
      if (v) el.textContent = v; else if (el.dataset.bind === "profile.nameBn") el.remove();
    });
    if (p.photo) $("#profile-photo").src = p.photo;
    $("#interest-chips").innerHTML = (p.interests || []).map((t) => `<span class="chip">${esc(t)}</span>`).join("");

    const social = [];
    if (p.links?.linkedin) social.push(`<a href="${esc(p.links.linkedin)}" target="_blank" rel="noopener" aria-label="LinkedIn">${ICONS.linkedin}</a>`);
    if (p.links?.facebook) social.push(`<a href="${esc(p.links.facebook)}" target="_blank" rel="noopener" aria-label="Facebook">${ICONS.facebook}</a>`);
    const waUrl = p.whatsapp ? "https://wa.me/" + String(p.whatsapp).replace(/\D/g, "") : "";
    if (waUrl) social.push(`<a href="${esc(waUrl)}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICONS.whatsapp}</a>`);
    if (p.email) social.push(`<a href="mailto:${esc(p.email)}" aria-label="Email">${ICONS.email}</a>`);
    $("#socials").innerHTML = social.join("");
    $("#socials-2").innerHTML = social.filter((s) => !s.includes("mailto:") && !s.includes("WhatsApp")).join("");
    if (waUrl) { const w = $("#wa-link"); w.href = waUrl; w.hidden = false; $("#wa-text").textContent = "WhatsApp " + (p.whatsappDisplay || p.whatsapp); }

    const certs = visible(c.certifications), vols = visible(c.volunteering), posts = visible(c.robotics?.posts), arts = visible(c.articles);
    const vent = visible(c.ventures).slice().sort((x, y) => (x.minor ? 1 : 0) - (y.minor ? 1 : 0));
    const main = vent.filter((v) => !v.minor);
    const curExp = visible(c.experience).filter((e) => /present/i.test(e.period || "") && !vent.some((v) => (e.org || "").startsWith(v.name))).slice(0, 1);
    $("#stats").innerHTML = [
      [certs.length, "Certifications & course badges"],
      [vols.length, "Volunteer & campus roles"],
      [posts.length, "Robotics posts listed"],
      [vent.length, "Ventures & projects"],
    ].map(([n, l]) => `<li><strong>${n}</strong><span>${esc(l)}</span></li>`).join("");

    $("#about-text").innerHTML = visible(c.about).map((t) => `<p>${esc(t)}</p>`).join("");
    const edu0 = visible(c.education)[0];
    const facts = [
      ["Studying", edu0 ? `${edu0.title}${edu0.org ? " · " + edu0.org : ""}` : ""],
      ["Based in", p.location],
      ["Currently", [...main.filter((v) => /present/i.test(v.period || "")).map((v) => `${v.role}, ${v.name}`), ...curExp.map((e) => `${String(e.role).replace(/\s*\(.*?\)/, "")}, ${e.org}`)].join(" · ")],
      ["Languages", visible(c.languages).map((l) => l.name).join(", ")],
      ["Email", p.email],
      ["WhatsApp", p.whatsappDisplay || p.whatsapp],
    ].filter(([, v]) => v);
    $("#facts").innerHTML = facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("");

    $("#ventures-list").innerHTML = vent.map((v) => `
      <article class="card venture reveal${v.minor ? " minor" : ""}${v.status ? " closed" : ""}">
        ${safeUrl(v.image) ? `<img class="v-img" src="${esc(v.image)}" alt="${esc(v.name)}" loading="lazy">` : ""}
        <div class="v-tags"><span class="tag">${esc(v.type)}</span>${v.status ? `<span class="tag status">${esc(v.status)}</span>` : ""}</div>
        <h3>${esc(v.name)}${v.nameBn ? ` <span class="bn muted" lang="bn" style="font-size:.8em">${esc(v.nameBn)}</span>` : ""}</h3>
        <div class="meta">${esc([v.role, v.period].filter(Boolean).join(" · "))}</div>
        ${v.tagline ? `<div class="tagline">“${esc(v.tagline)}”</div>` : ""}
        ${v.description ? `<p>${esc(v.description)}</p>` : ""}
        ${visible(v.highlights).length ? `<div class="hl">${v.highlights.map((h) => `<span>${esc(h)}</span>`).join("")}</div>` : ""}
        ${ext(v.link, v.linkLabel || "Learn more")}
      </article>`).join("");

    $("#experience-list").innerHTML = visible(c.experience).map((e) => `
      <li class="reveal${e.status ? " ended" : ""}"><div class="role">${esc(e.role)}${e.type ? `<span class="pill">${esc(e.type)}</span>` : ""}${e.status ? `<span class="pill status">${esc(e.status)}</span>` : ""}</div>
      <div class="org">${safeUrl(e.logo) ? `<img class="org-logo" src="${esc(e.logo)}" alt="" width="22" height="22">` : ""}${esc(e.org)}</div><div class="when">${esc(e.period)}</div>
      ${e.description ? `<p>${esc(e.description)}</p>` : ""}</li>`).join("");

    $("#volunteer-list").innerHTML = vols.map((v) => `
      <li class="vol reveal"><div class="logo">${safeUrl(v.logo) ? `<img src="${esc(v.logo)}" alt="" width="42" height="42">` : esc(initials(v.org))}</div>
      <div><strong>${esc(v.role)} · <span lang="bn" style="color:inherit;font-size:inherit">${esc(v.org)}</span></strong><span>${esc([v.period, v.cause].filter(Boolean).join(" · "))}</span></div></li>`).join("");

    $("#education-list").innerHTML = visible(c.education).map((e) => `
      <div class="card reveal"><h3>${esc(e.title)}</h3><p class="org">${esc(e.org)}</p>
      ${e.period ? `<span class="when">${esc(e.period)}</span>` : ""}${e.note ? `<p class="note">${esc(e.note)}</p>` : ""}</div>`).join("");

    const cats = ["All", ...new Set(certs.map((x) => x.category).filter(Boolean))];
    const drawCerts = (cat) => {
      $("#cert-list").innerHTML = certs.filter((x) => cat === "All" || x.category === cat).map((x) => `
        <div class="card cert">${safeUrl(x.image) ? `<a class="c-img" href="${esc(x.image)}" target="_blank" rel="noopener" aria-label="View certificate image"><img src="${esc(x.image)}" alt="${esc(x.title)} certificate" loading="lazy"></a>` : ""}
        <span class="cat">${esc(x.category)}</span><h4>${esc(x.title)}</h4>
        <div class="issuer">${safeUrl(x.logo) ? `<img class="iss-logo" src="${esc(x.logo)}" alt="" width="22" height="22">` : ""}${esc(x.issuer)}</div>${x.note ? `<div class="meta">${esc(x.note)}</div>` : ""}<div class="meta">${x.date ? "Issued " + esc(x.date) : ""}</div>
        ${x.credentialId ? `<div class="meta">Credential ID <code>${esc(x.credentialId)}</code></div>` : ""}
        ${ext(x.link, x.linkLabel || "View")}</div>`).join("");
      document.querySelectorAll("#cert-filters button").forEach((b) => b.setAttribute("aria-selected", b.dataset.cat === cat));
    };
    $("#cert-filters").innerHTML = cats.map((k) => `<button role="tab" data-cat="${esc(k)}">${esc(k)}</button>`).join("");
    $("#cert-filters").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) drawCerts(b.dataset.cat); });
    drawCerts("All");
    const honors = visible(c.honors), hw = $("#honors-wrap");
    if (hw) { hw.hidden = !honors.length; $("#honor-list").innerHTML = honors.map((h) => `
      <li class="honor reveal">${safeUrl(h.logo) ? `<img src="${esc(h.logo)}" alt="" width="36" height="36">` : ""}
      <div><strong>${esc(h.title)}</strong><span>${esc([h.issuer, h.date].filter(Boolean).join(" · "))}</span>${h.note ? `<em>${esc(h.note)}</em>` : ""}</div></li>`).join(""); }

    $("#skills-list").innerHTML = visible(c.skills).map((g) => `
      <div class="skill-group"><h4>${esc(g.group)}</h4><div class="tags">${(g.items || []).map((i) => `<span>${esc(i)}</span>`).join("")}</div></div>`).join("");
    $("#lang-list").innerHTML = visible(c.languages).map((l) => `<li><strong>${esc(l.name)}</strong><span>${esc(l.level)}</span></li>`).join("");

    $("#robotics-intro").textContent = c.robotics?.intro || "";
    $("#robot-list").innerHTML = posts.map((r) => {
      const inner = `<div class="thumb">${safeUrl(r.image) ? `<img src="${esc(r.image)}" alt="${esc(r.title)} robot" loading="lazy">` : `<div class="ph">#${esc(r.no)}</div>`}<span class="no">#Robotics_${esc(r.no)}</span></div>
        <div class="body"><strong>${esc(r.title)}</strong><span>${esc(r.date)}</span></div>`;
      return safeUrl(r.link) ? `<a class="robot reveal" href="${esc(r.link)}" target="_blank" rel="noopener">${inner}</a>` : `<div class="robot reveal">${inner}</div>`;
    }).join("");
    const all = $("#all-posts");
    if (p.links?.linkedinActivity) all.href = p.links.linkedinActivity; else all.remove();

    $("#article-list").innerHTML = arts.map((a) => `
      <article class="card article reveal">
        ${safeUrl(a.image) ? `<div class="thumb"><img src="${esc(a.image)}" alt="" loading="lazy"></div>` : ""}
        <div class="body"><h3 lang="${esc(a.lang || "bn")}">${esc(a.title)}</h3>
        ${a.subtitle ? `<p class="subtitle" lang="bn">${esc(a.subtitle)}</p>` : ""}
        <div class="meta">${esc([a.where, a.date].filter(Boolean).join(" · "))}</div>
        ${safeUrl(a.link) ? ext(a.link, "Read article") : `<span class="na">Public link not available yet</span>`}</div>
      </article>`).join("");

    if (p.email) {
      $("#email-link").href = "mailto:" + p.email;
      $("#email-text").textContent = p.email;
      $("#copy-email").addEventListener("click", async (e) => {
        try { await navigator.clipboard.writeText(p.email); e.target.textContent = "Copied ✓"; } catch { e.target.textContent = p.email; }
        setTimeout(() => (e.target.textContent = "Copy email"), 2000);
      });
    }
    setupReveal();
  }

  function setupReveal() {
    const els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) { els.forEach((e) => e.classList.add("in")); return; }
    const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { rootMargin: "0px 0px -40px 0px" });
    els.forEach((e) => io.observe(e));
  }

  function setupNav() {
    const burger = $(".burger"), menu = $("#menu");
    burger.addEventListener("click", () => { const o = menu.classList.toggle("open"); burger.setAttribute("aria-expanded", o); });
    menu.addEventListener("click", (e) => { if (e.target.closest("a")) { menu.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); } });
    const links = [...menu.querySelectorAll('a[href^="#"]')];
    const secs = links.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
    const onScroll = () => {
      const y = scrollY + 120; let cur = null;
      secs.forEach((s) => { if (s.offsetTop <= y) cur = s.id; });
      links.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + cur));
    };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }

  function setupForm() {
    const form = $("#contact-form"), status = $("#form-status"), opened = Date.now();
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form));
      status.className = "form-status";
      if (!d.name.trim() || !d.email.trim() || d.message.trim().length < 10) {
        status.textContent = "Please fill in your name, email and a message (at least 10 characters).";
        status.classList.add("err"); return;
      }
      const btn = form.querySelector("button[type=submit]"); btn.disabled = true; btn.textContent = "Sending…";
      try {
        const r = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...d, elapsed: Date.now() - opened }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ok) throw new Error(j.error || "Something went wrong. Please email me directly.");
        form.reset(); status.textContent = "Thanks! Your message has been sent. I'll reply by email."; status.classList.add("ok");
      } catch (err) { status.textContent = err.message; status.classList.add("err"); }
      finally { btn.disabled = false; btn.textContent = "Send message"; }
    });
  }

  $("#year").textContent = new Date().getFullYear();
  setupNav();
  setupForm();
  loadContent().then(render).catch(() => { $("#about-text").innerHTML = "<p>Content could not be loaded. Please refresh.</p>"; });
  try { if (!sessionStorage.getItem("v")) { sessionStorage.setItem("v", "1"); navigator.sendBeacon ? navigator.sendBeacon("/api/view", "{}") : fetch("/api/view", { method: "POST" }); } } catch {}
})();
