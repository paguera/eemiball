// =====================================================================
//  AUDIO : gestion des bruitages et du son de roulement (public/sons/)
// =====================================================================

const FICHIERS = {
  depart:   'sons/depart.mp3',
  victoire: 'sons/victoire.mp3',
  defaite:  'sons/defaite.mp3',
  chute:    'sons/chute.mp3',
  cafe:     'sons/cafe.mp3',
  redbull:  'sons/redbull.mp3',
  impact:   'sons/impact.mp3',
};

const borner = (v, min, max) => Math.max(min, Math.min(max, v));

export function createAudio() {
  const sons = {};
  for (const [nom, url] of Object.entries(FICHIERS)) {
    const a = new Audio(url);
    a.preload = 'auto';
    sons[nom] = a;
  }

  // Boucle continue pour le roulement de la boule
  const roulement = new Audio('sons/roulement80.mp3');
  roulement.loop = true;
  roulement.preload = 'auto';
  roulement.volume = 0;

  let muet = false;
  let debloque = false;
  let dernierImpact = 0;

  /**
   * Débloque l'audio lors du premier clic sur « Jouer » (requis sur iOS / Android).
   */
  function debloquer() {
    if (debloque) return;
    debloque = true;
    roulement.volume = 0;
    roulement.play().catch(() => {});
  }

  /**
   * Joue un bruitage ponctuel (clone le nœud si le son est déjà en lecture).
   */
  function jouer(nom, volume = 0.8) {
    if (muet) return;
    const base = sons[nom];
    if (!base) return;
    try {
      const s = base.paused ? base : base.cloneNode();
      s.volume = borner(volume, 0, 1);
      s.currentTime = 0;
      s.play().catch(() => {});
    } catch { /* navigateur bloquant l'autoplay */ }
  }

  /**
   * Joue le son d'impact proportionnellement à la force du choc.
   */
  function impact(vitesseNormale) {
    if (muet) return;
    const maintenant = performance.now();
    if (maintenant - dernierImpact < 120) return;
    const force = Math.abs(vitesseNormale);
    if (force < 2.2) return;
    dernierImpact = maintenant;
    const vol = borner((force - 2) / 12, 0.15, 0.9);
    jouer('impact', vol);
  }

  /**
   * Met à jour le son de roulement continu selon la vitesse de la boule.
   */
  function updateRoulement(dt, corps, enJeu, enChuteLibre = false) {
    if (muet || !enJeu || enChuteLibre) {
      roulement.volume = Math.max(0, roulement.volume - dt * 6);
      if (roulement.volume <= 0.01 && !roulement.paused) roulement.pause();
      return;
    }

    const v = corps.velocity;
    const vitesseH = Math.hypot(v.x, v.z);
    // Si la boule vole dans les airs (forte vitesse verticale), on coupe le roulement
    const auSol = Math.abs(v.y) < 3.2;
    const cibleVol = (auSol && vitesseH > 0.35)
      ? borner(vitesseH / 14, 0.05, 0.75)
      : 0;

    roulement.volume += (cibleVol - roulement.volume) * Math.min(1, dt * 10);
    roulement.playbackRate = borner(0.75 + (vitesseH / 18) * 0.65, 0.7, 1.5);

    if (roulement.volume > 0.02 && roulement.paused) {
      roulement.play().catch(() => {});
    } else if (roulement.volume <= 0.01 && !roulement.paused) {
      roulement.pause();
    }
  }

  function arreterTout() {
    roulement.volume = 0;
    if (!roulement.paused) roulement.pause();
  }

  function basculerMuet() {
    muet = !muet;
    if (muet) arreterTout();
    return muet;
  }

  return {
    debloquer,
    jouer,
    impact,
    updateRoulement,
    arreterTout,
    basculerMuet,
    get muet() { return muet; },
  };
}
