// =====================================================================
//  EEMI BALL : boucle de jeu principale
//  Assemble : rendu 3D (Three.js) + physique + contrôles + niveau + bonus
// =====================================================================
import * as THREE from 'three';
import { createTuning } from './tuning.js';
import { Controls } from './controls.js';
import { createPhysics, RAYON_BOULE } from './physics.js';
import { buildLevel } from './level.js';
import { createBonuses } from './bonuses.js';
import { createGeant } from './geant.js';
import { calculerScore, chargerClassement, envoyerScore, lireNomSauvegarde, sauvegarderNom } from './scores.js';

const $ = (id) => document.getElementById(id);

// ---------------- Rendu ----------------
const renderer = new THREE.WebGLRenderer({ canvas: $('jeu'), antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd3ff);
scene.fog = new THREE.Fog(0x9fd3ff, 45, 150);

const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 400);

scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.3));
const soleil = new THREE.DirectionalLight(0xffffff, 1.8);
soleil.castShadow = true;
soleil.shadow.mapSize.set(1024, 1024);
Object.assign(soleil.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 70 });
scene.add(soleil, soleil.target);

function redimensionner() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', redimensionner);
redimensionner();

// ---------------- Réglages, physique, niveau ----------------
const menuDiff = $('difficultes');
const boutonsDiff = document.querySelectorAll('.btn-diff');
function majBoutonsDifficulte() {
  const actuelle = difficulteActuelle();
  menuDiff.dataset.niveau = actuelle || '';
  boutonsDiff.forEach((btn) => btn.classList.toggle('actif', btn.dataset.difficulte === actuelle));
}

const { params, reinitialiser, appliquerDifficulte, difficulteActuelle } = createTuning($('reglages-liste'), () => {
  physique.appliquerReglages();
  majBoutonsDifficulte();
});
const physique = createPhysics(params);
majBoutonsDifficulte();
const niveau = buildLevel(scene, physique.world, physique.solMat);
const controles = new Controls(params);

// Boule : texture à rayures pour bien voir qu'elle roule
function creerBoule() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ff7a1a'; ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 4; i++) ctx.fillRect(i * 64, 0, 22, 128);
  ctx.fillRect(0, 56, 256, 16);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(RAYON_BOULE, 32, 24),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35 }),
  );
  m.castShadow = true;
  return m;
}
const boule = creerBoule();
scene.add(boule);

// ---------------- État du jeu ----------------
const game = {
  etat: 'titre',            // 'titre' | 'jeu' | 'fin'
  temps: 0,                 // temps écoulé depuis le départ
  boostJusqua: 0,
  chutes: 0,
  get boost() { return this.temps < this.boostJusqua; },
  flash(message) {
    const el = $('flash');
    el.textContent = message;
    el.classList.remove('visible');
    void el.offsetWidth; // relance l'animation
    el.classList.add('visible');
  },
};
const bonus = createBonuses(scene, niveau.bonus, game);
const geant = createGeant(scene);

let cap = niveau.capDepart; // direction de la caméra (radians)
const posCamera = new THREE.Vector3();
const cibleCamera = new THREE.Vector3();

// ---------------- Classement & joueur ----------------
const champNom = $('champ-nom');
const elClassement = $('classement-liste');
champNom.value = lireNomSauvegarde();
champNom.addEventListener('input', () => sauvegarderNom(champNom.value));

function afficherClassement(liste) {
  elClassement.textContent = '';
  if (!liste || !liste.length) {
    elClassement.textContent = 'Aucun score enregistré pour le moment.';
    return;
  }
  const medailles = ['🥇', '🥈', '🥉'];
  liste.forEach((entree, i) => {
    const ligne = document.createElement('div');
    ligne.className = 'classement-ligne';

    const rang = document.createElement('span');
    rang.className = 'classement-rang';
    rang.textContent = medailles[i] || `${i + 1}.`;

    const nom = document.createElement('span');
    nom.className = 'classement-nom';
    nom.textContent = entree.nom || 'Anonyme';

    const badge = document.createElement('span');
    const diff = entree.difficulte || 'normal';
    badge.className = `classement-badge ${diff}`;
    badge.textContent = diff;

    const score = document.createElement('span');
    score.className = 'classement-score';
    score.textContent = `${entree.score} pts`;

    const temps = document.createElement('span');
    temps.className = 'classement-temps';
    temps.textContent = `${Number(entree.temps).toFixed(1)} s`;

    ligne.append(rang, nom, badge, score, temps);
    elClassement.append(ligne);
  });
}

