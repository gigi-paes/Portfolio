// Marco hecho de ondas (lo usa la galería de proyectos).
// - Se dibuja solo cuando aparece en pantalla.
// - Con el mouse encima las ondas ondulan (corren alrededor y crecen);
//   al salir se calman de a poco. ripple() hace una ola más fuerte un instante.
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const PAD = 10;      // el svg sobresale por lado (ver .sketch en styles.css)
  const RADIUS = 18;   // esquinas redondeadas del marco
  const WAVE = 34;     // largo aproximado de cada onda (px)
  const AMP = 2.8;     // altura de la onda en reposo
  const AMP_HOVER = 5.5; // altura de la onda con el mouse encima
  const STEP = 3;      // cada cuántos px se calcula un punto

  // puntos sobre el contorno de un rectángulo redondeado, con su normal hacia afuera
  function perimeter(w, h) {
    const r = Math.min(RADIUS, w / 2, h / 2);
    const sw = w - 2 * r, sh = h - 2 * r, arc = (Math.PI / 2) * r;
    const corner = (cx, cy, a) => {
      const nx = Math.cos(a), ny = Math.sin(a);
      return { x: cx + nx * r, y: cy + ny * r, nx, ny };
    };
    const segs = [
      { len: sw, at: (t) => ({ x: r + t, y: 0, nx: 0, ny: -1 }) },
      { len: arc, at: (t) => corner(w - r, r, -Math.PI / 2 + t / r) },
      { len: sh, at: (t) => ({ x: w, y: r + t, nx: 1, ny: 0 }) },
      { len: arc, at: (t) => corner(w - r, h - r, t / r) },
      { len: sw, at: (t) => ({ x: w - r - t, y: h, nx: 0, ny: 1 }) },
      { len: arc, at: (t) => corner(r, h - r, Math.PI / 2 + t / r) },
      { len: sh, at: (t) => ({ x: 0, y: h - r - t, nx: -1, ny: 0 }) },
      { len: arc, at: (t) => corner(r, r, Math.PI + t / r) },
    ];
    const total = segs.reduce((s, g) => s + g.len, 0);
    const pts = [];
    for (let s = 0; s < total; s += STEP) {
      let rest = s, k = 0;
      while (rest > segs[k].len && k < segs.length - 1) rest -= segs[k++].len;
      pts.push({ s, ...segs[k].at(rest) });
    }
    return { pts, total };
  }

  function wavePath(shape, amp, phase) {
    // número entero de ondas para que el marco cierre sin cortes
    const n = Math.max(4, Math.round(shape.total / WAVE));
    const k = (2 * Math.PI * n) / shape.total;
    let d = "";
    shape.pts.forEach((p, i) => {
      const o = amp * Math.sin(p.s * k + phase);
      d += (i ? "L" : "M") + (PAD + p.x + p.nx * o).toFixed(1) + " " + (PAD + p.y + p.ny * o).toFixed(1);
    });
    return d + "Z";
  }

  window.makeWaveFrame = function makeWaveFrame(el) {
    const svg = document.createElementNS(NS, "svg");
    svg.classList.add("sketch");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(NS, "path");
    path.setAttribute("pathLength", "1");
    svg.appendChild(path);
    el.appendChild(svg);

    let shape, amp = AMP, phase = Math.random() * Math.PI * 2, speed = 0, kick = 0;
    let hover = false, raf = 0;

    function layout() {
      const w = el.offsetWidth, h = el.offsetHeight;
      if (!w || !h) return;
      svg.setAttribute("viewBox", `0 0 ${w + PAD * 2} ${h + PAD * 2}`);
      shape = perimeter(w, h);
      path.setAttribute("d", wavePath(shape, amp + kick, phase));
    }

    function tick() {
      amp += ((hover ? AMP_HOVER : AMP) - amp) * 0.08;
      speed += ((hover ? 0.09 : 0) + kick * 0.03 - speed) * 0.06;
      kick *= 0.94;
      phase += speed;
      if (shape) path.setAttribute("d", wavePath(shape, amp + kick, phase));
      const settled = !hover && kick < 0.05 && Math.abs(amp - AMP) < 0.02 && speed < 0.001;
      raf = settled ? 0 : requestAnimationFrame(tick);
    }
    const wake = () => { if (!raf && !reduced) raf = requestAnimationFrame(tick); };

    el.addEventListener("pointerenter", () => { hover = true; wake(); });
    el.addEventListener("pointerleave", () => { hover = false; });

    // se recalcula si cambia el tamaño (por ejemplo al cambiar de proyecto)
    new ResizeObserver(layout).observe(el);
    layout();

    // se dibuja solo la primera vez que entra en pantalla
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      el.classList.add("drawn");
      io.disconnect();
    }, { threshold: 0.3 });
    io.observe(el);

    return {
      ripple(strength = 6) { kick = strength; wake(); },
    };
  };
})();
