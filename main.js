(() => {
  const hero = document.getElementById("hero");
  const nameEl = document.getElementById("name");
  const lastEl = document.getElementById("last");
  const starsEl = document.getElementById("stars");
  const canvas = document.getElementById("trail");
  const svg = document.querySelector("svg.paths");
  const ctx = canvas.getContext("2d");

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const DURATION = 2300; // ms de vuelo por estrella
  const START = 800;     // espera a que aparezca el nombre
  const STAGGER = 220;   // separación entre estrellas

  // Posición final de cada estrella, en unidades del tamaño de fuente (F),
  // relativa al borde derecho y al centro vertical de "Paes".
  const STARS = [
    { dx: 0.72, dy: -0.04, size: 0.95, rot: -10, spin: 1,  color: "#e4e7ee" },
    { dx: 1.58, dy: -0.5,  size: 0.58, rot: 16,  spin: -1, color: "#b4b9c6" },
    { dx: 1.46, dy: 0.44,  size: 0.4,  rot: -4,  spin: 1,  color: "#8a90a0" },
  ];

  const stars = STARS.map((cfg, i) => {
    const el = document.createElement("div");
    el.className = "star";
    el.innerHTML = makeStar(cfg.color);
    starsEl.appendChild(el);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    svg.appendChild(path);
    return { cfg, i, el, path, len: 0, target: null, sizePx: 0, landed: false, history: [] };
  });

  let particles = [];
  let dpr = 1;

  // ---------- geometría ----------
  function rel(r, base) {
    return {
      l: r.left - base.left, t: r.top - base.top,
      r: r.right - base.left, b: r.bottom - base.top,
      w: r.width, h: r.height,
      cx: r.left - base.left + r.width / 2,
      cy: r.top - base.top + r.height / 2,
    };
  }

  function layout() {
    const base = hero.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = base.width * dpr;
    canvas.height = base.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const N = rel(nameEl.getBoundingClientRect(), base);
    const L = rel(lastEl.getBoundingClientRect(), base);
    const F = parseFloat(getComputedStyle(nameEl).fontSize);

    stars.forEach((s) => {
      const { dx, dy, size } = s.cfg;
      const k = s.i * 0.12 * F; // cada estrella hace un recorrido levemente distinto
      const T = { x: L.r + dx * F, y: L.cy + dy * F };
      s.target = T;
      s.sizePx = size * F;
      s.el.style.width = s.sizePx + "px";

      // Recorrido como la flecha del boceto: nace abajo al medio, barre hacia
      // la izquierda, sube cruzando por detrás de "Gi", hace el arco por arriba
      // del nombre y baja a su lugar a la derecha.
      const S  = { x: N.cx, y: N.b + 0.85 * F };
      const P1 = { x: N.l + 0.55 * F + k * 0.5, y: N.t + 0.55 * N.h };
      const A  = { x: N.l + 0.55 * N.w, y: N.t - 0.85 * F - k };

      const d = [
        `M ${S.x} ${S.y}`,
        `C ${S.x - 0.45 * N.w} ${S.y + 0.25 * F}, ${P1.x - 0.3 * F} ${P1.y + 0.9 * F}, ${P1.x} ${P1.y}`,
        `C ${P1.x + 0.15 * F} ${P1.y - 0.6 * F}, ${A.x - 0.35 * N.w} ${A.y}, ${A.x} ${A.y}`,
        `C ${A.x + 0.3 * N.w} ${A.y}, ${T.x - 0.1 * F} ${T.y - 0.9 * F}, ${T.x} ${T.y}`,
      ].join(" ");
      s.path.setAttribute("d", d);
      s.len = s.path.getTotalLength();

      if (s.landed) place(s, T.x, T.y, 1, s.cfg.rot, 1);
    });
  }

  // ---------- helpers ----------
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function place(s, x, y, scale, rot, opacity) {
    const h = s.sizePx / 2;
    s.el.style.transform = `translate3d(${x - h}px, ${y - h}px, 0) rotate(${rot}deg) scale(${scale})`;
    s.el.style.opacity = opacity;
  }

  // ---------- animación ----------
  let t0 = null;

  function frame(now) {
    if (t0 === null) t0 = now;
    const elapsed = now - t0;
    let active = false;

    stars.forEach((s) => {
      if (s.landed) {
        if (s.history.length) { s.history.shift(); active = true; }
        return;
      }
      const t = clamp((elapsed - START - s.i * STAGGER) / DURATION);
      if (t <= 0) { active = true; return; }

      const u = easeInOutCubic(t);
      const p = s.path.getPointAtLength(u * s.len);

      // nace chica desde el centro, pasa chica (lejos) por detrás del nombre
      // y crece a medida que se acerca a su lugar
      const emerge = easeOutCubic(clamp(t / 0.14));
      const scale = emerge * lerp(0.42, 1, smooth(0.32, 1, u));
      const rot = s.cfg.rot + (1 - easeOutCubic(u)) * 300 * s.cfg.spin;
      place(s, p.x, p.y, scale, rot, emerge);

      s.history.push({ x: p.x, y: p.y, r: s.sizePx * scale });
      if (s.history.length > 26) s.history.shift();

      if (Math.random() < 0.55 && t < 0.97) spawnSpark(p.x, p.y, s.sizePx * scale);

      if (t >= 1) {
        s.landed = true;
        s.el.classList.add("landed");
        place(s, s.target.x, s.target.y, 1, s.cfg.rot, 1);
      }
      active = true;
    });

    drawTrail();
    if (active || particles.length) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function spawnSpark(x, y, r) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * r * 0.35;
    particles.push({
      x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.2) * 0.4,
      life: 1, decay: 0.012 + Math.random() * 0.02,
      size: 0.6 + Math.random() * 1.4,
    });
  }

  function drawTrail() {
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    ctx.lineCap = "round";

    // estela tipo cometa detrás de cada estrella
    stars.forEach((s) => {
      const h = s.history;
      for (let j = 1; j < h.length; j++) {
        const k = j / h.length;
        ctx.strokeStyle = `rgba(205, 210, 222, ${0.28 * k * k})`;
        ctx.lineWidth = Math.max(0.5, h[j].r * 0.16 * k);
        ctx.beginPath();
        ctx.moveTo(h[j - 1].x, h[j - 1].y);
        ctx.lineTo(h[j].x, h[j].y);
        ctx.stroke();
      }
    });

    // chispitas blancas
    particles = particles.filter((p) => (p.life -= p.decay) > 0);
    particles.forEach((p) => {
      p.x += p.vx; p.y += p.vy;
      ctx.fillStyle = `rgba(244, 246, 251, ${p.life * 0.9})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ---------- arranque ----------
  function start() {
    layout();
    if (reduced) {
      stars.forEach((s) => { s.landed = true; s.el.classList.add("landed"); });
      layout();
      return;
    }
    requestAnimationFrame(frame);
  }

  let resizeRaf;
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(layout);
  });

  (document.fonts ? document.fonts.ready : Promise.resolve()).then(start);

  // ---------- secciones que aparecen al scrollear ----------
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.2 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
})();
