// =====================================================================
//  PERSONNAGES : liste des personnages jouables + menu de choix
//  Pour ajouter un personnage :
//   1. mets son image détourée (PNG ~256 px de large) dans public/assets/
//   2. ajoute une ligne dans PERSONNAGES
// =====================================================================

export const PERSONNAGES = [
  { id: 'celia',    nom: 'Célia',    image: 'assets/perso-celia.avif' },
  { id: 'emile',    nom: 'Émile',    image: 'assets/perso-emile.avif' },
  { id: 'gabriel',  nom: 'Gabriel',  image: 'assets/perso-gabriel.avif' },
  { id: 'matheo',   nom: 'Mathéo',   image: 'assets/perso-matheo.avif' },
  { id: 'theo',     nom: 'Théo',     image: 'assets/perso-theo.avif' },
  { id: 'thibault', nom: 'Thibault', image: 'assets/perso-thibault.avif' },
];

const PAR_DEFAUT = 'thibault';
const CLE_STOCKAGE = 'eemiball-perso';

export function trouverPerso(id) {
  return PERSONNAGES.find((p) => p.id === id) || PERSONNAGES.find((p) => p.id === PAR_DEFAUT);
}

function lireChoix() {
  try { return trouverPerso(localStorage.getItem(CLE_STOCKAGE)); } catch { return trouverPerso(PAR_DEFAUT); }
}
function ecrireChoix(id) {
  try { localStorage.setItem(CLE_STOCKAGE, id); } catch { /* stockage indisponible : pas grave */ }
}

/**
 * Construit le menu : un bouton sur l'écran titre ouvre un écran avec
 * une carte par personnage. onChoix(perso) est appelé à chaque choix.
 */
export function createMenuPersonnages({ ecranTitre, ecranPerso, grille, bouton, miniature, nomAffiche, valider, onChoix }) {
  let actuel = lireChoix();
  const cartes = new Map();

  for (const p of PERSONNAGES) {
    const carte = document.createElement('button');
    carte.type = 'button';
    carte.className = 'carte-perso';
    carte.setAttribute('role', 'radio');
    carte.innerHTML = `<span class="carte-photo"><img src="${p.image}" alt="" loading="lazy"></span><span class="carte-nom">${p.nom}</span>`;
    carte.addEventListener('click', () => choisir(p));
    carte.addEventListener('dblclick', fermer);
    grille.append(carte);
    cartes.set(p.id, carte);
  }

  function majAffichage() {
    for (const [id, carte] of cartes) {
      const ok = id === actuel.id;
      carte.classList.toggle('actif', ok);
      carte.setAttribute('aria-checked', String(ok));
    }
    miniature.src = actuel.image;
    nomAffiche.textContent = actuel.nom;
  }

  function choisir(p) {
    actuel = p;
    ecrireChoix(p.id);
    majAffichage();
    onChoix(p);
  }

  function ouvrir() {
    ecranTitre.classList.add('cache');
    ecranPerso.classList.remove('cache');
    cartes.get(actuel.id)?.focus();
  }
  function fermer() {
    ecranPerso.classList.add('cache');
    ecranTitre.classList.remove('cache');
  }

  bouton.addEventListener('click', ouvrir);
  valider.addEventListener('click', fermer);
  majAffichage();

  return {
    get actuel() { return actuel; },
    get ouvert() { return !ecranPerso.classList.contains('cache'); },
    fermer,
  };
}
