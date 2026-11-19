// ============================================================
// RACQUET RETREAT 2027 — app
// Sections: 1 setup · 2 storage (Firebase or demo) · 3 resort cards
// 4 ballot · 5 group board and plan · 6 idea board · 7 card comments · 8 start
// ============================================================

import { R } from "./data.js";
import { firebaseConfig, NAMES } from "./config.js";

// ---------- 1. Setup ----------
const DEMO = !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("PASTE");
const FIREBASE = "https://www.gstatic.com/firebasejs/10.12.2";
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const SIZES = [
  { k: "2", t: "2 people", d: "Two of us, one room. Easy to book anywhere; we'd lean on the resort's clinics for other players." },
  { k: "4", t: "4 people", d: "Two rooms or one condo. Perfect doubles, and a shared pro gets affordable." },
  { k: "6", t: "6 people", d: "A condo or house. Rotating doubles, cheapest per person at rental and private-pro places." }];
const CAPS = ["", "Hate it", "Not keen", "Fine", "Like it", "Love it"];
const WEEKENDS = ["Feb 5–7", "Feb 12–14", "Feb 19–21", "Feb 26–28", "Mar 5–7", "Mar 12–14"];
const LEVELS = ["Intensive", "Active", "Easygoing", "Go with the flow"];
const BUDGETS = ["Under $750", "$750–$1,000", "$1,000–$1,300", "No firm cap"];
const CAP = { "Under $750": 750, "$750–$1,000": 1000, "$1,000–$1,300": 1300, "No firm cap": Infinity };
const SPORTS = ["Tennis only", "Pickleball only", "Either / combo"];
const byId = Object.fromEntries(R.map((r) => [r.id, r]));
const total = (r) => (r.hrs ? r.hrs.reduce((a, b) => a + b, 0) : 0);
const level = (h) => (h >= 9 ? ["intensive", "Intensive"] : h >= 6 ? ["active", "Active"] : ["easy", "Easygoing"]);
const levelOf = (r) => level(total(r))[1];
const money = (n) => "$" + n.toLocaleString("en-US");
const nm = (r) => r.name + (r.someday ? " *" : "");
const label = (r) => ({ tennis: "Tennis · ", pickleball: "Pickleball · ", someday: "Someday · " }[r.sport]) + nm(r);
const when = (t) => { const d = t?.toDate ? t.toDate() : t ? new Date(t) : null; return d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "just now"; };

const store = (k, v) => { try { v === undefined ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const load = (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };

let me = load("rr27-me") || "";               // who's using this browser
let view = { sport: "tennis", size: "4", sort: "hours" };
const blankBallot = () => ({ name: me, sport: "", picks: ["", "", "", "", ""], sizes: { "2": 0, "4": 0, "6": 0 }, level: "", budget: "", weekends: [], comments: "" });
let ballot = Object.assign(blankBallot(), load("rr27-draft") || {});
ballot.picks = ballot.picks.map((p) => (byId[p] ? p : ""));
const saveDraft = () => store("rr27-draft", ballot);

let ballots = {}, ideas = [], comments = [];
const openTalk = new Set();                  // resort cards whose comments are open

// ---------- 2. Storage: Firebase, or a demo that lives in this browser ----------
let api = null;   // { setBallot, addIdea, togglePlus, deleteIdea, addComment, deleteComment, uid }

async function startFirebase() {
  const [app, auth, fs] = await Promise.all([
    import(`${FIREBASE}/firebase-app.js`), import(`${FIREBASE}/firebase-auth.js`), import(`${FIREBASE}/firebase-firestore.js`)]);
  const fbApp = app.initializeApp(firebaseConfig);
  const a = auth.getAuth(fbApp), db = fs.getFirestore(fbApp);
  const cred = await auth.signInAnonymously(a);   // no account needed; lets the rules know a real visitor is writing
  const uid = cred.user.uid;
  fs.onSnapshot(fs.collection(db, "ballots"), (snap) => {
    ballots = {}; snap.docs.forEach((d) => { const v = d.data(); if (v?.name) ballots[d.id] = v; });
    renderBoard(); renderPlan();
  }, () => boardMsg("Couldn't load the group board. Reload to try again."));
  fs.onSnapshot(fs.query(fs.collection(db, "ideas"), fs.orderBy("createdAt", "desc")), (snap) => {
    ideas = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })); renderIdeas();
  });
  fs.onSnapshot(fs.query(fs.collection(db, "comments"), fs.orderBy("createdAt")), (snap) => {
    comments = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) })); renderCards();
  });
  api = {
    uid,
    setBallot: (b) => fs.setDoc(fs.doc(db, "ballots", b.name.toLowerCase()), { ...b, savedAt: new Date().toISOString() }),
    addIdea: (text) => fs.addDoc(fs.collection(db, "ideas"), { text, by: me, uid, createdAt: fs.serverTimestamp(), plus: [] }),
    togglePlus: (idea) => fs.updateDoc(fs.doc(db, "ideas", idea.id), { plus: (idea.plus || []).includes(me) ? fs.arrayRemove(me) : fs.arrayUnion(me) }),
    deleteIdea: (idea) => fs.deleteDoc(fs.doc(db, "ideas", idea.id)),
    addComment: (resortId, text) => fs.addDoc(fs.collection(db, "comments"), { resortId, text, by: me, uid, createdAt: fs.serverTimestamp() }),
    deleteComment: (c) => fs.deleteDoc(fs.doc(db, "comments", c.id)),
  };
}

