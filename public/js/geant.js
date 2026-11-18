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
  const l = 256, h = 200;
  // Fond pré-calculé une seule fois (évite de redessiner le dégradé et 75 lignes à chaque image)
  const fondCanvas = document.createElement('canvas');
  fondCanvas.width = l; fondCanvas.height = h;
  const fCtx = fondCanvas.getContext('2d');
  const r = 22, x0 = 3, y0 = 3, lw = l - 6, lh = h - 6;
  fCtx.beginPath();
  fCtx.moveTo(x0 + r, y0);
  fCtx.lineTo(x0 + lw - r, y0);
  fCtx.quadraticCurveTo(x0 + lw, y0, x0 + lw, y0 + r);
  fCtx.lineTo(x0 + lw, y0 + lh - r);
  fCtx.quadraticCurveTo(x0 + lw, y0 + lh, x0 + lw - r, y0 + lh);
  fCtx.lineTo(x0 + r, y0 + lh);
  fCtx.quadraticCurveTo(x0, y0 + lh, x0, y0 + lh - r);
  fCtx.lineTo(x0, y0 + r);
  fCtx.quadraticCurveTo(x0, y0, x0 + r, y0);
  fCtx.closePath();
  fCtx.clip();
  const fond = fCtx.createRadialGradient(l / 2, h / 2, 8, l / 2, h / 2, l * 0.7);
  fond.addColorStop(0, '#1a1430'); fond.addColorStop(1, '#05040a');
  fCtx.fillStyle = fond; fCtx.fillRect(0, 0, l, h);
  fCtx.font = 'bold 14px Consolas, "Courier New", monospace';
  fCtx.textBaseline = 'middle';
  fCtx.fillStyle = 'rgba(255,255,255,0.55)';
  fCtx.textAlign = 'left'; fCtx.fillText('BOSS.TV', 18, 20);
  fCtx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let y = 0; y < h; y += 4) fCtx.fillRect(0, y, l, 2);

  const c = document.createElement('canvas');
  c.width = l; c.height = h;
  const ctx = c.getContext('2d');
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  const couleurs = ['#7df9ff', '#c792ff', '#ffcc00', '#7dffb5'];

  function dessiner(lignes, couleur, t, glitch) {
    ctx.clearRect(0, 0, l, h);
    ctx.drawImage(fondCanvas, 0, 0);
    ctx.font = 'bold 14px Consolas, "Courier New", monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    ctx.fillStyle = Math.sin(t * 4) > 0 ? '#ff4757' : 'rgba(255,71,87,0.3)';
    ctx.fillText('● LIVE', l - 18, 20);

    ctx.textAlign = 'center';
    let taille = lignes.length > 2 ? 34 : 40;
    ctx.font = `bold ${taille}px Consolas, "Courier New", monospace`;
    while (taille > 16 && Math.max(...lignes.map((x) => ctx.measureText(x).width)) > l - 34) {
      taille -= 4;
      ctx.font = `bold ${taille}px Consolas, "Courier New", monospace`;
    }
    const pas = taille * 1.12;
    const cy = h / 2 + 10 - ((lignes.length - 1) * pas) / 2;
    const decalage = glitch ? 4 : 0;
    lignes.forEach((ligne, i) => {
      const y = cy + i * pas;
      const texte = i === lignes.length - 1 && Math.sin(t * 6) > 0 ? ligne + '_' : ligne;
      if (glitch) {
        ctx.fillStyle = 'rgba(255,40,80,0.7)'; ctx.fillText(texte, l / 2 - decalage, y);
        ctx.fillStyle = 'rgba(40,160,255,0.7)'; ctx.fillText(texte, l / 2 + decalage, y);
      }
      ctx.fillStyle = couleur; ctx.fillText(texte, l / 2, y);
    });
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
        prochainDessin = t + 0.5;
        const lignes = MESSAGES[indexMessage](lireEtatJeu());
        const glitch = !calme && t - debutMessage < 0.25;
        tele.dessiner(lignes, tele.couleurs[indexMessage % tele.couleurs.length], t, glitch);
      }
    },
  };
}
