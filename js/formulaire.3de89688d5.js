// Formulaires : amélioration progressive.
// Sans JS, le formulaire part normalement (une seule page, étapes l'une sous l'autre) et le PHP renvoie sur /merci
// ou sur la page avec #envoi-erreur. Avec JS : étapes affichées une à une, erreurs sous chaque champ ou groupe de choix,
// photos compressées dans le navigateur, envoi sans rechargement, message lu par les lecteurs d'écran.
// Les textes affichés viennent du HTML (attributs data-* et blocs data-message), jamais d'ici.

const MAX_PHOTOS = 3;
const MAX_PHOTO = 8 * 1024 * 1024;
const MAX_TOTAL = 12 * 1024 * 1024;
const COTE_MAX = 1920;

const simple = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'\s-]+/g, ' ').trim().toLowerCase();

for (const formulaire of document.querySelectorAll('form[data-formulaire]')) {
  const horodatage = formulaire.querySelector('input[name="t"]');
  const envoi = formulaire.querySelector('[type="submit"]');
  const racine = formulaire.parentElement;
  const messages = racine.querySelectorAll('[data-message]');
  const libelleEnvoi = envoi.textContent;

  // le délai minimal se mesure depuis l'ouverture de la page
  if (horodatage) horodatage.value = String(Date.now());
  formulaire.noValidate = true;

  const suite = new URLSearchParams(location.search).get('suite');
  const champSuite = formulaire.querySelector('input[name="suite"]');
  if (champSuite && suite && /^[a-z-]{1,40}$/.test(suite)) champSuite.value = suite;

  const message = (nom) => {
    for (const m of messages) m.toggleAttribute('data-visible', m.dataset.message === nom);
    const actif = [...messages].find((m) => m.dataset.message === nom);
    if (actif) actif.focus();
  };

  // communes connues pour être hors de la zone : refus avant l'envoi
  const horsZone = new Set();
  const modeleHorsZone = racine.querySelector('[data-communes-hors-zone]');
  if (modeleHorsZone) for (const o of modeleHorsZone.content.querySelectorAll('option')) horsZone.add(simple(o.value));

  // une unité de contrôle : un champ, ou un groupe de choix (boutons radio du même nom)
  const unites = (portee) => {
    const vues = new Set();
    const liste = [];
    for (const c of portee.querySelectorAll('input, select, textarea')) {
      if (!c.name || c.type === 'hidden' || c.type === 'file' || c.type === 'submit' || c.type === 'button' || !c.willValidate) continue;
      if (c.type === 'radio') {
        if (vues.has(c.name)) continue;
        vues.add(c.name);
        const radios = [...formulaire.querySelectorAll(`input[type="radio"][name="${c.name}"]`)];
        const groupe = c.closest('fieldset');
        liste.push({
          groupe: true,
          champ: radios[0],
          zone: groupe,
          nom: c.name,
          valide: () => !radios.some((r) => r.required) || radios.some((r) => r.checked),
          texte: () => radios.find((r) => r.dataset.erreur)?.dataset.erreur || formulaire.dataset.erreurChoix || '',
        });
      } else if (c.id) {
        liste.push({
          groupe: false,
          champ: c,
          nom: c.name,
          valide: () => c.checkValidity() && !(c.name === 'commune' && horsZone.has(simple(c.value))),
          texte: () => (c.name === 'commune' && horsZone.has(simple(c.value)) ? formulaire.dataset.horsZone : c.dataset.erreur || c.validationMessage),
        });
      }
    }
    return liste;
  };

  const zoneErreur = (u) => {
    const base = u.groupe ? (u.zone.id ||= `choix-${u.nom}`) : u.champ.id;
    const id = `${base}-erreur`;
    let zone = document.getElementById(id);
    if (!zone) {
      zone = document.createElement('p');
      zone.className = 'champ-erreur';
      zone.id = id;
      if (u.groupe) {
        const legende = u.zone.querySelector(':scope > legend');
        (legende || u.zone).after(zone);
      } else {
        u.champ.after(zone);
      }
      const cible = u.groupe ? u.zone : u.champ;
      const decrit = cible.getAttribute('aria-describedby');
      cible.setAttribute('aria-describedby', decrit ? `${decrit} ${id}` : id);
    }
    return zone;
  };

  const signaler = (u, texte) => {
    u.champ.setAttribute('aria-invalid', 'true');
    zoneErreur(u).textContent = texte || u.texte();
  };

  const effacer = (u) => {
    u.champ.removeAttribute('aria-invalid');
    const base = u.groupe ? u.zone.id : u.champ.id;
    const zone = base && document.getElementById(`${base}-erreur`);
    if (zone) zone.textContent = '';
  };

  // l'erreur disparaît dès que le champ ou le groupe redevient valable
  const surSaisie = (e) => {
    const u = unites(formulaire).find((x) => (x.groupe ? x.nom === e.target.name : x.champ === e.target));
    if (u && u.champ.getAttribute('aria-invalid') === 'true' && u.valide()) effacer(u);
  };
  formulaire.addEventListener('input', surSaisie);
  formulaire.addEventListener('change', surSaisie);

  // ---- étapes affichées une à une ----
  const etapes = formulaire.hasAttribute('data-etapes') ? [...formulaire.querySelectorAll(':scope > fieldset.devis-etape')] : [];
  const modeleEtapes = racine.querySelector('[data-etapes-modele]');
  const blocEnvoi = formulaire.querySelector('.devis-envoi');
  const plan = [...document.querySelectorAll('.devis-plan a')];
  let courante = 0;

  const aller = (n, avecFocus = true) => {
    courante = n;
    etapes.forEach((e, i) => {
      e.hidden = i !== n;
    });
    if (blocEnvoi) blocEnvoi.hidden = n !== etapes.length - 1;
    plan.forEach((a, i) => (i === n ? a.setAttribute('aria-current', 'step') : a.removeAttribute('aria-current')));
    history.replaceState(null, '', `#etape-${n + 1}`);
    if (avecFocus) {
      const legende = etapes[n].querySelector(':scope > legend');
      legende.focus();
      legende.scrollIntoView({ block: 'start' });
    }
  };

  const valider = (portee) => {
    const liste = unites(portee);
    liste.forEach(effacer);
    const fautives = liste.filter((u) => !u.valide());
    fautives.forEach((u) => signaler(u));
    if (fautives.length) fautives[0].champ.focus();
    return !fautives.length;
  };

  if (etapes.length > 1 && modeleEtapes) {
    formulaire.classList.add('devis-pas-a-pas');
    etapes.forEach((e, i) => {
      e.querySelector(':scope > legend').tabIndex = -1;
      const nav = modeleEtapes.content.cloneNode(true);
      const revenir = nav.querySelector('[data-revenir]');
      const continuer = nav.querySelector('[data-continuer]');
      if (i === 0) revenir.remove();
      if (i === etapes.length - 1) continuer.remove();
      revenir.addEventListener('click', () => aller(i - 1));
      continuer.addEventListener('click', () => {
        if (valider(e)) aller(i + 1);
      });
      e.append(nav);
    });
    plan.forEach((a, i) => {
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        if (i < courante) aller(i);
      });
    });
    aller(0, false);
  }

  // ---- photos : facultatives, compressées avant l'envoi ----
  const place = formulaire.querySelector('[data-photos-place]');
  const modelePhotos = racine.querySelector('[data-photos-modele]');
  if (place && modelePhotos) {
    place.append(modelePhotos.content.cloneNode(true));
    const champ = place.querySelector('input[type="file"]');
    const liste = place.querySelector('[data-photos-liste]');
    const erreur = document.createElement('p');
    erreur.className = 'champ-erreur';
    erreur.id = 'f-photos-erreur';
    erreur.setAttribute('role', 'alert');
    place.append(erreur);
    let photos = [];

    const poids = (o) => (o >= 1048576 ? `${(o / 1048576).toFixed(1).replace('.', ',')} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`);

    const rafraichir = () => {
      const lot = new DataTransfer();
      photos.forEach((p) => lot.items.add(p));
      champ.files = lot.files;
      liste.replaceChildren(
        ...photos.map((p, i) => {
          const li = document.createElement('li');
          const nom = document.createElement('span');
          nom.textContent = `${p.name} (${poids(p.size)})`;
          const retirer = document.createElement('button');
          retirer.type = 'button';
          retirer.className = 'devis-photos-retirer';
          retirer.textContent = champ.dataset.retirer;
          retirer.setAttribute('aria-label', `${champ.dataset.retirer} : ${p.name}`);
          retirer.addEventListener('click', () => {
            photos.splice(i, 1);
            erreur.textContent = '';
            rafraichir();
            champ.focus();
          });
          li.append(nom, retirer);
          return li;
        }),
      );
    };

    const compresser = async (fichier, rang) => {
      try {
        const image = await createImageBitmap(fichier, { imageOrientation: 'from-image' });
        const echelle = Math.min(1, COTE_MAX / Math.max(image.width, image.height));
        const toile = document.createElement('canvas');
        toile.width = Math.round(image.width * echelle);
        toile.height = Math.round(image.height * echelle);
        toile.getContext('2d').drawImage(image, 0, 0, toile.width, toile.height);
        image.close();
        const blob = await new Promise((ok) => toile.toBlob(ok, 'image/jpeg', 0.82));
        if (blob && blob.size < fichier.size) return new File([blob], `photo-${rang}.jpg`, { type: 'image/jpeg' });
      } catch {
        // format que le navigateur ne décode pas : le fichier d'origine part tel quel
      }
      return fichier;
    };

    champ.addEventListener('change', async () => {
      const choisis = [...champ.files];
      erreur.textContent = '';
      for (const f of choisis) {
        if (!f.type.startsWith('image/')) {
          erreur.textContent = champ.dataset.erreurType;
          continue;
        }
        if (photos.length >= MAX_PHOTOS) {
          erreur.textContent = champ.dataset.erreurNombre;
          break;
        }
        if (f.size > MAX_PHOTO) {
          erreur.textContent = champ.dataset.erreurPoids;
          continue;
        }
        const final = await compresser(f, photos.length + 1);
        if (photos.reduce((n, p) => n + p.size, final.size) > MAX_TOTAL) {
          erreur.textContent = champ.dataset.erreurTaille;
          continue;
        }
        photos.push(final);
      }
      rafraichir();
    });
  }

  // ---- envoi ----
  formulaire.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (etapes.length > 1 && courante < etapes.length - 1) {
      if (valider(etapes[courante])) aller(courante + 1);
      return;
    }
    const toutes = unites(formulaire);
    toutes.forEach(effacer);
    const fautives = toutes.filter((u) => !u.valide());
    if (fautives.length) {
      fautives.forEach((u) => signaler(u));
      if (etapes.length > 1) aller(etapes.indexOf(fautives[0].champ.closest('fieldset.devis-etape')), false);
      fautives[0].champ.focus();
      return;
    }

    envoi.disabled = true;
    envoi.setAttribute('aria-busy', 'true');
    if (formulaire.dataset.enCours) envoi.textContent = formulaire.dataset.enCours;
    let parti = false;
    try {
      const reponse = await fetch(formulaire.action, {
        method: 'POST',
        body: new FormData(formulaire),
        headers: { Accept: 'application/json' },
      });
      const corps = await reponse.json().catch(() => ({ ok: false }));
      if (reponse.ok && corps.ok) {
        parti = true;
        if (formulaire.dataset.merci) {
          location.href = formulaire.dataset.merci;
          return;
        }
        formulaire.reset();
        if (horodatage) horodatage.value = String(Date.now());
        message('ok');
      } else if (corps.champ && formulaire.elements[corps.champ]) {
        const brut = formulaire.elements[corps.champ];
        const champ = brut instanceof RadioNodeList ? brut[0] : brut;
        const u = unites(formulaire).find((x) => x.champ === champ || x.nom === corps.champ);
        if (u) {
          if (etapes.length > 1) aller(etapes.indexOf(u.champ.closest('fieldset.devis-etape')), false);
          signaler(u);
          u.champ.focus();
        } else {
          message('erreur');
        }
      } else {
        message(reponse.status === 429 ? 'limite' : 'erreur');
      }
    } catch {
      message('erreur');
    } finally {
      if (!parti) {
        envoi.disabled = false;
        envoi.removeAttribute('aria-busy');
        envoi.textContent = libelleEnvoi;
      }
    }
  });
}
