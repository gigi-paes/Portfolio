// Estrella plana "gordita" con puntas redondeadas (estilo konpeito).
// El redondeo sale de un stroke grueso del mismo color con linejoin round.
window.makeStar = function makeStar(color) {
  const cx = 50, cy = 53, outer = 36, inner = 19;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? inner : outer;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`);
  }
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <polygon points="${pts.join(" ")}" fill="${color}" stroke="${color}"
      stroke-width="13" stroke-linejoin="round"/>
  </svg>`;
};
