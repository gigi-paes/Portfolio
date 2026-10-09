// Cielo de estrellas de toda la página.
// - Es un canvas fijo detrás del contenido; las estrellas tienen un poco de
//   parallax al scrollear (cada una a su profundidad).
// - El mouse las va corriendo y abre un camino que después se cierra despacio.
// - En el hero respeta la intro: aparece recién cuando aterrizan las tres
//   estrellas grandes. Detrás del nombre no hay hueco: lo que hay es un
//   blur en CSS (.hero-content::before) que desenfoca las estrellas.
(() => {
  const canvas = document.getElementById("sky");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const COLORS = ["#e4e7ee", "#b4b9c6", "#8a90a0"];
  const RADIUS = 110;    // alcance del mouse
  const PUSH = 1.6;      // fuerza con la que las corre
  const RETURN = 0.006;  // qué tan rápido vuelven (bajo = el camino dura más)
  const DAMP = 0.9;
  const FADE_IN = [3200, 4800]; // ms: aparece cuando terminó la intro del hero

  // misma estrella gordita del hero, prerenderizada una vez por color
  const SPRITE = 64;
  const sprites = COLORS.map((color) => {
    const c = document.createElement("canvas");
    c.width = c.height = SPRITE;
    const g = c.getContext("2d");
    g.scale(SPRITE / 100, SPRITE / 100);
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 ? 19 : 36;
      g[i ? "lineTo" : "moveTo"](50 + Math.cos(a) * r, 53 + Math.sin(a) * r);
    }
    g.closePath();
    g.fillStyle = g.strokeStyle = color;
    g.lineWidth = 13;
    g.lineJoin = "round";
    g.fill();
    g.stroke();
    return c;
  });

  const j = (n) => (Math.random() - 0.5) * 2 * n;
  const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

  let W = 0, H = 0, dpr = 1, stars = [];
  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    // grilla con jitter para que queden repartidas sin amontonarse
    const cell = W < 700 ? 34 : 40;
    stars = [];
    for (let y = cell / 2; y < H; y += cell) {
      for (let x = cell / 2; x < W; x += cell) {
        const big = Math.random() < 0.06;
        stars.push({
          hx: x + j(cell * 0.45), hy: y + j(cell * 0.45),
          ox: 0, oy: 0, vx: 0, vy: 0,          // desplazamiento por el mouse
          depth: 0.04 + Math.random() * 0.16,  // parallax
          s: big ? 15 + Math.random() * 11 : 5 + Math.random() * 8,
          rot: Math.random() * Math.PI * 2, vr: 0,
          sprite: sprites[(Math.random() * sprites.length) | 0],
          alpha: 0.45 + Math.random() * 0.5,
          tw: 0.6 + Math.random() * 1.6, ph: Math.random() * Math.PI * 2,
        });
      }
    }
  }
  build();
  let bt;
  window.addEventListener("resize", () => { clearTimeout(bt); bt = setTimeout(build, 150); });

  let pointer = null;
  window.addEventListener("pointermove", (e) => { pointer = { x: e.clientX, y: e.clientY }; });
  document.documentElement.addEventListener("pointerleave", () => { pointer = null; });

  const t0 = performance.now();

  function frame(now) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const intro = reduced ? 1 : smooth(FADE_IN[0], FADE_IN[1], now - t0);
    const scroll = window.scrollY;
    const t = now / 1000;

    // nada de estrellas por debajo del final del footer
    const footer = document.querySelector(".footer");
    const limit = footer ? Math.min(H, footer.getBoundingClientRect().bottom) : H;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, Math.max(0, limit) * dpr);
    ctx.clip();

    if (intro > 0) {
      for (const st of stars) {
        // parallax con vuelta: al salir por arriba reaparece por abajo
        const baseY = ((st.hy - scroll * st.depth) % H + H) % H;
        let x = st.hx + st.ox, y = baseY + st.oy;

        if (pointer && !reduced) {
          const dx = x - pointer.x, dy = y - pointer.y;
          const d = Math.hypot(dx, dy);
          if (d < RADIUS && d > 0.01) {
            const f = (1 - d / RADIUS) * PUSH;
            st.vx += (dx / d) * f;
            st.vy += (dy / d) * f;
            st.vr += (Math.random() - 0.5) * f * 0.06;
          }
        }
        // resorte suave hacia su lugar: el camino se va cerrando solo
        st.vx = (st.vx - st.ox * RETURN) * DAMP;
        st.vy = (st.vy - st.oy * RETURN) * DAMP;
        st.vr *= 0.94;
        st.ox += st.vx; st.oy += st.vy; st.rot += st.vr;
        x = st.hx + st.ox; y = baseY + st.oy;

        let a = reduced ? st.alpha : st.alpha * (0.7 + 0.3 * Math.sin(t * st.tw + st.ph));
        a *= intro;
        if (a < 0.02) continue;

        ctx.globalAlpha = a;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.translate(x, y);
        ctx.rotate(st.rot);
        ctx.drawImage(st.sprite, -st.s / 2, -st.s / 2, st.s, st.s);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
