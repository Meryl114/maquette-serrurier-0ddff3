// « Votre commune » : oui ou non d'après les listes de client.json.
// Le champ n'existe qu'avec JS (posé depuis son modèle) : sans JS, la phrase au-dessus nomme déjà les communes.

const bloc = document.querySelector('[data-communes]');
const modele = bloc && bloc.querySelector('[data-communes-modele]');

if (bloc && modele) {
  bloc.append(modele.content.cloneNode(true));
  const champ = bloc.querySelector('input');
  const reponse = bloc.querySelector('[data-communes-reponse]');
  const liste = document.getElementById(champ.getAttribute('list'));
  const simple = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’'\s-]+/g, ' ').trim().toLowerCase();

  const communes = new Map();
  for (const o of liste.options) communes.set(simple(o.value), { nom: o.value, oui: true });
  // hors zone : connues pour répondre non, jamais proposées dans la liste
  const horsZone = bloc.querySelector('[data-communes-hors-zone]');
  if (horsZone) for (const o of horsZone.content.querySelectorAll('option')) communes.set(simple(o.value), { nom: o.value, oui: false });

  const repondre = (definitif) => {
    const saisi = simple(champ.value);
    const trouvee = communes.get(saisi);
    if (!saisi) {
      reponse.textContent = '';
      delete reponse.dataset.etat;
      return;
    }
    if (trouvee) {
      reponse.textContent = trouvee.oui ? `${bloc.dataset.oui} ${trouvee.nom}.` : bloc.dataset.non;
      reponse.dataset.etat = trouvee.oui ? 'oui' : 'non';
    } else if (definitif) {
      reponse.textContent = bloc.dataset.inconnue;
      reponse.dataset.etat = 'inconnue';
    }
  };

  champ.addEventListener('input', () => repondre(false));
  champ.addEventListener('change', () => repondre(true));
  champ.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      repondre(true);
    }
  });
}
