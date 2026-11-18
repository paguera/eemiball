// =====================================================================
//  LE GÉANT : BOSS TV, un personnage 2D (image PNG détourée)
//  C'est une image plate qui tourne seulement autour de l'axe vertical
//  pour faire face à la caméra : elle ne penche pas quand la caméra penche.
//  Il se tient dans la ville en contrebas, comme King Kong, et suit
//  le joueur en marchant à sa gauche. À chaque début de niveau, il arrive
//  du fond du niveau en déambulant.
//  Son écran de télé affiche des messages qui changent (voir MESSAGES).
// =====================================================================
import * as THREE from 'three';

const HAUTEUR = 70;        // taille en mètres (la boule fait 1 m)
const Y_SOL = -60;         // le sol de la ville (voir level.js)
const MOUVEMENT_REDUIT = matchMedia('(prefers-reduced-motion: reduce)');
const RAPPORT = 320 / 507; // largeur / hauteur de l'image (BOSS TV 2)
// Position de l'écran noir dans l'image (fractions : gauche, haut, droite, bas)
const ECRAN = { gauche: 0.344, haut: 0.021, droite: 0.738, bas: 0.215 };
const DUREE_MESSAGE = 3.5; // secondes par message

// Messages de la télé. Chaque ligne reçoit l'état du jeu et renvoie 1 à 3 lignes de texte.
// Pour en ajouter un : ajoute une ligne ici.
const NOMS_DIFFICULTE = { facile: 'FACILE', normal: 'NORMAL', difficile: 'DIFFICILE' };
const MESSAGES = [
  (j) => ['NIVEAU 1', NOMS_DIFFICULTE[j.difficulte] || 'NORMAL'],
  () => ['RACHÈTE', 'DES TOKENS !'],
  (j) => (j.etat === 'jeu' ? ['TON TEMPS', `${j.temps.toFixed(1)} s`] : ['PRÊT ?', 'APPUIE SUR', 'JOUER']),
  () => ['COURS À 9H', 'DÉPÊCHE-TOI !'],
  () => ['404', 'MOTIVATION', 'NOT FOUND'],
  (j) => (j.chutes > 0 ? ['ENCORE', `TOMBÉ ×${j.chutes}`] : ['NE TOMBE', 'PAS !']),
  () => ['git push', '--force ?'],
  () => ['CANETTE', '= BOOST ×1.6'],
  () => ['FOURVIÈRE', 'TE REGARDE'],
  () => ['BUFFERING', '▓▓▓▓▓░░░ 62%'],
  () => ['BONJOUR', 'LYON !'],
  () => ['TOKENS', 'ÉPUISÉS', 'PASSE PRO'],
];
const VITESSE_SUIVI = 0.35;

// --- Arrivée en début de niveau ---
const DISTANCE_DEPART = 120; // il apparaît au fond du niveau, dans la brume…
const VITESSE_ARRIVEE = 7;   // …et arrive à cette vitesse (m/s), environ 15 s
const ZIGZAG = 0.6;          // ampleur de la déambulation (angle en radians)

/**
 * Écran de la télé : un canvas redessiné quelques fois par seconde
 * (texte façon vieux moniteur, lignes de balayage, curseur qui clignote,
 * petit « glitch » à chaque changement de message).
 */
