(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let token = ""; try { token = sessionStorage.getItem("adm") || ""; } catch (_) {}
  let content = null;
  let jsonMode = false;

  const LABELS = { profile: "Profile", about: "About paragraphs", ventures: "Ventures & projects", experience: "Experience", volunteering: "Volunteering", education: "Education", certifications: "Certifications", robotics: "Robotics series", articles: "Articles", skills: "Skills", languages: "Languages", posts: "Posts", links: "Links", interests: "Interests", highlights: "Highlights", items: "Items" };
  const label = (k) => LABELS[k] || String(k).replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

  async function api(path, opts = {}) {
    const r = await fetch(path, { ...opts, headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}), ...(opts.headers || {}) } });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && path !== "/api/admin/login") { signOut(true); throw new Error("Session expired. Please sign in again."); }
    if (!r.ok || j.ok === false) throw new Error(j.error || "Request failed (" + r.status + ")");
    return j;
  }
  const setStatus = (el, msg, ok) => { el.textContent = msg; el.className = "status " + (ok ? "ok" : "err"); };

  // ---------- Auth ----------
  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const st = $("#login-status"); st.textContent = "Signing in…"; st.className = "status";
    try {
      const j = await api("/api/admin/login", { method: "POST", body: JSON.stringify({ password: e.target.password.value }) });
      token = j.token; try { sessionStorage.setItem("adm", token); } catch (_) {} e.target.reset(); st.textContent = ""; start(); scrollTo(0, 0);
    } catch (err) { setStatus(st, err.message, false); }
  });
  function signOut(expired) {
    if (!expired && token) fetch("/api/admin/logout", { method: "POST", headers: { authorization: "Bearer " + token } });
    token = ""; try { sessionStorage.removeItem("adm"); } catch (_) {}
    $("#app").hidden = true; $("#login").hidden = false;
  }
  $("#logout").addEventListener("click", () => signOut(false));

  // ---------- Tabs ----------
  $(".tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("on", x === b));
    document.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== b.dataset.tab));
    if (b.dataset.tab === "stats") loadStats();
    if (b.dataset.tab === "messages") loadMessages();
  });

  // ---------- Messages ----------
  async function loadMessages() {
    const list = $("#msg-list");
    try {
      const { messages } = await api("/api/admin/messages");
      const unread = messages.filter((m) => !m.is_read).length;
      $("#unread-count").textContent = unread || "";
      if (!messages.length) { list.innerHTML = '<div class="empty">No messages yet. Messages sent from the contact form will appear here.</div>'; return; }
      list.innerHTML = messages.map((m) => `
        <article class="msg ${m.is_read ? "" : "unread"}" data-id="${m.id}">
          <header><span class="who">${esc(m.name)} · <a href="mailto:${esc(m.email)}">${esc(m.email)}</a></span><span class="when">${new Date(m.created_at).toLocaleString()}</span></header>
          ${m.subject ? `<div class="subj">${esc(m.subject)}</div>` : ""}
          <p>${esc(m.message)}</p>
          <div class="row">
            <a class="btn ghost sm" href="mailto:${esc(m.email)}?subject=${encodeURIComponent("Re: " + (m.subject || "Your message"))}">Reply by email</a>
            <button class="btn ghost sm" data-act="read" data-val="${m.is_read ? 0 : 1}">Mark as ${m.is_read ? "unread" : "read"}</button>
            <button class="btn danger sm" data-act="del">Delete</button>
          </div>
        </article>`).join("");
    } catch (err) { list.innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
  }
  $("#msg-list").addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-act]"); if (!b) return;
    const id = b.closest(".msg").dataset.id;
    if (b.dataset.act === "del" && !confirm("Delete this message permanently?")) return;
    b.disabled = true;
    try {
      if (b.dataset.act === "del") await api(`/api/admin/messages/${id}`, { method: "DELETE" });
      else await api(`/api/admin/messages/${id}`, { method: "PATCH", body: JSON.stringify({ read: b.dataset.val === "1" }) });
      loadMessages();
    } catch (err) { alert(err.message); b.disabled = false; }
  });
  $("#refresh-msgs").addEventListener("click", loadMessages);

  // ---------- Content editor ----------
  async function loadContent() {
    const st = $("#content-status");
    try {
      const j = await api("/api/admin/content");
      content = j.content;
      $("#pending-count").textContent = j.pending.length;
      $("#pending-list").innerHTML = j.pending.map((p) => `<li><b>${esc(p.topic)}:</b> ${esc(p.detail)}</li>`).join("");
      st.textContent = j.custom ? "Showing your edited content" + (j.updatedAt ? " (last saved " + new Date(j.updatedAt).toLocaleString() + ")." : ".") : "Showing the original content (no edits saved yet).";
      st.className = "status";
      drawTree();
    } catch (err) { setStatus(st, err.message, false); }
  }

  const blankLike = (v) => Array.isArray(v) ? [] : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === "hidden" ? false : blankLike(x)])) : typeof v === "number" ? 0 : typeof v === "boolean" ? false : "";
  const getAt = (path) => path.reduce((o, k) => o[k], content);
  const summaryOf = (v) => v && typeof v === "object" && !Array.isArray(v) ? (v.title || v.name || v.role || v.group || v.topic || "") + (v.hidden ? " (hidden)" : "") : "";

  function nodeHTML(key, val, path, depth) {
    const p = esc(JSON.stringify(path));
    if (Array.isArray(val) || (val && typeof val === "object")) {
      const isArr = Array.isArray(val);
      const kids = isArr
        ? val.map((v, i) => itemHTML(v, path.concat(i), depth + 1, i, val.length)).join("") + `<div class="item-tools"><button class="btn ghost sm" data-add='${p}'>+ Add ${isArr && val.length && typeof val[0] !== "object" ? "line" : "item"}</button></div>`
        : Object.entries(val).filter(([k]) => k !== "hidden").map(([k, v]) => nodeHTML(k, v, path.concat(k), depth + 1)).join("");
      return `<details class="node" ${depth < 1 ? "" : "open"}><summary>${esc(label(key))} ${isArr ? `<span class="sumhint">${val.length} item${val.length === 1 ? "" : "s"}</span>` : ""}</summary><div class="kids">${kids}</div></details>`;
    }
    const long = typeof val === "string" && (val.length > 70 || /description|about|intro|detail|note|subtitle|headline/i.test(key));
    const input = typeof val === "boolean"
      ? `<label class="check"><input type="checkbox" data-path='${p}' ${val ? "checked" : ""}> ${esc(label(key))}</label>`
      : long
        ? `<label>${esc(label(key))}<textarea data-path='${p}' rows="${Math.min(8, Math.ceil(String(val).length / 90) + 1)}">${esc(val)}</textarea></label>`
        : `<label>${esc(label(key))}<input data-path='${p}' value="${esc(val)}"></label>`;
    return `<div class="field">${input}</div>`;
  }
  function itemHTML(v, path, depth, i, n) {
    const p = esc(JSON.stringify(path));
    const tools = `<div class="item-tools">
      ${i > 0 ? `<button class="btn ghost sm" data-move='${p}' data-dir="-1">↑ Up</button>` : ""}
      ${i < n - 1 ? `<button class="btn ghost sm" data-move='${p}' data-dir="1">↓ Down</button>` : ""}
      <button class="btn danger sm" data-del='${p}'>Remove</button></div>`;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const fields = Object.entries(v).filter(([k]) => k !== "hidden").map(([k, x]) => nodeHTML(k, x, path.concat(k), depth + 1)).join("");
      return `<details class="node"><summary>#${i + 1} <span class="sumhint">${esc(summaryOf(v))}</span></summary><div class="kids">
        <label class="check"><input type="checkbox" data-path='${esc(JSON.stringify(path.concat("hidden")))}' ${v.hidden ? "checked" : ""}> hidden (don't show on site)</label>
        ${fields}${tools}</div></details>`;
    }
    const long = typeof v === "string" && v.length > 70;
    return `<div class="field">${long ? `<textarea data-path='${p}' rows="${Math.min(8, Math.ceil(v.length / 90) + 1)}">${esc(v)}</textarea>` : `<input data-path='${p}' value="${esc(v)}">`}${tools}</div>`;
  }
  function drawTree() {
    if (jsonMode) { $("#json").value = JSON.stringify(content, null, 2); return; }
    $("#tree").innerHTML = Object.entries(content).map(([k, v]) => nodeHTML(k, v, [k], 0)).join("");
  }
  $("#tree").addEventListener("input", (e) => {
    const el = e.target.closest("[data-path]"); if (!el) return;
    const path = JSON.parse(el.dataset.path), last = path.pop(), parent = getAt(path);
    parent[last] = el.type === "checkbox" ? el.checked : el.value;
  });
  $("#tree").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    e.preventDefault();
    const openState = [...document.querySelectorAll("#tree details")].map((d) => d.open);
    if (b.dataset.add) { const arr = getAt(JSON.parse(b.dataset.add)); arr.push(arr.length ? blankLike(arr[0]) : ""); }
    else if (b.dataset.del) { if (!confirm("Remove this item?")) return; const path = JSON.parse(b.dataset.del), i = path.pop(); getAt(path).splice(i, 1); }
    else if (b.dataset.move) { const path = JSON.parse(b.dataset.move), i = path.pop(), arr = getAt(path), j = i + Number(b.dataset.dir); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    else return;
    const y = scrollY; drawTree();
    document.querySelectorAll("#tree details").forEach((d, k) => { if (openState[k] !== undefined) d.open = openState[k]; });
    scrollTo(0, y);
  });

  $("#mode-toggle").addEventListener("click", (e) => {
    if (jsonMode) {
      try { content = JSON.parse($("#json").value); } catch (err) { return setStatus($("#content-status"), "JSON error: " + err.message, false); }
    }
    jsonMode = !jsonMode;
    $("#tree").hidden = jsonMode; $("#json").hidden = !jsonMode;
    e.target.textContent = jsonMode ? "Switch to form" : "Switch to JSON";
    drawTree();
  });
  $("#save-content").addEventListener("click", async (e) => {
    const st = $("#content-status");
    if (jsonMode) { try { content = JSON.parse($("#json").value); } catch (err) { return setStatus(st, "JSON error: " + err.message, false); } }
    e.target.disabled = true; st.textContent = "Saving…"; st.className = "status";
    try { await api("/api/admin/content", { method: "PUT", body: JSON.stringify({ content }) }); setStatus(st, "Saved. The public site now shows your changes.", true); }
    catch (err) { setStatus(st, err.message, false); }
    finally { e.target.disabled = false; }
  });
  $("#reset-content").addEventListener("click", async () => {
    if (!confirm("Discard all saved edits and go back to the original content?")) return;
    try { await api("/api/admin/content", { method: "DELETE" }); await loadContent(); setStatus($("#content-status"), "Reset to the original content.", true); }
    catch (err) { setStatus($("#content-status"), err.message, false); }
  });

  // ---------- Stats ----------
  async function loadStats() {
    try {
      const s = await api("/api/admin/stats");
      const today = new Date().toISOString().slice(0, 10);
      const t = (s.days.find((d) => d.day === today) || {}).count || 0;
      $("#kpis").innerHTML = [[s.total, "Total visits"], [t, "Visits today"], [s.messages, "Messages"], [s.unread, "Unread messages"], [`${s.chatsToday ?? 0} / ${s.chatLimit ?? "–"}`, "AI questions today"], [s.chatsTotal ?? 0, "AI questions total"]].map(([n, l]) => `<div class="kpi"><strong>${n}</strong><span>${l}</span></div>`).join("");
      const days = s.days.slice().reverse(), max = Math.max(1, ...days.map((d) => d.count));
      $("#chart").innerHTML = days.length ? days.map((d) => `<div class="bar-c" style="height:${Math.max(2, (d.count / max) * 170)}px" title="${d.day}: ${d.count}"><span>${d.day.slice(5)}</span></div>`).join("") : '<p class="muted">No visits recorded yet.</p>';
    } catch (err) { $("#kpis").innerHTML = `<p class="status err">${esc(err.message)}</p>`; }
  }

  // ---------- Password ----------
  $("#pw-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const st = $("#pw-status");
    try {
      await api("/api/admin/password", { method: "POST", body: JSON.stringify({ current: e.target.current.value, next: e.target.next.value }) });
      setStatus(st, "Password updated. Please sign in again.", true); e.target.reset();
      setTimeout(() => signOut(true), 1500);
    } catch (err) { setStatus(st, err.message, false); }
  });

  function start() {
    $("#login").hidden = true; $("#app").hidden = false;
    loadMessages(); loadContent();
  }
  if (token) start();
})();