async function rafraichirClassement() {
  const liste = await chargerClassement();
  afficherClassement(liste);
}
rafraichirClassement();

function replacerBoule() {
  physique.replacer(niveau.depart);
  cap = niveau.capDepart;
  boule.position.copy(physique.boule.position);
  placerCamera(1, true);
}

function nouvellePartie() {
  sauvegarderNom(champNom.value);
  game.temps = 0;
  game.boostJusqua = 0;
  game.chutes = 0;
  bonus.reset();
  replacerBoule();
  geant.arriver(physique.boule.position, cap);
  controles.calibrer();
  game.etat = 'jeu';
  $('ecran-titre').classList.add('cache');
  $('ecran-fin').classList.add('cache');
  $('hud').classList.remove('cache');
  game.flash('Partez !');
}

function retourAccueil() {
  game.etat = 'titre';
  replacerBoule();
  $('hud').classList.add('cache');
  $('ecran-fin').classList.add('cache');
  $('reglages').classList.add('cache');
  $('joystick').classList.add('cache');
  $('ecran-titre').classList.remove('cache');
  rafraichirClassement();
}

async function finDePartie() {
  game.etat = 'fin';
  $('hud').classList.add('cache');
  $('ecran-fin').classList.remove('cache');
  const diff = difficulteActuelle() || 'normal';
  const nom = champNom.value.trim() || 'Anonyme';
  const score = calculerScore(game.temps, diff, game.chutes);
  $('fin-titre').textContent = "Arrivé à l'EEMI ! 🎓";
  $('fin-texte').textContent =
    `${nom} · Score : ${score} pts · Temps : ${game.temps.toFixed(2)} s · Chutes : ${game.chutes}`;
  const liste = await envoyerScore({
    nom,
    score,
    temps: game.temps,
    difficulte: diff,
    chutes: game.chutes,
  });
  afficherClassement(liste);
}

// ---------------- Boutons ----------------
async function lancer() {
  // 1) Autorisation du gyroscope : doit être la PREMIÈRE chose faite dans le clic (iPhone)
  const ok = await controles.activerGyro();
  // 2) Plein écran (Android ; ignoré sur iPhone)
  try {
    if (document.documentElement.requestFullscreen && matchMedia('(pointer: coarse)').matches) {
      await document.documentElement.requestFullscreen();
      await screen.orientation?.lock?.('portrait').catch(() => {});
    }
  } catch { /* pas grave */ }

  nouvellePartie();

  // 3) Sur téléphone sans gyroscope (refusé ou HTTP), on affiche un joystick tactile
  const tactile = matchMedia('(pointer: coarse)').matches;
  setTimeout(() => {
    if (tactile && !controles.gyroActif) {
      controles.activerTactile($('joystick'), $('joystick-bouton'));
      game.flash(ok ? 'Gyroscope muet : joystick activé' : 'Gyroscope refusé : joystick activé');
    }
  }, 1200);
}

boutonsDiff.forEach((btn) => {
  btn.addEventListener('click', () => appliquerDifficulte(btn.dataset.difficulte));
});
$('btn-jouer').addEventListener('click', lancer);
$('btn-rejouer').addEventListener('click', nouvellePartie);
$('btn-quitter').addEventListener('click', retourAccueil);
$('btn-accueil').addEventListener('click', retourAccueil);
$('btn-calib').addEventListener('click', () => { controles.calibrer(); game.flash('Recalibré ✔'); });
$('btn-reglages').addEventListener('click', () => $('reglages').classList.toggle('cache'));
$('btn-fermer').addEventListener('click', () => $('reglages').classList.add('cache'));
$('btn-defaut').addEventListener('click', reinitialiser);
addEventListener('keydown', (e) => {
  const dansChamp = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA');
  if (e.key === 'Enter' || (e.key === ' ' && !dansChamp)) {
    if (game.etat === 'titre') lancer();
    else if (game.etat === 'fin') nouvellePartie();
  }
  if (!dansChamp && e.key.toLowerCase() === 'r' && game.etat === 'jeu') replacerBoule();
  if (e.key === 'Escape' && game.etat !== 'titre') retourAccueil();
});