function creerEcranTele() {
  const c = document.createElement('canvas');
  c.width = 384; c.height = 300;
  const ctx = c.getContext('2d');
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  const couleurs = ['#7df9ff', '#c792ff', '#ffcc00', '#7dffb5'];

  function dessiner(lignes, couleur, t, glitch) {
    const l = c.width, h = c.height;
    ctx.clearRect(0, 0, l, h);
    // Fond d'écran cathodique (coins arrondis transparents, léger halo au centre)
    ctx.save();
    ctx.beginPath(); ctx.roundRect(4, 4, l - 8, h - 8, 34); ctx.clip();
    const fond = ctx.createRadialGradient(l / 2, h / 2, 10, l / 2, h / 2, l * 0.7);
    fond.addColorStop(0, '#1a1430'); fond.addColorStop(1, '#05040a');
    ctx.fillStyle = fond; ctx.fillRect(0, 0, l, h);
    // En-tête
    ctx.font = 'bold 20px Consolas, "Courier New", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.textAlign = 'left'; ctx.fillText('BOSS.TV', 26, 30);
    ctx.textAlign = 'right';
    ctx.fillStyle = Math.sin(t * 4) > 0 ? '#ff4757' : 'rgba(255,71,87,0.3)';
    ctx.fillText('● LIVE', l - 26, 30);
    // Texte principal : taille ajustée pour tenir dans l'écran
    ctx.textAlign = 'center';
    let taille = lignes.length > 2 ? 52 : 62;
    ctx.font = `bold ${taille}px Consolas, "Courier New", monospace`;
    while (taille > 24 && Math.max(...lignes.map((x) => ctx.measureText(x).width)) > l - 50) {
      taille -= 2;
      ctx.font = `bold ${taille}px Consolas, "Courier New", monospace`;
    }
    const pas = taille * 1.12;
    const y0 = h / 2 + 14 - ((lignes.length - 1) * pas) / 2;
    const decalage = glitch ? 6 : 0;
    lignes.forEach((ligne, i) => {
      const y = y0 + i * pas;
      const texte = i === lignes.length - 1 && Math.sin(t * 6) > 0 ? ligne + '_' : ligne;
      if (glitch) { // séparation rouge / bleu façon signal brouillé
        ctx.fillStyle = 'rgba(255,40,80,0.7)'; ctx.fillText(texte, l / 2 - decalage, y);
        ctx.fillStyle = 'rgba(40,160,255,0.7)'; ctx.fillText(texte, l / 2 + decalage, y);
      }
      ctx.shadowColor = couleur; ctx.shadowBlur = 18;
      ctx.fillStyle = couleur; ctx.fillText(texte, l / 2, y);
      ctx.shadowBlur = 0;
    });
    // Lignes de balayage
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, l, 2);
    ctx.restore();
    texture.needsUpdate = true;
  }

  return { texture, dessiner, couleurs };
}

