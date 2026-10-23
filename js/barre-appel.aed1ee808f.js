// Barre d'appel du téléphone : absente tant qu'un bouton d'appel de la page ou le pied est à l'écran,
// et pendant une saisie (clavier virtuel). Aucune animation : elle est là ou elle n'y est pas.

const barre = document.querySelector('[data-barre-appel]');

if (barre) {
  const zones = document.querySelectorAll('[data-barre-retrait], [data-barre-pied]');
  const saisissable = (el) => !!el && el.nodeType === 1 && el.matches(
    'input:not([type="checkbox"], [type="radio"], [type="button"], [type="submit"], [type="reset"], [type="range"], [type="color"], [type="file"], [type="image"]), textarea, select, [contenteditable=""], [contenteditable="true"]',
  );
  const visibles = new Set();
  let saisie = false;
  let clavier = false;

  const majEtat = () => {
    barre.dataset.etat = visibles.size || saisie || clavier ? 'retiree' : 'visible';
  };

  if (zones.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entrees) => {
      for (const e of entrees) {
        if (e.isIntersecting) visibles.add(e.target);
        else visibles.delete(e.target);
      }
      majEtat();
    });
    zones.forEach((z) => io.observe(z));
  }

  document.addEventListener('focusin', (e) => {
    saisie = saisissable(e.target);
    majEtat();
  });
  document.addEventListener('focusout', () => {
    requestAnimationFrame(() => {
      saisie = saisissable(document.activeElement);
      majEtat();
    });
  });

  const vv = window.visualViewport;
  if (vv) {
    vv.addEventListener('resize', () => {
      clavier = vv.height * vv.scale < window.innerHeight * 0.75;
      majEtat();
    });
  }

  majEtat();
}
