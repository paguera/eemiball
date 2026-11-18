// =====================================================================
//  SCORES & CLASSEMENT PAR NIVEAU
//  Enregistre les scores dans la base SQLite (/api/scores?niveau=N) avec
//  repli automatique sur localStorage si l'API n'est pas joignable.
// =====================================================================

const CLE_LOCALE = 'eemiball-classement';
const CLE_NOM = 'eemiball-nom';
const LIMITE_CLASSEMENT = 5;

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

function ecrireLocalParNiveau(niveau, listeNiveau) {
  try {
    const num = Number(niveau) || 1;
    const autres = lireLocal().filter((e) => (Number(e.niveau) || 1) !== num);
    const fusion = [...autres, ...listeNiveau.slice(0, LIMITE_CLASSEMENT)];
    localStorage.setItem(CLE_LOCALE, JSON.stringify(fusion));
  } catch { /* rien */ }
}

function trierEtLimiterParNiveau(liste, niveau) {
  const num = Number(niveau) || 1;
  return liste
    .filter((e) => (Number(e.niveau) || 1) === num)
    .sort((a, b) => (b.score - a.score) || (a.temps - b.temps))
    .slice(0, LIMITE_CLASSEMENT);
}

export async function chargerClassement(niveau = 1) {
  const num = Number(niveau) || 1;
  try {
    const res = await fetch(`/api/scores?niveau=${encodeURIComponent(num)}`, { cache: 'no-store' });
    if (res.ok) {
      const donnees = await res.json();
      if (Array.isArray(donnees)) {
        const top = donnees.slice(0, LIMITE_CLASSEMENT).map((e) => ({ ...e, niveau: Number(e.niveau) || num }));
        ecrireLocalParNiveau(num, top);
        return top;
      }
    }
  } catch { /* repli sur localStorage */ }
  return trierEtLimiterParNiveau(lireLocal(), num);
}

export async function envoyerScore(entree) {
  const num = Number(entree.niveau) || 1;
  const propre = {
    nom: (entree.nom || '').trim() || 'Anonyme',
    score: entree.score,
    temps: Number(entree.temps.toFixed(2)),
    difficulte: entree.difficulte || 'normal',
    niveau: num,
    chutes: entree.chutes || 0,
  };

  // Sauvegarde locale immédiate en secours
  const local = trierEtLimiterParNiveau([...lireLocal(), propre], num);
  ecrireLocalParNiveau(num, local);

  try {
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(propre),
    });
    if (res.ok) {
      const donnees = await res.json();
      if (Array.isArray(donnees)) {
        const top = donnees.slice(0, LIMITE_CLASSEMENT).map((e) => ({ ...e, niveau: Number(e.niveau) || num }));
        ecrireLocalParNiveau(num, top);
        return top;
      }
    }
  } catch { /* repli sur localStorage */ }
  return local;
}
