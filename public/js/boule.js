// =====================================================================
//  LA BOULE : une sphère de verre transparente avec le personnage dedans
//  - le verre tourne avec la physique (on voit qu'elle roule)
//  - le personnage (image 2D) reste debout au centre, face à la caméra,
//    et s'anime selon la vitesse : il se dandine, penche dans les
//    virages, s'écrase à l'atterrissage, s'agite avec un boost.
//  Le personnage se choisit dans le menu (voir personnages.js).
// =====================================================================
import * as THREE from 'three';
import { RAYON_BOULE } from './physics.js';

const HAUTEUR_PERSO = RAYON_BOULE * 1.4; // il remplit la boule sans que ses mains dépassent

const borner = (v, a, b) => Math.max(a, Math.min(b, v));

/** Texture du verre : presque transparente, avec deux bandes pour voir la rotation. */
function textureVerre() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#ff7a1a'; // bandes orange : la couleur de l'ancienne boule
  ctx.fillRect(0, 58, 256, 12);
  ctx.fillRect(60, 0, 10, 128);
  ctx.fillRect(188, 0, 10, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createBoule(scene) {
  const objet = new THREE.Group(); // suit la position de la physique (sans tourner)
  scene.add(objet);

  // --- Le personnage à l'intérieur (image changée avec changerPerso) ---
  const chargeur = new THREE.TextureLoader();
  const perso = new THREE.Mesh(
    new THREE.PlaneGeometry(HAUTEUR_PERSO, HAUTEUR_PERSO),
    new THREE.MeshBasicMaterial({ alphaTest: 0.35, side: THREE.DoubleSide }),
  );
  perso.visible = false; // jusqu'à ce que l'image soit chargée
  let demande = 0;
  let baseY = 0; // centre verticalement les images plus larges que hautes

  /** Charge l'image d'un personnage et adapte la taille à ses proportions. */
  function changerPerso(url) {
    const n = ++demande;
    chargeur.load(url, (texture) => {
      if (n !== demande) { texture.dispose(); return; } // un autre choix est arrivé entre-temps
      texture.colorSpace = THREE.SRGBColorSpace;
      const rapport = texture.image.width / texture.image.height;
      // Les images larges sont réduites pour que les mains ne sortent pas de la boule
      const h = HAUTEUR_PERSO * Math.min(1, 1 / rapport);
      const geo = new THREE.PlaneGeometry(h * rapport, h);
      geo.translate(0, h / 2, 0); // origine aux pieds : il pivote depuis le bas
      perso.geometry.dispose();
      perso.geometry = geo;
      perso.material.map?.dispose();
      perso.material.map = texture;
      perso.material.needsUpdate = true;
      baseY = (HAUTEUR_PERSO - h) / 2;
      perso.visible = true;
    });
  }
  const pivot = new THREE.Group(); // se tourne vers la caméra (axe vertical seulement)
  pivot.position.y = -HAUTEUR_PERSO / 2;
  pivot.add(perso);
  objet.add(pivot);

  // --- La sphère de verre ---
  const verre = new THREE.Mesh(
    new THREE.SphereGeometry(RAYON_BOULE, 40, 28),
    new THREE.MeshStandardMaterial({
      map: textureVerre(), color: 0xcfe9ff, transparent: true, opacity: 0.28,
      roughness: 0.05, metalness: 0.2, depthWrite: false,
    }),
  );
  verre.renderOrder = 2; // dessiné après Thibault, pour qu'on le voie à travers
  verre.castShadow = true;
  // Un léger contour intérieur donne de l'épaisseur au verre
  const contour = new THREE.Mesh(
    new THREE.SphereGeometry(RAYON_BOULE * 0.99, 32, 20),
    new THREE.MeshBasicMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.12, side: THREE.BackSide, depthWrite: false }),
  );
  contour.renderOrder = 1;
  // Reflet de lumière fixe (en haut à gauche) : renforce l'effet « bulle »
  const reflet = new THREE.Mesh(
    new THREE.SphereGeometry(RAYON_BOULE * 0.16, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  reflet.scale.set(1, 0.6, 0.3);
  reflet.renderOrder = 3;
  objet.add(verre, contour, reflet);

  // --- État de l'animation ---
  let foulee = 0;     // phase de la marche
  let ecrasement = 0; // 1 juste après un atterrissage, revient à 0
  let vyAvant = 0;
  let inclinaison = 0, penche = 0;
  const versCamera = new THREE.Vector3();

  return {
    objet,
    changerPerso,

    /**
     * corps : le corps physique (position, vitesse, rotation)
     * camera : pour orienter Thibault ; cap : direction de la caméra
     * boost : vrai pendant une canette
     */
    update(dt, t, corps, camera, cap, boost) {
      objet.position.copy(corps.position);
      verre.quaternion.copy(corps.quaternion);

      // Thibault et le reflet regardent la caméra (rotation verticale seulement)
      versCamera.subVectors(camera.position, objet.position);
      const angle = Math.atan2(versCamera.x, versCamera.z);
      pivot.rotation.y = angle;
      reflet.position.set(
        Math.sin(angle) * 0.36 - Math.cos(angle) * 0.18, 0.2,
        Math.cos(angle) * 0.36 + Math.sin(angle) * 0.18,
      );

      // Vitesse vue depuis la caméra : vers l'avant et vers la droite
      const v = corps.velocity;
      const vitesse = Math.hypot(v.x, v.z);
      const vDroite = v.x * Math.cos(cap) - v.z * Math.sin(cap);
      const vAvant = -v.x * Math.sin(cap) - v.z * Math.cos(cap);
      const elan = Math.min(1, vitesse / 5);

      // Marche : plus il va vite, plus il se dandine vite
      foulee += dt * (2 + vitesse * 2.2);
      const dandine = Math.sin(foulee) * 0.16 * elan;
      const sautille = Math.abs(Math.sin(foulee)) * 0.05 * elan;

      // Il penche dans les virages et vers l'avant quand il accélère
      inclinaison += (borner(-vDroite * 0.05, -0.4, 0.4) - inclinaison) * Math.min(1, dt * 6);
      penche += (borner(-vAvant * 0.025, -0.3, 0.3) - penche) * Math.min(1, dt * 6);

      // Atterrissage : écrasement façon dessin animé
      if (vyAvant < -4 && v.y > -1) ecrasement = Math.min(1, -vyAvant / 10 + 0.3);
      vyAvant = v.y;
      ecrasement = Math.max(0, ecrasement - dt * 4);

      // Respiration à l'arrêt, panique quand il tombe, frénésie avec un boost
      const respire = Math.sin(t * 2.5) * 0.04 * (1 - elan);
      const tombe = v.y < -6;
      const agite = boost ? Math.sin(t * 40) * 0.05 : 0;

      perso.rotation.z = dandine + inclinaison + agite + (tombe ? Math.sin(t * 25) * 0.25 : 0);
      perso.rotation.x = penche;
      perso.position.y = baseY + sautille;
      perso.scale.set(
        1 + ecrasement * 0.25 - respire * 0.5,
        1 - ecrasement * 0.3 + respire + (tombe ? 0.08 : 0),
        1,
      );
    },
  };
}