function startDemo() {
  const d = (n) => new Date(Date.now() - n * 864e5);
  ballots = {
    russell: { name: "Russell", sport: "Tennis only", level: "Intensive", budget: "$750–$1,000", weekends: ["Feb 12–14", "Feb 19–21", "Mar 5–7"], sizes: { 2: 2, 4: 5, 6: 4 }, picks: ["t-newk", "t-sadd", "t-hsb", "t-wild", "s-lamanga"], comments: "Example: would love the Newk karaoke again." },
    ben: { name: "Ben", sport: "Either / combo", level: "Active", budget: "$1,000–$1,300", weekends: ["Feb 19–21", "Feb 26–28", "Mar 5–7"], sizes: { 2: 1, 4: 4, 6: 5 }, picks: ["t-wild", "t-newk", "p-wild", "t-pr", "s-lasanta"], comments: "Example: flying from DC." },
    peter: { name: "Peter", sport: "Tennis only", level: "Go with the flow", budget: "No firm cap", weekends: ["Feb 19–21", "Mar 5–7", "Mar 12–14"], sizes: { 2: 2, 4: 4, 6: 4 }, picks: ["t-sadd", "t-newk", "t-omni", "t-wild", "t-hsb"], comments: "" },
  };
  ideas = [
    { id: "i1", text: "Example: if we go to Newk, let's stay through Monday and do a day in Austin.", by: "Ben", uid: "demo", createdAt: d(1), plus: ["Russell", "Peter"] },
    { id: "i2", text: "Example: a round-robin bracket with a trophy for whoever wins the most games.", by: "Russell", uid: "demo", createdAt: d(2), plus: ["Ben"] },
  ];
  comments = [
    { id: "c1", resortId: "t-newk", text: "Example: we went in 2019. The Saturday doubles competition was the highlight.", by: "Peter", uid: "demo", createdAt: d(3) },
  ];
  const uid = "me";
  const id = () => Math.random().toString(36).slice(2);
  api = {
    uid,
    setBallot: async (b) => { ballots[b.name.toLowerCase()] = { ...b }; renderBoard(); renderPlan(); },
    addIdea: async (text) => { ideas.unshift({ id: id(), text, by: me, uid, createdAt: new Date(), plus: [] }); renderIdeas(); },
    togglePlus: async (idea) => { const p = idea.plus || []; idea.plus = p.includes(me) ? p.filter((n) => n !== me) : [...p, me]; renderIdeas(); },
    deleteIdea: async (idea) => { ideas = ideas.filter((i) => i !== idea); renderIdeas(); },
    addComment: async (resortId, text) => { comments.push({ id: id(), resortId, text, by: me, uid, createdAt: new Date() }); renderCards(); },
    deleteComment: async (c) => { comments = comments.filter((x) => x !== c); renderCards(); },
  };
  $("demoNote").innerHTML = '<div class="demo">Demo mode: the ballots, ideas and comments here are examples and nothing is saved. Connect Firebase in config.js to go live.</div>';
}

