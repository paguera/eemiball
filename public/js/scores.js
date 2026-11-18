// =====================================================================
//  SCORES & CLASSEMENT
//  Enregistre les scores dans la base SQLite (/api/scores) avec
//  repli automatique sur localStorage si l'API n'est pas joignable.
// =====================================================================

const CLE_LOCALE = 'eemiball-classement';
const CLE_NOM = 'eemiball-nom';

const MULT_DIFFICULTE = {
  facile: 1.0,
  normal: 1.25,
  difficile: 1.6,
};

/**
 * Calcule un score en points à partir du chronomètre (temps en secondes),
 * de la difficulté choisie et du nombre de chutes.
 * Plus le temps est court, plus le score est élevé.
 */
export function calculerScore(temps, difficulte = 'normal', chutes = 0) {
  const mult = MULT_DIFFICULTE[difficulte] || 1.25;
  const base = (12000 / (Math.max(1, temps) + 6)) * mult;
  const penalite = chutes * 40;
  return Math.max(50, Math.round(base - penalite));
}

export function lireNomSauvegarde() {
  try { return localStorage.getItem(CLE_NOM) || ''; } catch { return ''; }
}

export function sauvegarderNom(nom) {
  try { localStorage.setItem(CLE_NOM, (nom || '').trim()); } catch { /* rien */ }
}

function lireLocal() {
  try { return JSON.parse(localStorage.getItem(CLE_LOCALE)) || []; } catch { return []; }
}

function ecrireLocal(liste) {
  try { localStorage.setItem(CLE_LOCALE, JSON.stringify(liste.slice(0, 10))); } catch { /* rien */ }
}

function trierEtLimiter(liste) {
  return [...liste]
    .sort((a, b) => (b.score - a.score) || (a.temps - b.temps))
    .slice(0, 10);
}

export async function chargerClassement() {
  try {
    const res = await fetch('/api/scores', { cache: 'no-store' });
    if (res.ok) {
      const donnees = await res.json();
      if (Array.isArray(donnees)) {
        ecrireLocal(donnees);
        return donnees;
      }
    }
  } catch { /* repli sur localStorage */ }
  return trierEtLimiter(lireLocal());
}

export async function envoyerScore(entree) {
  const propre = {
    nom: (entree.nom || '').trim() || 'Anonyme',
    score: entree.score,
    temps: Number(entree.temps.toFixed(2)),
    difficulte: entree.difficulte || 'normal',
    chutes: entree.chutes || 0,
  };

  // Sauvegarde locale immédiate en secours
  const local = trierEtLimiter([...lireLocal(), propre]);
  ecrireLocal(local);

  try {
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(propre),
    });
    if (res.ok) {
      const donnees = await res.json();
      if (Array.isArray(donnees)) {
        ecrireLocal(donnees);
        return donnees;
      }
    }
  } catch { /* repli sur localStorage */ }
  return local;
}
