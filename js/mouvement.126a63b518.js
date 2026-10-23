// Mouvement du site : apparitions, titres découpés, décalages, parallaxe, épinglage, boutons magnétiques.
// Sans dépendance (IntersectionObserver et Web Animations). GSAP et ScrollTrigger ne servent
// que s'ils ont été chargés depuis vendor/ avant ce module.
//
//   data-apparition="monte|fondu|rideau|masque|echelle"   une fois, à l'entrée dans l'écran
//   data-decoupe="lignes|mots"                             titre découpé sur ses lignes réelles
//   data-decalage="0.08"                                   délai entre enfants (secondes)
//   data-parallaxe="0.15"                                  fraction de la vitesse de défilement
//   data-epingle="120%"                                    scène épinglée (GSAP seulement)
//   data-magnetique="0.3"                                  suit le pointeur (souris seulement)

const racine = document.documentElement;
const moinsDeMouvement = matchMedia('(prefers-reduced-motion: reduce)');
const pointeurFin = matchMedia('(hover: hover) and (pointer: fine)');

const jeton = (nom) => getComputedStyle(racine).getPropertyValue(nom).trim();

function enMs(valeur, defaut) {
  const n = parseFloat(valeur);
  if (Number.isNaN(n)) return defaut;
  return /ms$/.test(valeur) ? n : n * 1000;
}

const vitesse = () => parseFloat(jeton('--v')) || 1;
const duree = (nom, defaut) => enMs(jeton(nom), defaut) * vitesse();
const courbe = (nom, defaut) => jeton(nom) || defaut;
const nombre = (valeur, defaut) => {
  const n = parseFloat(valeur);
  return Number.isFinite(n) ? n : defaut;
};

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const avecGsap = Boolean(gsap && ScrollTrigger);

// ---- effets d'apparition ----

function effet(nom) {
  const distance = jeton('--mouvement-distance') || '0.9em';
  switch (nom) {
    case 'fondu':
      return [{ opacity: 0 }, { opacity: 1 }];
    case 'rideau':
      return [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }];
    case 'masque':
      return [{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)' }];
    case 'echelle':
      return [{ opacity: 0, transform: 'scale(0.965)' }, { opacity: 1, transform: 'none' }];
    default:
      return [{ opacity: 0, transform: `translateY(${distance})` }, { opacity: 1, transform: 'none' }];
  }
}

function jouer(el, nom, retard) {
  const long = nom === 'rideau' || nom === 'masque';
  const options = {
    duration: duree(long ? '--duree-ouverture' : '--duree-longue', 950),
    easing: courbe('--courbe-douce', 'ease-out'),
    delay: retard,
    fill: 'backwards',
  };
  const animations = [el.animate(effet(nom), options)];
  // l'image d'un rideau ou d'un masque se pose en même temps qu'elle se découvre
  if (long) {
    const image = el.querySelector('img, video');
    if (image) {
      animations.push(image.animate(
        [{ transform: 'scale(1.12)' }, { transform: 'none' }],
        { ...options, duration: options.duration * 1.25 },
      ));
    }
  }
  return animations;
}

// ---- titres découpés sur leurs lignes réelles, recousus une fois joués ----

const origines = new WeakMap();

