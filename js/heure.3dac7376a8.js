// Heure de Paris, lue une seule fois à l'ouverture de la page. Le prix affiché ne change jamais : « à partir de » le jour comme la nuit.
// Sans JS, l'encart garde sa phrase d'attente.

const encarts = document.querySelectorAll('[data-encart-heure]');

if (encarts.length) {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const lire = (type) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const h = lire('hour');
  const m = lire('minute');
  const minutes = h * 60 + m;
  const enMinutes = (texte, defaut) => {
    const [hh, mm] = String(texte || defaut).split(':').map(Number);
    return hh * 60 + (mm || 0);
  };
  const lisible = `${h} h ${String(m).padStart(2, '0')}`;

  for (const encart of encarts) {
    const debut = enMinutes(encart.dataset.nuitDebut, '21:00');
    const fin = enMinutes(encart.dataset.nuitFin, '06:00');
    const nuit = debut > fin ? minutes >= debut || minutes < fin : minutes >= debut && minutes < fin;
    const modele = encart.querySelector(nuit ? '[data-encart-nuit]' : '[data-encart-jour]');
    const ligne = encart.querySelector('[data-encart-ligne]');
    if (!modele || !ligne) continue;
    const phrase = modele.content.cloneNode(true);
    const heure = phrase.querySelector('[data-encart-h]');
    if (heure) heure.textContent = lisible;
    ligne.replaceChildren(phrase);
    encart.dataset.moment = nuit ? 'nuit' : 'jour';
  }
}
