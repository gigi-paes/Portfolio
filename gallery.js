// Galería de proyectos: trae los repos públicos de github.com/gigi-paes,
// los lista a la izquierda y muestra el elegido en un panel con marco de ondas.
// - Guarda la respuesta 1 hora en localStorage (la API sin login permite
//   60 pedidos por hora).
// - Si GitHub no responde, usa la copia guardada en data/projects.json.
(() => {
  const USER = "gigi-paes";
  const API = `https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`;
  const CACHE_KEY = "gp-repos-v1";
  const CACHE_MS = 60 * 60 * 1000;
  const HIDE = [USER]; // el repo del perfil no es un proyecto

  const list = document.getElementById("gallery-list");
  const view = document.getElementById("gallery-view");
  const content = document.getElementById("gallery-content");
  if (!list || !view) return;
  const frame = window.makeWaveFrame ? makeWaveFrame(view) : null;

  // colores por lenguaje (los mismos del stack donde coinciden)
  const LANG_COLORS = {
    TypeScript: "#4f9ee8", JavaScript: "#F7DF1E", Python: "#4B8BBE", "C#": "#A179DC",
    HTML: "#E34F26", CSS: "#8A5CD8", SCSS: "#cf649a", Java: "#e76f00", "C++": "#f34b7d",
    C: "#a8b9cc", PLpgSQL: "#F29111", TSQL: "#F29111", Shell: "#89e051", Dockerfile: "#4fa3e0",
  };
  const langColor = (l) => LANG_COLORS[l] || "#b4b9c6";

  // ---------- helpers ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // "Event-Management-API" → "Event Management API", "estudoFrontEnd" → "Estudo Front End"
  const pretty = (name) => {
    const s = name.replace(/[-_]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\s+/g, " ").trim();
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const date = (iso) => new Date(iso).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "");
  const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : null);

  const store = {
    get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
  };

  async function loadRepos() {
    const cached = store.get(CACHE_KEY);
    if (cached && Date.now() - cached.t < CACHE_MS) return cached.data;
    try {
      const res = await fetch(API, { headers: { Accept: "application/vnd.github+json" } });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      store.set(CACHE_KEY, { t: Date.now(), data });
      return data;
    } catch {
      if (cached) return cached.data; // vencido pero mejor que nada
      const res = await fetch("data/projects.json");
      return res.json();
    }
  }

  // lenguajes de un repo (para la barrita), se pide solo al elegirlo
  const langCache = {};
  async function loadLanguages(repo) {
    const key = "gp-lang-" + repo.name;
    if (langCache[key]) return langCache[key];
    const cached = store.get(key);
    if (cached && Date.now() - cached.t < CACHE_MS * 24) return (langCache[key] = cached.data);
    try {
      const res = await fetch(`https://api.github.com/repos/${repo.full_name}/languages`);
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      store.set(key, { t: Date.now(), data });
      return (langCache[key] = data);
    } catch {
      return repo.language ? { [repo.language]: 1 } : {};
    }
  }

  // ---------- render ----------
  let repos = [];
  let current = -1;

  function renderList() {
    list.innerHTML = repos.map((r, i) => `
      <li role="presentation">
        <button type="button" role="option" class="gallery-item" data-i="${i}" aria-selected="false">
          <span class="gi-num">${String(i + 1).padStart(2, "0")}</span>
          <span class="gi-name">${esc(pretty(r.name))}</span>
          <span class="gi-meta">
            ${r.language ? `<i style="--c:${langColor(r.language)}"></i>${esc(r.language)} · ` : ""}${new Date(r.pushed_at).getFullYear()}
          </span>
        </button>
      </li>`).join("");
  }

  async function select(i, focus = false) {
    if (i === current || !repos[i]) return;
    current = i;
    const r = repos[i];
    list.querySelectorAll(".gallery-item").forEach((b, k) => {
      b.setAttribute("aria-selected", k === i ? "true" : "false");
      b.tabIndex = k === i ? 0 : -1;
      if (k === i && focus) b.focus();
    });
    // en celular la lista es horizontal: centramos el elegido
    list.querySelector(`[data-i="${i}"]`)?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });

    const home = safeUrl(r.homepage);
    content.classList.remove("in");
    void content.offsetWidth;
    content.innerHTML = `
      <div class="gv-top">
        ${r.language ? `<span class="gv-chip"><i style="--c:${langColor(r.language)}"></i>${esc(r.language)}</span>` : ""}
        ${r.fork ? `<span class="gv-chip">Colaboração</span>` : ""}
        <span class="gv-date">Atualizado em ${date(r.pushed_at)}</span>
      </div>
      <h3 class="gv-name">${esc(pretty(r.name))}</h3>
      <p class="gv-repo">${esc(r.full_name)}</p>
      <p class="gv-desc">${esc(r.description || "Ainda sem descrição — dá uma olhada no repositório.")}</p>
      <div class="gv-langs" aria-label="Linguagens"></div>
      <div class="gv-links">
        <a class="gv-btn" href="${esc(r.html_url)}" target="_blank" rel="noopener">Ver no GitHub ↗</a>
        ${home ? `<a class="gv-btn ghost" href="${esc(home)}" target="_blank" rel="noopener">Ver site ↗</a>` : ""}
      </div>`;
    content.classList.add("in");
    frame?.ripple();

    const langs = await loadLanguages(r);
    if (current !== i) return; // ya eligieron otro
    const total = Object.values(langs).reduce((a, b) => a + b, 0);
    const box = content.querySelector(".gv-langs");
    if (!total || !box) return;
    const items = Object.entries(langs).map(([l, n]) => ({ l, p: (n / total) * 100 }));
    box.innerHTML = `
      <div class="gv-bar">${items.map((x) => `<span style="width:${x.p}%; --c:${langColor(x.l)}"></span>`).join("")}</div>
      <ul class="gv-legend">${items.map((x) => `<li><i style="--c:${langColor(x.l)}"></i>${esc(x.l)} <b>${x.p < 1 ? "<1" : Math.round(x.p)}%</b></li>`).join("")}</ul>`;
  }

  list.addEventListener("click", (e) => {
    const b = e.target.closest(".gallery-item");
    if (b) select(+b.dataset.i);
  });
  // flechas para moverse por la lista
  list.addEventListener("keydown", (e) => {
    const next = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select((current + next + repos.length) % repos.length, true);
  });

  loadRepos().then((data) => {
    repos = (Array.isArray(data) ? data : [])
      .filter((r) => !HIDE.includes(r.name))
      .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
    if (!repos.length) {
      content.innerHTML = `<p class="gallery-loading">Não consegui carregar os projetos agora. Veja em <a href="https://github.com/${USER}" target="_blank" rel="noopener">github.com/${USER}</a>.</p>`;
      return;
    }
    renderList();
    select(0);
  });
})();