// ---------------- Caméra ----------------
function placerCamera(dt, immediat = false) {
  const p = boule.position;
  const distance = 7, hauteur = 3.2;

  // La caméra se tourne doucement vers la direction du mouvement
  const v = physique.boule.velocity;
  const vh = Math.hypot(v.x, v.z);
  if (!immediat && game.etat === 'jeu' && vh > 1.5) {
    const capCible = Math.atan2(-v.x, -v.z);
    let diff = capCible - cap;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // entre -π et π
    cap += diff * Math.min(1, dt * params.cameraRotation * Math.min(1, vh / 8));
  }

  posCamera.set(p.x + Math.sin(cap) * distance, p.y + hauteur, p.z + Math.cos(cap) * distance);
  cibleCamera.set(p.x - Math.sin(cap) * 2, p.y + 0.3, p.z - Math.cos(cap) * 2);

  if (immediat) camera.position.copy(posCamera);
  else camera.position.lerp(posCamera, 1 - Math.exp(-dt * 8));
  camera.lookAt(cibleCamera);

  // Effet « le plateau penche » : on incline légèrement la caméra
  const visuel = (params.inclinaisonJeu * Math.PI / 180) * params.inclinaisonVisuelle;
  camera.rotateZ(controles.tilt.x * visuel);
  camera.rotateX(controles.tilt.y * visuel * 0.5);
}

// ---------------- HUD ----------------
const elChrono = $('chrono'), elEffets = $('effets'), elPoint = $('inclino-point'), elMode = $('mode'), elDebug = $('debug');
const NOMS_MODES = { gyro: '📱 gyroscope', clavier: '⌨️ clavier', tactile: '👆 joystick' };

function majHUD() {
  elChrono.textContent = `${game.temps.toFixed(1)} s`;
  elEffets.textContent = game.boost ? `☕ ${(game.boostJusqua - game.temps).toFixed(1)} s` : '';
  elPoint.style.transform = `translate(${controles.tilt.x * 27}px, ${-controles.tilt.y * 27}px)`;
  elMode.textContent = NOMS_MODES[controles.mode] || '';
  if (!$('reglages').classList.contains('cache')) {
    const b = controles.brut, n = controles.neutre;
    const v = physique.boule.velocity;
    elDebug.textContent =
      `mode : ${controles.mode}  gyro reçu : ${controles.gyroActif ? 'oui' : 'non'}\n` +
      `beta : ${b.beta.toFixed(1)}  gamma : ${b.gamma.toFixed(1)}  écran : ${b.angle}°\n` +
      `neutre : ${n ? n.beta.toFixed(1) + ' / ' + n.gamma.toFixed(1) : '-'}\n` +
      `inclinaison : x ${controles.tilt.x.toFixed(2)}  y ${controles.tilt.y.toFixed(2)}\n` +
      `vitesse : ${Math.hypot(v.x, v.z).toFixed(1)}  https : ${isSecureContext ? 'oui' : 'NON (gyro bloqué)'}`;
  }
}

// ---------------- Boucle principale ----------------
let dernier = performance.now();
let horloge = 0;

function image(maintenant) {
  requestAnimationFrame(image);
  const dt = Math.max(0, Math.min((maintenant - dernier) / 1000, 0.05));
  dernier = Math.max(dernier, maintenant);
  horloge += dt;
  niveau.animer(horloge, dt);

  controles.update(dt);

  if (game.etat === 'jeu') {
    game.temps += dt;

    physique.appliquerInclinaison(controles.tilt, cap, game.boost);
    physique.world.step(1 / 60, dt, 5);
    physique.limiterVitesse(game.boost);

    boule.position.copy(physique.boule.position);
    boule.quaternion.copy(physique.boule.quaternion);

    bonus.update(dt, horloge, boule.position);

    if (boule.position.y < niveau.yChute) {
      game.chutes++;
      replacerBoule();
      game.flash('Plouf ! Retour au départ');
    } else if (niveau.estArrive(boule.position)) {
      finDePartie();
    }
    placerCamera(dt);
    geant.update(dt, horloge, boule.position, cap, camera);
    majHUD();
  } else {
    bonus.update(dt, horloge, null);
    geant.update(dt, horloge, null, cap, camera);
    if (game.etat === 'titre') {
      // Écran titre : la caméra tourne autour du départ
      const a = horloge * 0.15;
      camera.position.set(Math.sin(a) * 26 + 8, 16, Math.cos(a) * 26 - 25);
      camera.lookAt(10, 0, -32);
    }
  }

  // L'ombre suit la boule
  soleil.position.set(boule.position.x + 10, boule.position.y + 22, boule.position.z + 8);
  soleil.target.position.copy(boule.position);

  renderer.render(scene, camera);
}

physique.replacer(niveau.depart);
boule.position.copy(physique.boule.position);
requestAnimationFrame(image);
window.__jeuPret = true;
window.__debug = { physique, game, controles, params, image, geant, camera, scene }; // pour inspecter depuis la console