function decouper(el) {
  if (el.classList.contains('decoupe')) return;
  const mode = el.dataset.decoupe === 'mots' ? 'mots' : 'lignes';
  origines.set(el, el.innerHTML);

  const jetons = [];
  for (const n of [...el.childNodes]) {
    if (n.nodeType === Node.TEXT_NODE) {
      for (const m of n.textContent.split(/\s+/)) if (m) jetons.push(document.createTextNode(m));
    } else if (n.nodeName === 'BR') {
      jetons.push('saut');
    } else if (n.nodeType === Node.ELEMENT_NODE) {
      jetons.push(n.cloneNode(true));
    }
  }

  el.textContent = '';
  const mots = [];
  for (const j of jetons) {
    if (j === 'saut') {
      el.append(document.createElement('br'));
      continue;
    }
    const s = document.createElement('span');
    s.append(j);
    el.append(s, ' ');
    mots.push(s);
  }

  if (mode === 'mots') {
    el.textContent = '';
    mots.forEach((s, i) => {
      const a = document.createElement('span');
      a.className = 'mot';
      const b = document.createElement('span');
      b.className = 'mot-dedans';
      b.dataset.rang = i;
      while (s.firstChild) b.append(s.firstChild);
      a.append(b);
      el.append(a, ' ');
    });
  } else {
    const lignes = [];
    let haut = null;
    for (const s of mots) {
      const t = s.offsetTop;
      if (haut === null || Math.abs(t - haut) > 2) {
        lignes.push([]);
        haut = t;
      }
      lignes[lignes.length - 1].push(s);
    }
    el.textContent = '';
    lignes.forEach((ligne, i) => {
      const a = document.createElement('span');
      a.className = 'ligne';
      const b = document.createElement('span');
      b.className = 'ligne-dedans';
      b.dataset.rang = i;
      ligne.forEach((s, k) => {
        if (k) b.append(' ');
        while (s.firstChild) b.append(s.firstChild);
      });
      a.append(b);
      el.append(a);
    });
  }
  el.classList.add('decoupe');
}

function recoudre(el) {
  if (!el.classList.contains('decoupe')) return;
  el.innerHTML = origines.get(el);
  origines.delete(el);
  el.classList.remove('decoupe');
}

function jouerDecoupe(el, retard) {
  const pas = nombre(el.dataset.decalage, nombre(jeton('--mouvement-decalage'), 0.08)) * 1000 * vitesse();
  const morceaux = el.querySelectorAll('.ligne-dedans, .mot-dedans');
  const animations = [...morceaux].map((m, i) => m.animate(
    [{ transform: 'translateY(110%)' }, { transform: 'none' }],
    {
      duration: duree('--duree-longue', 950),
      easing: courbe('--courbe-douce', 'ease-out'),
      delay: retard + i * pas,
      fill: 'backwards',
    },
  ));
  Promise.all(animations.map((a) => a.finished)).then(() => recoudre(el), () => recoudre(el));
  return animations;
}

// ---- révélation ----

const enCours = new Set();

function reveler(el, rang) {
  if (el.classList.contains('vu')) return;
  const retard = rang * 90 * vitesse();
  let animations;
  if (el.hasAttribute('data-decoupe')) {
    decouper(el);
    el.classList.add('vu');
    animations = jouerDecoupe(el, retard);
  } else if (el.hasAttribute('data-decalage')) {
    const pas = nombre(el.dataset.decalage, 0.08) * 1000 * vitesse();
    const nom = el.dataset.apparition || 'monte';
    el.classList.add('vu');
    animations = [...el.children].flatMap((enfant, i) => jouer(enfant, nom, retard + i * pas));
  } else {
    el.classList.add('vu');
    animations = jouer(el, el.dataset.apparition, retard);
  }
  for (const a of animations) {
    enCours.add(a);
    a.finished.then(() => enCours.delete(a), () => enCours.delete(a));
  }
}

function toutMontrer() {
  for (const a of enCours) a.finish();
  enCours.clear();
  for (const el of document.querySelectorAll('[data-decoupe]')) recoudre(el);
  for (const el of document.querySelectorAll('[data-apparition], [data-decoupe], [data-decalage]')) {
    el.classList.add('vu');
  }
  racine.classList.remove('js-mouvement');
  if (avecGsap) ScrollTrigger.getAll().forEach((t) => t.kill(true));
}

