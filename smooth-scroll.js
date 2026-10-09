// Scroll suave global con Lenis (misma config que el portfolio de Luca).
// También suaviza los links a anclas y se apaga si se pidió reducir el movimiento.
(() => {
  // Siempre arrancar en el hero: al recargar o entrar con un #ancla en la URL,
  // el navegador no recuerda la posición ni salta a la sección.
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  const toTop = () => { window.scrollTo(0, 0); window.lenis?.scrollTo(0, { immediate: true }); };
  toTop();
  window.addEventListener("load", toTop);
  window.addEventListener("pageshow", (e) => { if (e.persisted) toTop(); });

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const lenis = new Lenis({
    lerp: 0.14, // un poco más liviano que en el portfolio de Luca (0.1)
    anchors: { offset: -64 }, // alto del navbar
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  window.lenis = lenis;
})();
