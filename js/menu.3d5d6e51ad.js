// Menu du téléphone, sous-menus et état de l'en-tête au défilement.
// Sans JS, les liens restent affichés à plat sous la marque et les sous-menus s'ouvrent seuls (details).

// le bouton n'existe qu'avec JS : posé depuis son modèle, rien de masqué sans JS
const modeleMenu = document.querySelector('[data-menu-modele]');
if (modeleMenu) modeleMenu.replaceWith(modeleMenu.content.cloneNode(true));

const entete = document.querySelector('[data-entete]');
const bouton = document.querySelector('[data-menu-bouton]');
const panneau = bouton && document.getElementById(bouton.getAttribute('aria-controls'));
const ecranLarge = matchMedia('(min-width: 85em)');
const racine = document.documentElement;
const sousMenus = [...document.querySelectorAll('[data-sous-menu]')];

// l'en-tête prend un filet dès qu'on a quitté le haut de page
if (entete) {
  let demande = false;
  const suivre = () => {
    demande = false;
    entete.toggleAttribute('data-defile', scrollY > 8);
  };
  addEventListener('scroll', () => {
    if (!demande) {
      demande = true;
      requestAnimationFrame(suivre);
    }
  }, { passive: true });
  suivre();
}

// un seul sous-menu ouvert à la fois ; un clic ailleurs ou Échap les referme
for (const d of sousMenus) {
  d.addEventListener('toggle', () => {
    if (d.open) for (const autre of sousMenus) if (autre !== d) autre.open = false;
  });
}
document.addEventListener('click', (e) => {
  for (const d of sousMenus) if (d.open && !d.contains(e.target)) d.open = false;
});
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const ouvert = sousMenus.find((d) => d.open);
  if (ouvert) {
    ouvert.open = false;
    ouvert.querySelector('summary').focus();
  }
});

if (bouton && panneau) {
  // le libellé visible reste « Menu » ; ouvert, le nom accessible dit qu'on peut le fermer
  const texteFermer = bouton.dataset.libelleFermer || bouton.textContent.trim();
  const autour = [...document.querySelectorAll('main, footer')];

  const ouvert = () => bouton.getAttribute('aria-expanded') === 'true';

  function ouvrir() {
    bouton.setAttribute('aria-expanded', 'true');
    bouton.setAttribute('aria-label', texteFermer);
    panneau.setAttribute('data-ouvert', '');
    racine.classList.add('menu-ouvert');
    // le reste de la page sort du parcours clavier tant que le menu est ouvert
    for (const el of autour) el.inert = true;
    const premier = panneau.querySelector('a, summary, button');
    if (premier) premier.focus();
  }

  function fermer(rendreFocus = true) {
    bouton.setAttribute('aria-expanded', 'false');
    bouton.removeAttribute('aria-label');
    panneau.removeAttribute('data-ouvert');
    racine.classList.remove('menu-ouvert');
    for (const el of autour) el.inert = false;
    if (rendreFocus) bouton.focus();
  }

  bouton.addEventListener('click', () => (ouvert() ? fermer() : ouvrir()));
  panneau.addEventListener('click', (e) => {
    if (ouvert() && e.target.closest('a')) fermer(false);
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && ouvert()) fermer();
  });
  ecranLarge.addEventListener('change', (e) => {
    if (e.matches && ouvert()) fermer(false);
  });
}
