// =====================================================================
//  AUDIO : gestion des bruitages et du son de roulement (public/sons/)
//
//  Les bruitages et le roulement passent par la Web Audio API : les sons
//  sont décodés une seule fois en mémoire, puis rejoués sans créer de
//  nouveau lecteur. Sur iPhone, l'ancienne méthode (un élément <audio>
//  cloné à chaque choc, volume et vitesse changés à chaque image)
//  ralentissait fortement le jeu.
//  Les musiques restent de simples éléments <audio> (une seule à la fois).
// =====================================================================

const FICHIERS = {
  depart:   'sons/depart.mp3',
  victoire: 'sons/victoire.mp3',
  defaite:  'sons/defaite.mp3',
  chute:    'sons/chute.mp3',
  redbull:  'sons/redbull.mp3',
  impact:   'sons/impact.mp3',
  roulement: 'sons/roulement80.mp3',
};

const MUSIQUES = {
  1: 'sons/musique-facile.mp3',
  2: 'sons/musique-normal-2.mp3',
  3: 'sons/musique-difficile.mp3',
};

const VOLUME_MUSIQUE = 0.35;

const borner = (v, min, max) => Math.max(min, Math.min(max, v));

export function createAudio() {
  const ContexteAudio = window.AudioContext || window.webkitAudioContext;
  let ctx = null;      // créé au premier clic (obligatoire sur iPhone)
  let sortie = null;   // volume général des bruitages (0 = muet)
  const tampons = {};  // sons décodés, prêts à jouer

  // On télécharge les fichiers tout de suite ; on les décode dès que l'audio est débloqué.
  const fichiers = {};
  for (const [nom, url] of Object.entries(FICHIERS)) {
    fichiers[nom] = fetch(url).then((r) => r.arrayBuffer()).catch(() => null);
  }
  function decoder(nom) {
    fichiers[nom].then((donnees) => {
      if (!donnees) return;
      // Forme « avec fonctions de rappel » : compatible avec les anciens Safari
      ctx.decodeAudioData(donnees, (tampon) => {
        tampons[nom] = tampon;
        if (nom === 'roulement') demarrerRoulement();
      }, () => {});
    });
  }

  const musiques = {};
  for (const [niveau, url] of Object.entries(MUSIQUES)) {
    const m = new Audio(url);
    m.loop = true;
    m.preload = 'none';
    m.volume = VOLUME_MUSIQUE;
    musiques[niveau] = m;
  }
  let musiqueActive = null;

  // Roulement : une boucle qui tourne en continu, on règle seulement son volume et sa vitesse
  let gainRoulement = null, sourceRoulement = null, volumeRoulement = 0;
  function demarrerRoulement() {
    gainRoulement = ctx.createGain();
    gainRoulement.gain.value = 0;
    gainRoulement.connect(sortie);
    sourceRoulement = ctx.createBufferSource();
    sourceRoulement.buffer = tampons.roulement;
    sourceRoulement.loop = true;
    sourceRoulement.connect(gainRoulement);
    sourceRoulement.start();
  }

  let muet = false;
  let dernierImpact = 0;

  /**
   * Débloque l'audio lors du premier clic sur « Jouer » (requis sur iOS / Android).
   */
  function debloquer() {
    if (!ContexteAudio) return;
    if (!ctx) {
      // iPhone : les sons du jeu jouent même si le bouton silencieux est activé
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* rien */ }
      ctx = new ContexteAudio();
      sortie = ctx.createGain();
      sortie.gain.value = muet ? 0 : 1;
      sortie.connect(ctx.destination);
      for (const nom of Object.keys(FICHIERS)) decoder(nom);
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
  }
  // Si le navigateur met l'audio en pause (appel, écran verrouillé…), on le relance au toucher suivant
  addEventListener('pointerdown', () => { if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); });

  /**
   * Joue un bruitage ponctuel.
   */
  function jouer(nom, volume = 0.8) {
    if (muet || !ctx || !tampons[nom]) return;
    const source = ctx.createBufferSource();
    source.buffer = tampons[nom];
    const gain = ctx.createGain();
    gain.gain.value = borner(volume, 0, 1);
    source.connect(gain);
    gain.connect(sortie);
    source.start();
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
    if (!gainRoulement) return;
    let cibleVol = 0;
    if (!muet && enJeu && !enChuteLibre) {
      const v = corps.velocity;
      const vitesseH = Math.hypot(v.x, v.z);
      // Si la boule vole dans les airs (forte vitesse verticale), on coupe le roulement
      const auSol = Math.abs(v.y) < 3.2;
      cibleVol = (auSol && vitesseH > 0.35) ? borner(vitesseH / 14, 0.05, 0.75) : 0;
      sourceRoulement.playbackRate.value = borner(0.75 + (vitesseH / 18) * 0.65, 0.7, 1.5);
    }
    const vitesse = cibleVol > volumeRoulement ? 10 : 6;
    volumeRoulement += (cibleVol - volumeRoulement) * Math.min(1, dt * vitesse);
    gainRoulement.gain.value = volumeRoulement < 0.01 ? 0 : volumeRoulement;
  }

  /**
   * Lance la musique d'ambiance correspondant au numéro du niveau (1, 2 ou 3).
   */
  function lancerMusique(numeroNiveau = 1) {
    const cle = (numeroNiveau in musiques) ? numeroNiveau : 1;
    const cible = musiques[cle];
    if (musiqueActive && musiqueActive !== cible && !musiqueActive.paused) {
      musiqueActive.pause();
    }
    musiqueActive = cible;
    musiqueActive.currentTime = 0;
    musiqueActive.volume = VOLUME_MUSIQUE;
    if (!muet) {
      musiqueActive.play().catch(() => {});
    }
  }

  function arreterTout() {
    volumeRoulement = 0;
    if (gainRoulement) gainRoulement.gain.value = 0;
    if (musiqueActive) {
      if (!musiqueActive.paused) musiqueActive.pause();
      musiqueActive.currentTime = 0;
      musiqueActive = null;
    }
  }

  function basculerMuet() {
    muet = !muet;
    if (sortie) sortie.gain.value = muet ? 0 : 1;
    if (muet) {
      if (musiqueActive && !musiqueActive.paused) musiqueActive.pause();
    } else if (musiqueActive && musiqueActive.paused) {
      musiqueActive.play().catch(() => {});
    }
    return muet;
  }

  return {
    debloquer,
    jouer,
    lancerMusique,
    impact,
    updateRoulement,
    arreterTout,
    basculerMuet,
    get muet() { return muet; },
  };
}
