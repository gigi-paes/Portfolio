// Stack alrededor de Kurosuke: al pasar por un ícono, a la mascota se le
// iluminan los ojos del color de esa tecnología (y pega un saltito).
(() => {
  const orbit = document.getElementById("orbit");
  const list = document.getElementById("orbit-icons");
  if (!orbit || !window.STACK) return;

  // arco a la izquierda de la mascota: de arriba (232°) a abajo (128°)
  const FROM = 232, TO = 128;
  const step = (FROM - TO) / (STACK.length - 1);
  list.innerHTML = STACK.map((t, i) => `
    <li style="--a:${FROM - i * step}deg; --c:${t.color}; --i:${i}">
      <button type="button" class="tech" data-color="${t.color}" aria-label="${t.name}">
        <span class="tech-label" aria-hidden="true">${t.name}</span>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${t.svg}</svg>
      </button>
    </li>`).join("");

  // salto + ráfaga de hollín (lo maneja soot.js)
  const hop = () => orbit.querySelector("[data-soot]")?.dispatchEvent(new Event("soot:hop"));

  let current = null;
  function tint(btn) {
    if (btn === current) return;
    current = btn;
    list.querySelectorAll(".tech").forEach((b) => b.classList.toggle("on", b === btn));
    if (btn) {
      orbit.style.setProperty("--eye", btn.dataset.color);
      orbit.classList.add("tinted");
      hop();
    } else {
      orbit.style.removeProperty("--eye");
      orbit.classList.remove("tinted");
    }
  }

  // al salir de un ícono espera un toque: si entra a otro, los ojos pasan directo
  let leaveTimer;
  list.querySelectorAll(".tech").forEach((btn) => {
    btn.addEventListener("pointerenter", () => { clearTimeout(leaveTimer); tint(btn); });
    btn.addEventListener("pointerleave", (e) => {
      if (e.pointerType !== "mouse") return;
      leaveTimer = setTimeout(() => tint(null), 140);
    });
    btn.addEventListener("focus", () => tint(btn));
    btn.addEventListener("click", () => tint(btn)); // en celular: tocar
  });
  list.addEventListener("focusout", (e) => { if (!list.contains(e.relatedTarget)) tint(null); });
})();