// ---------- Who's using this browser ----------
function renderWho() {
  $("who").innerHTML = NAMES.map((n) => `<button type="button" data-me="${esc(n)}" aria-pressed="${n === me}">${esc(n)}</button>`).join("");
  $("whoHint").textContent = me ? "" : "Tap your name so your ballot, ideas and comments are signed.";
  document.querySelectorAll('input[name=who]').forEach((i) => (i.checked = i.value === me));
}
function setMe(n) {
  me = n; store("rr27-me", n); ballot.name = n;
  const saved = ballots[n.toLowerCase()];
  if (saved) { ballot = Object.assign(blankBallot(), JSON.parse(JSON.stringify(saved))); syncInputs(); renderPicks(); renderSizes(); status("Loaded your saved ballot. Change anything and save again.", "ok"); }
  saveDraft(); renderWho(); renderCards(); renderIdeas();
}
$("who").addEventListener("click", (e) => { const b = e.target.closest("[data-me]"); if (b) setMe(b.dataset.me); });
const needMe = (statusFn) => { if (me) return true; statusFn("Tap your name at the top first."); $("who").scrollIntoView({ behavior: "smooth", block: "center" }); return false; };

// ---------- 3. Resort cards ----------
function talkBlock(r) {
  const list = comments.filter((c) => c.resortId === r.id);
  return `<details class="talk" data-talk="${r.id}" ${openTalk.has(r.id) ? "open" : ""}>
    <summary>Comments${list.length ? `<span class="cmt-count">${list.length}</span>` : ""}</summary>
    <ul>${list.map((c) => `<li><b>${esc(c.by)}</b> ${esc(c.text)} <span class="incl">${when(c.createdAt)}</span>${c.uid === api?.uid ? ` <button type="button" class="linkbtn" data-delc="${c.id}">delete</button>` : ""}</li>`).join("") || '<li class="incl">No comments yet.</li>'}</ul>
    <form data-cform="${r.id}"><input type="text" maxlength="500" placeholder="${me ? "Add a comment as " + esc(me) : "Tap your name at the top to comment"}" aria-label="Comment on ${esc(r.name)}"><button class="btn" type="submit">Post</button></form>
  </details>`;
}
function renderSomeday() {
  $("cards").innerHTML = R.filter((r) => r.sport === "someday").map((r) => {
    const picked = ballot.picks.includes(r.id);
    const chip = r.eng === "country" ? `<span class="tag eng">English-speaking</span>` : r.eng === "works" ? `<span class="tag eng">English works here</span>` : "";
    return `<article class="card is-someday" id="${r.id}">
      <div class="left">
        <div class="card-top"><span class="tag">${esc(r.region)}</span><span class="tag">${esc(r.sports)}</span>${chip}</div>
        <div><h3>${esc(nm(r))}</h3><div class="place">${esc(r.place)}</div></div>
        <p class="desc">${esc(r.program)}</p>
        ${r.flag ? `<div class="flag">${esc(r.flag)}</div>` : ""}
        <div class="travel">✈ ${esc(r.travel)}</div>
        <div class="src">Sources: ${r.src.map((s) => `<a href="${s[1]}" target="_blank" rel="noopener">${esc(s[0])}</a>`).join(" · ")}</div>
        <button type="button" class="pick-btn" data-pick="${r.id}" data-picked="${picked}">${picked ? "✓ In my picks" : "Add to my picks"}</button>
      </div>
      <dl class="kv right">
        <dt>Coaching</dt><dd>${esc(r.coach)}</dd>
        <dt>Rough cost</dt><dd class="num">${esc(r.price)}</dd>
        <dt>Feb–Mar</dt><dd>${esc(r.season)}</dd>
        <dt>Language</dt><dd>${esc(r.lang)}</dd>
      </dl>
      ${talkBlock(r)}
    </article>`;
  }).join("");
}
function renderCards() {
  const sd = view.sport === "someday";
  ["sizeSeg", "sortSeg", "legend"].forEach((id) => ($(id).hidden = sd));
  $("somedayIntro").hidden = !sd;
  if (sd) return renderSomeday();
  const list = R.filter((r) => r.sport === view.sport).slice().sort((a, b) =>
    view.sort === "hours" ? total(b) - total(a) || a.cost[view.size] - b.cost[view.size] : a.cost[view.size] - b.cost[view.size]);
  const max = 14;
  $("cards").innerHTML = list.map((r) => {
    const h = total(r), [lc, ln] = level(h), days = ["Fri", "Sat", "Sun"], cls = ["fri", "sat", "sun"];
    const segs = r.hrs.map((v, i) => (v ? `<span class="${cls[i]}" style="width:${(v / max) * 100}%" title="${days[i]} ${v} hrs">${v >= 1.5 ? days[i] + " " + v : ""}</span>` : "")).join("");
    const picked = ballot.picks.includes(r.id);
    return `<article class="card" id="${r.id}">
      <div class="left">
        <div class="card-top"><span class="lvl ${lc}">${ln}</span></div>
        <div><h3>${esc(nm(r))}</h3><div class="place">${esc(r.place)}</div></div>
        <p class="desc">${esc(r.desc)}</p>
        ${r.flag ? `<div class="flag">${esc(r.flag)}</div>` : ""}
        <div class="travel">✈ ${esc(r.travel)}</div>
        <details><summary>What we checked</summary><ul>${r.checks.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
          <div class="src">Sources: ${r.src.map((s) => `<a href="${s[1]}" target="_blank" rel="noopener">${esc(s[0])}</a>`).join(" · ")}</div></details>
        <button type="button" class="pick-btn" data-pick="${r.id}" data-picked="${picked}">${picked ? "✓ In my picks" : "Add to my picks"}</button>
      </div>
      <div class="right">
        <div>
          <div class="hours-h"><span class="ctl-label">Guided hours</span><span class="hours-total num">${h}${r.plus ? "+" : ""}<small>hrs</small></span></div>
          <div class="bar" role="img" aria-label="Friday ${r.hrs[0]}, Saturday ${r.hrs[1]}, Sunday ${r.hrs[2]} hours">${segs}</div>
          <div class="bar-scale num"><span>0</span><span>7</span><span>14 hrs</span></div>
          <div class="hrs-note">${esc(r.hrsNote)}</div>
        </div>
        <table class="price num">
          <thead><tr><th>Group</th>${["2", "4", "6"].map((s) => `<th class="${s === view.size ? "on" : ""}">${s}</th>`).join("")}</tr></thead>
          <tbody>
            <tr><td>Per person · ${r.nights || 2} nights</td>${["2", "4", "6"].map((s) => `<td class="pp ${s === view.size ? "on" : ""}">${money(r.cost[s])}</td>`).join("")}</tr>
            <tr><td>Group total</td>${["2", "4", "6"].map((s) => `<td class="${s === view.size ? "on" : ""}">${money(r.cost[s] * +s)}</td>`).join("")}</tr>
          </tbody>
        </table>
        <div class="incl">${esc(r.incl)}</div>
      </div>
      ${talkBlock(r)}
    </article>`;
  }).join("");
}
function setSeg(attr, val) { document.querySelectorAll(`[data-${attr}]`).forEach((b) => b.setAttribute("aria-pressed", b.dataset[attr] === val)); }
document.querySelectorAll("[data-sport]").forEach((b) => (b.onclick = () => { view.sport = b.dataset.sport; setSeg("sport", view.sport); renderCards(); }));
document.querySelectorAll("[data-size]").forEach((b) => (b.onclick = () => { view.size = b.dataset.size; setSeg("size", view.size); renderCards(); }));
document.querySelectorAll("[data-sort]").forEach((b) => (b.onclick = () => { view.sort = b.dataset.sort; setSeg("sort", view.sort); renderCards(); }));