export function createGeant(scene, lireEtatJeu = () => ({ difficulte: 'normal', temps: 0, chutes: 0, etat: 'titre' })) {
  const texture = new THREE.TextureLoader().load('assets/geant-boss.png');
  texture.colorSpace = THREE.SRGBColorSpace;

  // Plan dont l'origine est aux pieds : il pivote depuis le sol
  const geometrie = new THREE.PlaneGeometry(HAUTEUR * RAPPORT, HAUTEUR);
  geometrie.translate(0, HAUTEUR / 2, 0);
  const image = new THREE.Mesh(
    geometrie,
    new THREE.MeshBasicMaterial({ map: texture, alphaTest: 0.2, side: THREE.DoubleSide }),
  );
  // Écran de la télé : un plan posé juste devant l'écran noir de l'image
  const tele = creerEcranTele();
  const largeurImage = HAUTEUR * RAPPORT;
  const marge = 0.04; // reste à l'intérieur du cadre de la télé
  const ecran = new THREE.Mesh(
    new THREE.PlaneGeometry(
      largeurImage * (ECRAN.droite - ECRAN.gauche) * (1 - marge * 2),
      HAUTEUR * (ECRAN.bas - ECRAN.haut) * (1 - marge * 2),
    ),
    new THREE.MeshBasicMaterial({ map: tele.texture, transparent: true, toneMapped: false }),
  );
  ecran.position.set(
    largeurImage * ((ECRAN.gauche + ECRAN.droite) / 2 - 0.5),
    HAUTEUR * (1 - (ECRAN.haut + ECRAN.bas) / 2),
    0.3,
  );
  image.add(ecran); // l'écran suit le balancement du géant
  let indexMessage = 0, debutMessage = 0, prochainDessin = 0;

  const geant = new THREE.Group(); // le groupe se tourne vers la caméra, l'image se balance dedans
  geant.add(image);
  geant.position.set(-20, Y_SOL, -35);
  scene.add(geant);

  const cible = new THREE.Vector3();
  const avant = new THREE.Vector3();
  let pas = 0; // pour l'effet de marche
  let enArrivee = false;

  return {
    objet: geant,

    /** Début de niveau : il apparaît au fond et arrive en déambulant. */
    arriver(posBoule, cap) {
      const avX = -Math.sin(cap), avZ = -Math.cos(cap);
      const gaX = -Math.cos(cap), gaZ = Math.sin(cap);
      geant.position.set(
        posBoule.x + avX * DISTANCE_DEPART + gaX * 26, Y_SOL,
        posBoule.z + avZ * DISTANCE_DEPART + gaZ * 26,
      );
      enArrivee = true;
      indexMessage = 0; // au départ, la télé annonce le niveau et la difficulté
      debutMessage = -Infinity;
    },

    /**
     * posBoule : position de la boule ; cap : direction de la caméra
     * camera : pour se tourner vers elle
     * immediat : true pour le téléporter (nouvelle partie)
     */
    update(dt, t, posBoule, cap, camera, immediat = false) {
      if (posBoule) {
        // Devant-gauche de la caméra : visible sans gêner le parcours
        const avX = -Math.sin(cap), avZ = -Math.cos(cap);
        const gaX = -Math.cos(cap), gaZ = Math.sin(cap);
        cible.set(posBoule.x + avX * 22 + gaX * 26, Y_SOL, posBoule.z + avZ * 22 + gaZ * 26);
        avant.copy(geant.position);
        if (immediat) geant.position.copy(cible);
        else if (enArrivee) {
          // Il marche vers sa place en zigzaguant (la direction oscille de gauche à droite)
          const dx = cible.x - geant.position.x, dz = cible.z - geant.position.z;
          const d = Math.hypot(dx, dz);
          if (d < 5) enArrivee = false; // arrivé : il suit le joueur normalement
          else {
            const a = Math.atan2(dx, dz) + Math.sin(t * 0.5) * ZIGZAG;
            const p = Math.min(d, VITESSE_ARRIVEE * dt);
            geant.position.x += Math.sin(a) * p;
            geant.position.z += Math.cos(a) * p;
          }
        } else geant.position.lerp(cible, 1 - Math.exp(-dt * VITESSE_SUIVI));
        pas += avant.distanceTo(geant.position) * 0.6;
      }

      // Toujours face à la caméra, mais seulement autour de l'axe vertical
      if (camera) {
        geant.rotation.y = Math.atan2(camera.position.x - geant.position.x, camera.position.z - geant.position.z);
      }

      // Balancement (respiration + marche) façon King Kong
      const marche = Math.sin(pas) * 0.06;
      // Réglage « réduire les animations » : il reste immobile, sans se balancer
      const calme = MOUVEMENT_REDUIT.matches;
      image.rotation.z = calme ? 0 : Math.sin(t * 0.7) * 0.025 + marche;
      image.position.y = calme ? 0 : Math.abs(Math.sin(pas)) * 1.5;
      image.scale.y = 1 + Math.sin(t * 1.4) * 0.008;

      // Télé : message suivant toutes les DUREE_MESSAGE secondes, redessin ~8 fois par seconde
      if (debutMessage === -Infinity) debutMessage = t;
      if (t - debutMessage > DUREE_MESSAGE) {
        indexMessage = (indexMessage + 1) % MESSAGES.length;
        debutMessage = t;
      }
      if (t >= prochainDessin) {
        prochainDessin = t + 0.125;
        const lignes = MESSAGES[indexMessage](lireEtatJeu());
        const glitch = !calme && t - debutMessage < 0.25;
        tele.dessiner(lignes, tele.couleurs[indexMessage % tele.couleurs.length], t, glitch);
      }
    },
  };
}
