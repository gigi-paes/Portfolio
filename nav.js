// Navbar: siempre visible (acompaña todo el recorrido), toma blur al dejar
// el hero e ilumina el link de la sección que está en pantalla.
(() => {
  const nav = document.getElementById("nav");
  const links = [...nav.querySelectorAll("[data-section]")];
  const footer = document.getElementById("contato");

  function setActive(id) {
    links.forEach((a) => a.classList.toggle("active", a.dataset.section === id));
  }

  // al llegar al final de la página, el footer siempre cuenta como activo
  const atEnd = () => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;

  function onScroll(y) {
    nav.classList.toggle("scrolled", y > 24);
    if (footer && atEnd()) setActive(footer.id);
  }

  if (window.lenis) window.lenis.on("scroll", ({ scroll }) => onScroll(scroll));
  else window.addEventListener("scroll", () => onScroll(window.scrollY), { passive: true });
  onScroll(window.scrollY);

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting || (footer && atEnd())) return;
      setActive(e.target.id);
    });
  }, { rootMargin: "-45% 0px -45% 0px" });

  io.observe(document.getElementById("hero"));
  links.forEach((a) => io.observe(document.getElementById(a.dataset.section)));
})();