function observerApparitions() {
  const cibles = [...document.querySelectorAll('[data-apparition], [data-decoupe], [data-decalage]')]
    // un enfant direct d'un conteneur à décalage est joué par son parent
    .filter((el) => !el.parentElement.matches('[data-decalage]:not([data-decoupe])'));

  const observateur = new IntersectionObserver((entrees) => {
    let rang = 0;
    for (const e of entrees) {
      if (!e.isIntersecting) continue;
      observateur.unobserve(e.target);
      reveler(e.target, rang++);
    }
  }, { rootMargin: '0px 0px -8% 0px' });

  // titres pas encore vus : on les découpe à nouveau quand la largeur change
  let minuterie;
  addEventListener('resize', () => {
    clearTimeout(minuterie);
    minuterie = setTimeout(() => {
      for (const el of document.querySelectorAll('[data-decoupe].decoupe:not(.vu)')) {
        recoudre(el);
        decouper(el);
      }
    }, 150);
  });

  for (const el of cibles) observateur.observe(el);
}

// ---- parallaxe ----

function parallaxes() {
  const elements = [...document.querySelectorAll('[data-parallaxe]')];
  if (!elements.length) return;

  if (avecGsap) {
    for (const el of elements) {
      const f = nombre(el.dataset.parallaxe, 0.1);
      gsap.fromTo(el, { y: () => f * innerHeight * 0.5 }, {
        y: () => f * innerHeight * -0.5,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
      });
    }
    return;
  }

  if (CSS.supports('animation-timeline: view()')) {
    for (const el of elements) {
      el.style.setProperty('--parallaxe', nombre(el.dataset.parallaxe, 0.1));
      el.classList.add('parallaxe-css');
    }
    return;
  }

  // repli : calcul au défilement, limité aux éléments visibles
  const visibles = new Set();
  const suivi = new IntersectionObserver((entrees) => {
    for (const e of entrees) (e.isIntersecting ? visibles.add(e.target) : visibles.delete(e.target));
    planifier();
  });
  let demande = false;
  const calculer = () => {
    demande = false;
    const h = innerHeight;
    for (const el of visibles) {
      const r = el.getBoundingClientRect();
      const avance = (h - r.top) / (h + r.height);
      el.style.translate = `0 ${(nombre(el.dataset.parallaxe, 0.1) * (0.5 - avance) * h).toFixed(1)}px`;
    }
  };
  function planifier() {
    if (!demande) {
      demande = true;
      requestAnimationFrame(calculer);
    }
  }
  addEventListener('scroll', planifier, { passive: true });
  addEventListener('resize', planifier);
  for (const el of elements) suivi.observe(el);
}

// ---- épinglage (GSAP ScrollTrigger seulement) ----

function epingles() {
  if (!avecGsap) return;
  for (const el of document.querySelectorAll('[data-epingle]')) {
    ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: `+=${el.dataset.epingle || '100%'}`,
      pin: true,
      pinSpacing: true,
    });
  }
}

// ---- boutons magnétiques ----

function magnetiques() {
  if (!pointeurFin.matches) return;
  for (const el of document.querySelectorAll('[data-magnetique]')) {
    const force = nombre(el.dataset.magnetique, 0.3);
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * force;
      const y = (e.clientY - (r.top + r.height / 2)) * force;
      el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.translate = '';
    });
  }
}

// ---- démarrage : on attend la police (les lignes se mesurent avec elle), 700 ms au plus ----

function demarrer() {
  try {
    if (avecGsap) gsap.registerPlugin(ScrollTrigger);
    observerApparitions();
    parallaxes();
    epingles();
    magnetiques();
    racine.classList.add('mouvement-pret');
  } catch {
    // au moindre accroc, on montre tout plutôt que de laisser une page à moitié masquée
    toutMontrer();
  }
}

if (racine.classList.contains('js-mouvement') && !moinsDeMouvement.matches) {
  const police = document.fonts ? document.fonts.ready : Promise.resolve();
  const garde = new Promise((ok) => setTimeout(ok, 700));
  Promise.race([police, garde]).then(() => requestAnimationFrame(demarrer));
  moinsDeMouvement.addEventListener('change', (e) => {
    if (e.matches) toutMontrer();
  });
} else {
  racine.classList.remove('js-mouvement');
}