const cards = $("cards");
cards.addEventListener("click", async (e) => {
  const p = e.target.closest("[data-pick]");
  if (p) {
    const id = p.dataset.pick, i = ballot.picks.indexOf(id);
    if (i >= 0) ballot.picks[i] = "";
    else { const j = ballot.picks.indexOf(""); if (j < 0) { status("All five slots are full. Clear one in the ballot first.", "err"); return; } ballot.picks[j] = id; }
    saveDraft(); renderCards(); renderPicks(); return;
  }
  const del = e.target.closest("[data-delc]");
  if (del) { const c = comments.find((x) => x.id === del.dataset.delc); if (c) { try { await api.deleteComment(c); } catch (err) { alertCard(del, "Couldn't delete that."); } } }
});
cards.addEventListener("toggle", (e) => { const t = e.target.closest("[data-talk]"); if (t) t.open ? openTalk.add(t.dataset.talk) : openTalk.delete(t.dataset.talk); }, true);
cards.addEventListener("submit", async (e) => {
  const f = e.target.closest("[data-cform]"); if (!f) return;
  e.preventDefault();
  const input = f.querySelector("input"), text = input.value.trim();
  if (!text) return;
  if (!me) { input.value = ""; input.placeholder = "Tap your name at the top first"; $("who").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
  try { openTalk.add(f.dataset.cform); await api.addComment(f.dataset.cform, text); input.value = ""; }
  catch (err) { alertCard(f, "Couldn't post that. Try again."); }
});
function alertCard(el, msg) { const s = document.createElement("span"); s.className = "status err"; s.textContent = " " + msg; el.after(s); setTimeout(() => s.remove(), 4000); }

// ---------- 4. Ballot ----------
$("names").innerHTML = NAMES.map((n) => `<label><input type="radio" name="who" id="who-${n}" value="${n}"> ${n}</label>`).join("");
const opts = `<option value="">Choose a resort</option>` +
  `<optgroup label="Tennis">${R.filter((r) => r.sport === "tennis").map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join("")}</optgroup>` +
  `<optgroup label="Pickleball">${R.filter((r) => r.sport === "pickleball").map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join("")}</optgroup>` +
  `<optgroup label="Someday (future trips, not this spring)">${R.filter((r) => r.sport === "someday").map((r) => `<option value="${r.id}">${esc(label(r))}</option>`).join("")}</optgroup>`;
function renderPicks() {
  $("picks").innerHTML = ballot.picks.map((p, i) => `<div><b>${i + 1}</b><select id="pick-${i}" data-i="${i}" aria-label="Choice ${i + 1}">${opts}</select></div>`).join("");
  ballot.picks.forEach((p, i) => ($("pick-" + i).value = p));
}
$("picks").addEventListener("change", (e) => {
  const i = +e.target.dataset.i, v = e.target.value, dup = ballot.picks.indexOf(v);
  if (v && dup >= 0 && dup !== i) ballot.picks[dup] = "";
  ballot.picks[i] = v; saveDraft(); renderPicks(); renderCards();
});
function renderSizes() {
  $("sizes").innerHTML = SIZES.map((s) => `<div class="size"><h4>${s.t}</h4><p>${s.d}</p>
    <div class="stars" role="radiogroup" aria-label="${s.t} rating">${[1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" aria-checked="${ballot.sizes[s.k] === n}" aria-label="${n} star${n > 1 ? "s" : ""}" data-sz="${s.k}" data-n="${n}" class="${ballot.sizes[s.k] >= n ? "on" : ""}">★</button>`).join("")}</div>
    <div class="star-cap">${ballot.sizes[s.k] ? CAPS[ballot.sizes[s.k]] : "Not rated"}</div></div>`).join("");
}
$("sizes").addEventListener("click", (e) => { const b = e.target.closest("[data-sz]"); if (!b) return; ballot.sizes[b.dataset.sz] = +b.dataset.n; saveDraft(); renderSizes(); });
function syncInputs() {
  document.querySelectorAll("input[name=who]").forEach((i) => (i.checked = i.value === me));
  document.querySelectorAll("input[name=sport]").forEach((i) => (i.checked = i.value === ballot.sport));
  document.querySelectorAll("input[name=level]").forEach((i) => (i.checked = i.value === ballot.level));
  document.querySelectorAll("input[name=budget]").forEach((i) => (i.checked = i.value === ballot.budget));
  document.querySelectorAll("input[name=wk]").forEach((i) => (i.checked = ballot.weekends.includes(i.value)));
  $("comments").value = ballot.comments;
}
const form = $("ballot");
form.addEventListener("change", (e) => {
  const t = e.target;
  if (t.name === "who") return setMe(t.value);
  if (t.name === "sport") ballot.sport = t.value;
  if (t.name === "level") ballot.level = t.value;
  if (t.name === "budget") ballot.budget = t.value;
  if (t.name === "wk") ballot.weekends = [...document.querySelectorAll("input[name=wk]:checked")].map((i) => i.value);
  saveDraft();
});
$("comments").addEventListener("input", (e) => { ballot.comments = e.target.value; saveDraft(); });
function status(msg, cls) { const s = $("status"); s.textContent = msg; s.className = "status " + (cls || ""); }
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!needMe((m) => status(m, "err"))) return;
  if (!ballot.picks.some(Boolean)) { status("Choose at least one resort.", "err"); return; }
  if (!api) { status("Still connecting. Try again in a moment.", "err"); return; }
  status("Saving…");
  try {
    const { name, sport, picks, sizes, level, budget, weekends, comments } = ballot;
    await api.setBallot({ name: me, sport, picks, sizes, level, budget, weekends, comments: comments.slice(0, 1500) });
    status(`Saved, ${me}. Everyone can see it on the group board, and you can change it any time.`, "ok");
  } catch (err) { status("Couldn't save. Check your connection and try again.", "err"); }
});

// ---------- 5. Group board and plan ----------
function boardMsg(msg) { $("ballotList").innerHTML = `<p class="empty">${esc(msg)}</p>`; }
function renderBoard() {
  const list = Object.values(ballots);
  $("voters").innerHTML = NAMES.map((n) => `<span class="${ballots[n.toLowerCase()] ? "in" : ""}">${n}${ballots[n.toLowerCase()] ? " ✓" : ""}</span>`).join("");
  if (!list.length) { $("rank").innerHTML = '<p class="empty">No ballots yet. The first one saved shows up here.</p>'; $("sizeRank").innerHTML = '<p class="empty">Average stars appear once someone votes.</p>'; boardMsg("Nothing saved yet."); return; }
  const pts = {}; list.forEach((b) => (b.picks || []).forEach((p, i) => { if (p && byId[p]) pts[p] = (pts[p] || 0) + (5 - i); }));
  const top = Object.entries(pts).sort((a, b) => b[1] - a[1]).slice(0, 8), mx = top.length ? top[0][1] : 1;
  $("rank").innerHTML = top.length ? top.map(([id, p]) => `<div><div class="rank-row"><span>${esc(label(byId[id]))}</span><b class="num">${p} pts</b></div><div class="rank-bar" style="width:${(p / mx) * 100}%"></div></div>`).join("") : '<p class="empty">No resorts ranked yet.</p>';
  $("sizeRank").innerHTML = SIZES.map((s) => {
    const v = list.map((b) => b.sizes && b.sizes[s.k]).filter(Boolean), avg = v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
    return `<div><div class="rank-row"><span>${s.t}</span><b class="num">${v.length ? avg.toFixed(1) + " ★" : "–"}</b></div><div class="rank-bar" style="width:${(avg / 5) * 100}%"></div></div>`;
  }).join("");
  $("ballotList").innerHTML = list.sort((a, b) => NAMES.indexOf(a.name) - NAMES.indexOf(b.name)).map((b) =>
    `<div><b>${esc(b.name)}</b> · ${esc(b.sport || "no sport pick")} · ${esc(b.level || "")} · ${esc(b.budget || "")}<br>
     ${(b.picks || []).filter(Boolean).map((p, i) => `${i + 1}. ${esc(byId[p] ? nm(byId[p]) : p)}`).join(" &nbsp; ")}
     ${b.weekends && b.weekends.length ? `<br><span class="incl">Weekends: ${esc(b.weekends.join(", "))}</span>` : ""}
     ${b.comments ? `<br><span class="incl">“${esc(b.comments)}”</span>` : ""}</div>`).join("");
}

function analyze(list){
  const n=list.length,count=(f,keys)=>keys.map(k=>[k,list.filter(b=>f(b)===k).length]);
  const sizes=["2","4","6"].map(k=>{const v=list.map(b=>b.sizes&&+b.sizes[k]).filter(Boolean);return [k,v.length?v.reduce((a,b)=>a+b,0)/v.length:0,v.length]});
  const bestSize=sizes.slice().sort((a,b)=>b[1]-a[1]||+b[0]-+a[0])[0][0];
  const wk=WEEKENDS.map(w=>[w,list.filter(b=>(b.weekends||[]).includes(w)).map(b=>b.name)]);
  const bestWk=wk.slice().sort((a,b)=>b[1].length-a[1].length)[0];
  const sport=count(b=>b.sport,SPORTS),level=count(b=>b.level,LEVELS),budget=count(b=>b.budget,BUDGETS);
  const pts={},voters={};
  list.forEach(b=>(b.picks||[]).forEach((p,i)=>{if(p&&byId[p]){pts[p]=(pts[p]||0)+(5-i);(voters[p]=voters[p]||[]).push(b.name+" #"+(i+1))}}));
  const fits=id=>{
    const r=byId[id];if(r.sport==="someday")return null;
    const cost=r.cost[bestSize];
    const over=list.filter(b=>CAP[b.budget]!==undefined&&cost>CAP[b.budget]).map(b=>b.name);
    const sportNo=list.filter(b=>(b.sport==="Tennis only"&&r.sport==="pickleball")||(b.sport==="Pickleball only"&&r.sport==="tennis")).map(b=>b.name);
    const lv=levelOf(r);
    const levelNo=list.filter(b=>LEVELS.slice(0,3).includes(b.level)&&b.level!==lv).map(b=>b.name);
    return {cost,over,sportNo,lv,levelNo,flag:r.flag||"",issues:over.length*2+sportNo.length*2+levelNo.length};
  };
  const ranked=Object.entries(pts).map(([id,p])=>({id,p,fit:fits(id),who:voters[id]})).sort((a,b)=>b.p-a.p);
  const main=ranked.filter(x=>x.fit);
  const best=main.slice().sort((a,b)=>(b.p-b.fit.issues*1.5)-(a.p-a.fit.issues*1.5)||b.p-a.p)[0];
  const backup=best&&main.filter(x=>x.id!==best.id).sort((a,b)=>(b.p-b.fit.issues*1.5)-(a.p-a.fit.issues*1.5))[0];
  const someday=ranked.filter(x=>!x.fit);
  const sportMode=sport.slice().sort((a,b)=>b[1]-a[1])[0];
  const levelMode=level.filter(l=>l[0]!=="Go with the flow").sort((a,b)=>b[1]-a[1])[0];
  const caps=list.map(b=>CAP[b.budget]).filter(v=>v!==undefined);
  const tightest=caps.length?Math.min(...caps):Infinity;
  return {n,sizes,bestSize,wk,bestWk,sport,level,budget,ranked,main,best,backup,someday,sportMode,levelMode,tightest};
}


function renderPlan() {
  const list = Object.values(ballots);
  if (!list.length) { $("planBox").innerHTML = '<p class="empty">No ballots yet. The plan appears once the first one is saved.</p>'; return; }
  const A = analyze(list);
  const missing = NAMES.filter((n) => !list.some((b) => b.name === n));
  const wkName = A.bestWk[1].length ? A.bestWk[0] : "No weekend picked yet";
  const cant = list.map((b) => b.name).filter((n) => !A.bestWk[1].includes(n));
  const b = A.best, bk = A.backup, sizeAvg = A.sizes.find((s) => s[0] === A.bestSize);
  const topIdea = ideas.slice().sort((x, y) => (y.plus || []).length - (x.plus || []).length)[0];
  $("planBox").innerHTML = `
    <div class="plan-grid">
      <div class="pick"><div class="k">Resort</div><div class="v">${b ? esc(byId[b.id].name) : "—"}</div><div class="why">${b ? `${b.p} pts · ${esc(byId[b.id].sport)} · ${money(b.fit.cost)} pp at ${A.bestSize}${b.fit.over.length ? " · over budget for " + esc(b.fit.over.join(", ")) : " · fits every budget"}` : "No this-spring picks yet"}</div></div>
      <div class="pick"><div class="k">Weekend</div><div class="v">${esc(wkName)}</div><div class="why">${A.bestWk[1].length} of ${A.n} can go${cant.length && A.bestWk[1].length ? " · not " + esc(cant.join(", ")) : ""}</div></div>
      <div class="pick"><div class="k">Group size</div><div class="v">${A.bestSize} people</div><div class="why">${sizeAvg[2] ? sizeAvg[1].toFixed(1) + " ★ average" : "No ratings yet"}</div></div>
      <div class="pick"><div class="k">Style</div><div class="v">${esc(A.levelMode && A.levelMode[1] ? A.levelMode[0] : "Flexible")}</div><div class="why">${esc(A.sportMode[1] ? A.sportMode[0] : "")}${A.tightest < Infinity ? " · tightest budget " + money(A.tightest) : ""}</div></div>
    </div>
    ${bk ? `<p class="sub" style="margin:0">Backup: <b>${esc(byId[bk.id].name)}</b> (${bk.p} pts, ${money(bk.fit.cost)} pp at ${A.bestSize}).</p>` : ""}
    ${topIdea && (topIdea.plus || []).length ? `<p class="sub" style="margin:0">Most-liked idea: “${esc(topIdea.text)}” (${topIdea.plus.length} +1)</p>` : ""}
    <p class="waiting">${A.n} of ${NAMES.length} ballots in${missing.length ? ". Still waiting on " + esc(missing.join(", ")) : ". Everyone has voted"}.</p>`;
}

// ---------- 6. Idea board ----------
function renderIdeas() {
  const list = ideas.slice().sort((a, b) => (b.plus || []).length - (a.plus || []).length || 0);
  $("ideaList").innerHTML = list.length ? list.map((i) => {
    const mine = (i.plus || []).includes(me);
    return `<div class="idea"><p>${esc(i.text)}</p>
      <div class="by">${esc(i.by)} · ${when(i.createdAt)}${i.uid === api?.uid ? ` · <button type="button" class="linkbtn" data-deli="${i.id}">delete</button>` : ""}</div>
      <div class="plus"><button type="button" data-plus="${i.id}" aria-pressed="${mine}" aria-label="Plus one">+1 ${(i.plus || []).length || ""}</button>
      ${(i.plus || []).length ? `<small>${esc(i.plus.join(", "))}</small>` : ""}</div></div>`;
  }).join("") : '<p class="empty">No ideas yet. Post the first one.</p>';
  renderPlan();
}
const ideaStatus = (m, c) => { const s = $("ideaStatus"); s.textContent = m; s.className = "status " + (c || ""); };
$("ideaForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const t = $("ideaText"), text = t.value.trim();
  if (!text) return;
  if (!needMe((m) => ideaStatus(m, "err"))) return;
  try { await api.addIdea(text); t.value = ""; ideaStatus("Posted.", "ok"); } catch (err) { ideaStatus("Couldn't post that. Try again.", "err"); }
});
$("ideaList").addEventListener("click", async (e) => {
  const p = e.target.closest("[data-plus]"), d = e.target.closest("[data-deli]");
  if (p) { if (!needMe((m) => ideaStatus(m, "err"))) return; const i = ideas.find((x) => x.id === p.dataset.plus); if (i) try { await api.togglePlus(i); } catch (err) { ideaStatus("Couldn't save that +1.", "err"); } }
  if (d) { const i = ideas.find((x) => x.id === d.dataset.deli); if (i) try { await api.deleteIdea(i); } catch (err) { ideaStatus("Couldn't delete that.", "err"); } }
});

// ---------- 8. Start ----------
renderWho(); renderCards(); renderPicks(); renderSizes(); syncInputs(); renderBoard(); renderIdeas(); renderPlan();
if (DEMO) { startDemo(); renderBoard(); renderIdeas(); renderCards(); renderPlan(); }
else startFirebase().catch((err) => { console.error(err); boardMsg("Couldn't connect to the group board. Reload to try again."); });
