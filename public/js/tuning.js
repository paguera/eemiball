// =====================================================================
//  RÉGLAGES EN DIRECT
//  Chaque ligne du tableau devient un curseur dans le panneau ⚙.
//  Pour ajouter un réglage : ajoute une ligne ici, puis utilise
//  params.<cle> dans le code.
// =====================================================================

export const REGLAGES = [
  { cle: 'sensibilite',        nom: 'Sensibilité',                       min: 0.3, max: 3,   pas: 0.05, defaut: 1 },
  { cle: 'inclinaisonTel',     nom: 'Inclinaison du téléphone max (°)',  min: 5,   max: 45,  pas: 1,    defaut: 20 },
  { cle: 'inclinaisonJeu',     nom: 'Pente du plateau max (°)',          min: 5,   max: 40,  pas: 1,    defaut: 24 },
  { cle: 'gravite',            nom: 'Gravité',                           min: 5,   max: 50,  pas: 1,    defaut: 25 },
  { cle: 'frottement',         nom: 'Adhérence au sol',                  min: 0,   max: 1.5, pas: 0.05, defaut: 0.4 },
  { cle: 'rebond',             nom: 'Rebond',                            min: 0,   max: 0.9, pas: 0.05, defaut: 0.15 },
  { cle: 'vitesseMax',         nom: 'Vitesse max',                       min: 4,   max: 30,  pas: 0.5,  defaut: 14 },
  { cle: 'amorti',             nom: "Résistance de l'air",               min: 0,   max: 0.6, pas: 0.01, defaut: 0.05 },
  { cle: 'cameraRotation',     nom: 'Rotation auto de la caméra',        min: 0,   max: 4,   pas: 0.1,  defaut: 1.2 },
  { cle: 'inclinaisonVisuelle', nom: 'Inclinaison visuelle de la caméra', min: 0,  max: 1,   pas: 0.05, defaut: 0.5 },
  { cle: 'inverserAvant',      nom: 'Inverser avant / arrière',  type: 'case', defaut: false },
  { cle: 'inverserCote',       nom: 'Inverser gauche / droite',  type: 'case', defaut: false },
];

export const DIFFICULTES = {
  facile: {
    frottement: 1.2,
    inclinaisonJeu: 19,
    gravite: 16,
    vitesseMax: 9.5,
    amorti: 0.14,
    rebond: 0.05,
    sensibilite: 0.75,
  },
  normal: {
    frottement: 0.4,
    inclinaisonJeu: 24,
    gravite: 25,
    vitesseMax: 14,
    amorti: 0.05,
    rebond: 0.15,
    sensibilite: 1,
  },
  difficile: {
    frottement: 0.05,
    inclinaisonJeu: 38,
    gravite: 42,
    vitesseMax: 26,
    amorti: 0,
    rebond: 0.65,
    sensibilite: 1.5,
  },
};

const CLE_STOCKAGE = 'eemiball-reglages';

function lireStockage() {
  try { return JSON.parse(localStorage.getItem(CLE_STOCKAGE)) || {}; } catch { return {}; }
}
function ecrireStockage(params) {
  try { localStorage.setItem(CLE_STOCKAGE, JSON.stringify(params)); } catch { /* stockage indisponible : pas grave */ }
}

/**
 * Construit le panneau de curseurs et renvoie l'objet `params` (toujours à jour).
 * onChange() est appelé à chaque modification.
 */
export function createTuning(conteneur, onChange) {
  const sauves = lireStockage();
  const params = {};
  for (const r of REGLAGES) params[r.cle] = (r.cle in sauves) ? sauves[r.cle] : r.defaut;

  const champs = {};

  for (const r of REGLAGES) {
    const div = document.createElement('div');
    div.className = 'reglage' + (r.type === 'case' ? ' case' : '');
    const label = document.createElement('label');
    const input = document.createElement('input');

    if (r.type === 'case') {
      input.type = 'checkbox';
      input.checked = !!params[r.cle];
      input.addEventListener('change', () => { params[r.cle] = input.checked; ecrireStockage(params); onChange(); });
      label.append(input, document.createTextNode(r.nom));
    } else {
      input.type = 'range';
      input.min = r.min; input.max = r.max; input.step = r.pas; input.value = params[r.cle];
      const valeur = document.createElement('b');
      valeur.textContent = params[r.cle];
      label.append(document.createTextNode(r.nom), valeur);
      input.addEventListener('input', () => {
        params[r.cle] = parseFloat(input.value);
        valeur.textContent = input.value;
        ecrireStockage(params);
        onChange();
      });
      champs[r.cle + '_valeur'] = valeur;
    }
    champs[r.cle] = input;
    div.append(label);
    if (r.type !== 'case') div.append(input);
    conteneur.append(div);
  }

  function appliquerValeurs(valeurs, notifier = true) {
    for (const r of REGLAGES) {
      if (!(r.cle in valeurs)) continue;
      params[r.cle] = valeurs[r.cle];
      if (r.type === 'case') champs[r.cle].checked = !!valeurs[r.cle];
      else { champs[r.cle].value = valeurs[r.cle]; champs[r.cle + '_valeur'].textContent = valeurs[r.cle]; }
    }
    ecrireStockage(params);
    if (notifier) onChange();
  }

  function reinitialiser() {
    const defauts = {};
    for (const r of REGLAGES) defauts[r.cle] = r.defaut;
    appliquerValeurs(defauts);
  }

  function appliquerDifficulte(niveau, notifier = true) {
    const preset = DIFFICULTES[niveau];
    if (preset) appliquerValeurs(preset, notifier);
  }

  function difficulteActuelle() {
    for (const [niveau, preset] of Object.entries(DIFFICULTES)) {
      const correspond = Object.entries(preset).every(([cle, val]) => Math.abs(params[cle] - val) < 1e-6);
      if (correspond) return niveau;
    }
    return null;
  }

  // Si d'anciens réglages en cache ne correspondent plus à aucun niveau, on migre vers le niveau correspondant
  if (!difficulteActuelle()) {
    if (params.frottement >= 0.7) appliquerDifficulte('facile', false);
    else if (params.frottement <= 0.2) appliquerDifficulte('difficile', false);
    else appliquerDifficulte('normal', false);
  }

  return { params, reinitialiser, appliquerDifficulte, difficulteActuelle };
}
