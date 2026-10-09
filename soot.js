// Makkuro Kurosuke: bolita de hollín dibujada en SVG.
// Los ojos siguen el puntero, parpadea solo, salta al pasar el mouse
// y va soltando bolitas de hollín que se alejan y se desvanecen.
(() => {
  const NS = "http://www.w3.org/2000/svg";

  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // contorno peludo: radio base con pelitos alternados, más largos arriba (el jopo)
  function furPath(rand) {
    const cx = 100, cy = 112, R = 70, N = 160;
    let d = "";
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      const top = Math.max(0, -Math.sin(a)) ** 3;        // 1 arriba, 0 a los costados/abajo
      const bottom = Math.max(0, Math.sin(a));
      let r = R * (1 - 0.06 * bottom);                    // un poco achatada abajo
      r += i % 2 ? rand() * (6 + 10 * top) + 2 : -rand() * 3;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r * (0.94 - 0.05 * bottom);
      d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    }
    return d + "Z";
  }

  let uid = 0;

  function makeSoot(host) {
    const id = "soot" + uid++;
    const rand = rng(7 + uid * 13);
    const svg = document.createElementNS(NS, "svg");
    const withLegs = host.hasAttribute("data-legs");
    svg.setAttribute("viewBox", withLegs ? "0 0 200 250" : "0 0 200 210");
    svg.classList.add("soot");
    // patitas finitas con pie redondo; buddy.js las hace mover
    const legs = withLegs ? `
      <g class="soot-legs" fill="#050608" stroke="#050608" stroke-width="5" stroke-linecap="round">
        <g class="leg leg-l"><path d="M86 166 L80 216" fill="none"/><ellipse cx="74" cy="219" rx="10" ry="5.5" stroke="none"/></g>
        <g class="leg leg-r"><path d="M114 166 L120 216" fill="none"/><ellipse cx="126" cy="219" rx="10" ry="5.5" stroke="none"/></g>
      </g>` : "";

    svg.innerHTML = `
      <defs>
        <filter id="${id}-fuzz" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="${uid}" />
          <feDisplacementMap in="SourceGraphic" scale="9" />
        </filter>
      </defs>
      <g class="soot-dust" fill="#050608"></g>${legs}
      <g class="soot-body">
        <path d="${furPath(rand)}" fill="#050608" filter="url(#${id}-fuzz)" />
        <g class="soot-eyes">
          <g class="soot-eye">
            <ellipse cx="80" cy="118" rx="17" ry="18" class="sclera" />
            <circle class="pupil" cx="80" cy="118" r="5.5" fill="#050608" />
          </g>
          <g class="soot-eye">
            <ellipse cx="121" cy="117" rx="17" ry="18" class="sclera" />
            <circle class="pupil" cx="121" cy="117" r="5.5" fill="#050608" />
          </g>
        </g>
      </g>`;
    host.appendChild(svg);

    const pupils = [...svg.querySelectorAll(".pupil")];
    const eyes = svg.querySelector(".soot-eyes");
    const body = svg.querySelector(".soot-body");

    function look(px, py) {
      const r = svg.getBoundingClientRect();
      const scale = r.width / 200;
      pupils.forEach((p) => {
        const ex = r.left + +p.getAttribute("cx") * scale;
        const ey = r.top + +p.getAttribute("cy") * scale;
        const a = Math.atan2(py - ey, px - ex);
        const dist = Math.min(1, Math.hypot(px - ex, py - ey) / 300);
        const m = 9 * dist;
        p.setAttribute("transform", `translate(${(Math.cos(a) * m).toFixed(2)} ${(Math.sin(a) * m).toFixed(2)})`);
      });
    }

    function blink() {
      eyes.classList.add("blink");
      setTimeout(() => eyes.classList.remove("blink"), 160);
      setTimeout(blink, 2500 + Math.random() * 4000);
    }
    setTimeout(blink, 1500 + Math.random() * 2000);

    // ---------- hollín que se desprende ----------
    const dust = svg.querySelector(".soot-dust");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visible = false;

    function shed(speed = 1) {
      if (reduced) return;
      const a = Math.random() * Math.PI * 2;
      // nace en el borde del pelaje
      const r0 = 66 + Math.random() * 8;
      const x = 100 + Math.cos(a) * r0;
      const y = 112 + Math.sin(a) * r0 * 0.92;
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", x.toFixed(1));
      c.setAttribute("cy", y.toFixed(1));
      c.setAttribute("r", (0.8 + Math.random() * 2.6).toFixed(2));
      dust.appendChild(c);
      // se aleja hacia afuera, flota un poco hacia arriba y se achica
      const dist = (18 + Math.random() * 34) * speed;
      const dx = Math.cos(a) * dist + (Math.random() - 0.5) * 10;
      const dy = Math.sin(a) * dist - (6 + Math.random() * 14);
      const anim = c.animate([
        { transform: "translate(0px, 0px) scale(1)", opacity: 0 },
        { opacity: 1, offset: 0.12 },
        { transform: `translate(${dx * 0.55}px, ${dy * 0.5}px) scale(0.85)`, opacity: 0.9, offset: 0.55 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.2)`, opacity: 0 },
      ], { duration: (2200 + Math.random() * 2200) / speed, easing: "cubic-bezier(.2,.6,.4,1)" });
      anim.onfinish = () => c.remove();
    }

    function burst(n = 10) { for (let i = 0; i < n; i++) shed(1.4); }

    // goteo constante, solo mientras está en pantalla
    (function loop() {
      if (visible && !document.hidden) shed();
      setTimeout(loop, 160 + Math.random() * 200);
    })();
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(svg);

    function hop() {
      body.classList.remove("hop", "land");
      void body.getBoundingClientRect();
      body.classList.add("hop");
      burst();
    }
    host.addEventListener("pointerenter", hop);
    host.addEventListener("soot:hop", hop);

    return { look };
  }

  const sprites = [...document.querySelectorAll("[data-soot]")].map(makeSoot);

  let raf;
  window.addEventListener("pointermove", (e) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => sprites.forEach((s) => s.look(e.clientX, e.clientY)));
  });
})();
