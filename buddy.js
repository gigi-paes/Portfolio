// Kurosuke del footer: tiene patitas y se puede agarrar y arrastrar.
// Mientras está en el aire patalea y se inclina según hacia dónde lo movés;
// al soltarlo cae, rebota un poquito y vuelve caminando a su lugar.
// Choca con las estrellas de contacto (las empuja y rebota) y habla con un globito.
(() => {
  const buddy = document.getElementById("buddy");
  const zone = document.getElementById("buddy-zone");
  const shadow = document.getElementById("buddy-shadow");
  const footer = document.querySelector(".footer");
  const bubble = document.getElementById("buddy-bubble");
  const bubbleText = bubble?.querySelector("span");
  if (!buddy || !zone) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const GRAVITY = 1.1;
  const HOME_PULL = 0.035; // qué tan rápido vuelve caminando a su lugar
  const FOLLOW = 0.3;      // qué tan pegado sigue al dedo/mouse

  let x = 0, y = 0, vx = 0, vy = 0, tilt = 0;
  let dragging = false, grabX = 0, grabY = 0, tx = 0, ty = 0;
  let legL, legR, body;

  // el svg lo crea soot.js; lo buscamos cuando ya existe
  function parts() {
    legL = buddy.querySelector(".leg-l");
    legR = buddy.querySelector(".leg-r");
    body = buddy.querySelector(".soot-body");
  }

  // límites: que no se salga del footer
  function bounds() {
    const z = zone.getBoundingClientRect();
    const f = footer.getBoundingClientRect();
    const b = buddy.getBoundingClientRect();
    const homeL = b.left - x, homeT = b.top - y;
    return {
      minX: f.left - homeL + 8, maxX: f.right - homeL - b.width - 8,
      minY: f.top - homeT + 8, maxY: 0,
      z,
    };
  }

  // ---------- globito ----------
  const IDLE = "Me arraste!!!";
  let sayTimer;
  function say(text, ms) {
    if (!bubble) return;
    clearTimeout(sayTimer);
    bubble.classList.remove("hidden");
    if (bubbleText.textContent !== text) {
      bubbleText.textContent = text;
      bubble.classList.remove("pop");
      void bubble.offsetWidth;
      bubble.classList.add("pop");
    }
    if (ms) sayTimer = setTimeout(() => say(dragging ? pick(AIR) : IDLE), ms);
  }
  const pick = (list) => list[(Math.random() * list.length) | 0];
  const AIR = ["Wiii!!", "Uau!", "Mais alto!", "Iupiii!"];
  const HIT = ["Ai!", "Opa!", "Desculpa!", "Bati!"];
  const LAND = ["De novo!", "Que divertido!", "Ufa!"];

  // ---------- estrellas que chocan ----------
  const stars = [...document.querySelectorAll(".info-star")].map((el) => ({
    el, ox: 0, oy: 0, vx: 0, vy: 0, spin: 0, vs: 0,
  }));
  let lastHit = 0;

  function collide(now) {
    const br = buddy.getBoundingClientRect();
    const bx = br.left + br.width / 2, by = br.top + br.height * 0.45;
    const rb = buddy.offsetWidth * 0.33;
    for (const st of stars) {
      const r = st.el.getBoundingClientRect();
      const sx = r.left + r.width / 2, sy = r.top + r.height / 2;
      const rs = st.el.offsetWidth * 0.36;
      const dx = sx - bx, dy = sy - by;
      const d = Math.hypot(dx, dy) || 0.01;
      const overlap = rb + rs - d;
      if (overlap <= 0) continue;
      const nx = dx / d, ny = dy / d;
      // la estrella se corre y se lleva parte del impulso de la mascota
      const share = dragging ? 1 : 0.6;
      st.ox += nx * overlap * share;
      st.oy += ny * overlap * share;
      st.vx += nx * overlap * 0.2 + vx * 0.25;
      st.vy += ny * overlap * 0.2 + vy * 0.25;
      st.vs += (nx * vy - ny * vx) * 0.8;
      // la mascota rebota (si no la estás sosteniendo)
      if (!dragging) {
        x -= nx * overlap * 0.4;
        y -= ny * overlap * 0.4;
        const dot = vx * nx + vy * ny;
        if (dot > 0) { vx -= 1.6 * dot * nx; vy -= 1.6 * dot * ny; }
      }
      if (now - lastHit > 700 && Math.hypot(vx, vy) > 1.5) {
        lastHit = now;
        say(pick(HIT), 1100);
        buddy.dispatchEvent(new Event("soot:hop"));
      }
    }
    // resorte: cada estrella vuelve a su lugar bamboleándose
    for (const st of stars) {
      st.vx = (st.vx - st.ox * 0.05) * 0.86;
      st.vy = (st.vy - st.oy * 0.05) * 0.86;
      st.vs = (st.vs - st.spin * 0.05) * 0.88;
      st.ox += st.vx; st.oy += st.vy;
      st.spin = Math.max(-25, Math.min(25, st.spin + st.vs)); // que el texto se siga leyendo
      st.el.style.transform = `translate(${st.ox.toFixed(1)}px, ${st.oy.toFixed(1)}px) rotate(${st.spin.toFixed(1)}deg)`;
    }
  }

  buddy.addEventListener("pointerdown", (e) => {
    if (reduced) return;
    e.preventDefault();
    say(pick(AIR));
    dragging = true;
    buddy.setPointerCapture(e.pointerId);
    buddy.classList.add("dragging");
    grabX = e.clientX - x;
    grabY = e.clientY - y;
    tx = x; ty = y;
  });
  buddy.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const b = bounds();
    tx = Math.min(b.maxX, Math.max(b.minX, e.clientX - grabX));
    ty = Math.min(b.maxY, Math.max(b.minY, e.clientY - grabY));
  });
  const drop = () => {
    if (!dragging) return;
    dragging = false;
    buddy.classList.remove("dragging");
    say(pick(LAND), 2200);
  };
  buddy.addEventListener("pointerup", drop);
  buddy.addEventListener("pointercancel", drop);

  function squash() {
    if (!body) return;
    body.classList.remove("land", "hop");
    void body.getBoundingClientRect();
    body.classList.add("land");
  }

  // el globito aparece cuando el footer entra en pantalla
  if (bubble) {
    bubble.classList.add("hidden");
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setTimeout(() => say(IDLE), 500);
    }, { threshold: 0.4 }).observe(zone);
  }

  function frame(now) {
    if (!legL) parts();
    const t = now / 1000;

    if (dragging) {
      // sigue al puntero con un poquito de retraso (se siente "colgando")
      const nx = x + (tx - x) * FOLLOW, ny = y + (ty - y) * FOLLOW;
      vx = nx - x; vy = ny - y;
      x = nx; y = ny;
    } else {
      // vuelve a su lugar en x y cae por gravedad en y
      vx = (vx + -x * HOME_PULL) * 0.86;
      if (y < 0 || vy < 0) vy += GRAVITY;
      x += vx; y += vy;
      if (y >= 0) {
        if (vy > 5) squash();
        y = 0;
        vy = vy > 5 ? -vy * 0.28 : 0; // rebotito
      }
    }

    if (!reduced) collide(now);

    // se inclina según la velocidad horizontal
    tilt += (Math.max(-28, Math.min(28, vx * 2.2)) - tilt) * 0.2;
    buddy.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${tilt.toFixed(2)}deg)`;

    // patas: patalean en el aire, caminan si se mueve por el piso, quietas si no
    if (legL && legR) {
      const air = dragging || y < -2;
      const speed = Math.min(1, Math.abs(vx) / 3);
      let a = 0;
      if (air) a = Math.sin(t * 22) * 30;
      else if (speed > 0.05) a = Math.sin(t * 16) * 22 * speed;
      legL.style.transform = `rotate(${(a - vx * 1.5).toFixed(2)}deg)`;
      legR.style.transform = `rotate(${(-a - vx * 1.5).toFixed(2)}deg)`;
    }

    // el globito sigue a la mascota
    if (bubble) bubble.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;

    // sombra en el piso: más chica y clara cuanto más alto está
    if (shadow) {
      const h = Math.min(1, -y / 320);
      shadow.style.transform = `translateX(${x.toFixed(1)}px) scale(${(1 - h * 0.6).toFixed(3)})`;
      shadow.style.opacity = (1 - h * 0.7).toFixed(3);
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
