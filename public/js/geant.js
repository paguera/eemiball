// =====================================================================
//  LE GÉANT : un personnage 2D (image PNG détourée) dans le décor
//  C'est une image plate qui tourne seulement autour de l'axe vertical
//  pour faire face à la caméra (comme les personnages des vieux jeux 3D).
//  Elle ne réagit donc pas à l'inclinaison de la caméra quand on joue.
//  Il se tient dans la ville en contrebas, comme King Kong, et suit
//  le joueur en marchant lentement.
// =====================================================================
import * as THREE from 'three';

const HAUTEUR = 70;        // taille en mètres (la boule fait 1 m)
const Y_SOL = -60;         // le sol de la ville (voir level.js)
const RAPPORT = 155 / 540; // largeur / hauteur de l'image
const VITESSE_SUIVI = 0.25; // plus petit = il suit plus lentement
const VITESSE_CAP = 0.4;    // vitesse à laquelle il change de côté quand le parcours tourne

export function createGeant(scene) {
  const texture = new THREE.TextureLoader().load('assets/geant.png');
  texture.colorSpace = THREE.SRGBColorSpace;

  // Plan dont l'origine est aux pieds : il pivote depuis le sol
  const geometrie = new THREE.PlaneGeometry(HAUTEUR * RAPPORT, HAUTEUR);
  geometrie.translate(0, HAUTEUR / 2, 0);
  const image = new THREE.Mesh(
    geometrie,
    new THREE.MeshBasicMaterial({ map: texture, alphaTest: 0.2, side: THREE.DoubleSide }),
  );
  const geant = new THREE.Group(); // le groupe se tourne vers la caméra, l'image se balance dedans
  geant.add(image);
  geant.position.set(-20, Y_SOL, -35);
  scene.add(geant);

  const cible = new THREE.Vector3();
  const avant = new THREE.Vector3();
  let capLisse = 0;
  let pas = 0; // pour l'effet de marche

  return {
    objet: geant,
    /**
     * posBoule : position de la boule (null = ne bouge pas)
     * cap : direction de la caméra ; camera : pour se tourner vers elle
     * immediat : true pour le placer directement (nouvelle partie)
     */
    update(dt, t, posBoule, cap, camera, immediat = false) {
      if (posBoule) {
        // On lisse la direction pour qu'il ne réagisse pas aux petits virages
        let diff = Math.atan2(Math.sin(cap - capLisse), Math.cos(cap - capLisse));
        capLisse = immediat ? cap : capLisse + diff * Math.min(1, dt * VITESSE_CAP);

        // Devant-gauche du joueur : visible sans gêner le parcours
        const avX = -Math.sin(capLisse), avZ = -Math.cos(capLisse);
        const gaX = -Math.cos(capLisse), gaZ = Math.sin(capLisse);
        cible.set(posBoule.x + avX * 22 + gaX * 26, Y_SOL, posBoule.z + avZ * 22 + gaZ * 26);

        avant.copy(geant.position);
        if (immediat) geant.position.copy(cible);
        else geant.position.lerp(cible, 1 - Math.exp(-dt * VITESSE_SUIVI));
        pas += Math.hypot(geant.position.x - avant.x, geant.position.z - avant.z) * 0.5;
      }

      // Toujours face à la caméra, mais seulement autour de l'axe vertical
      if (camera) {
        geant.rotation.y = Math.atan2(camera.position.x - geant.position.x, camera.position.z - geant.position.z);
      }

      // Balancement (respiration + marche) façon King Kong
      image.rotation.z = Math.sin(t * 0.7) * 0.025 + Math.sin(pas) * 0.05;
      image.position.y = Math.abs(Math.sin(pas)) * 1.2;
      image.scale.y = 1 + Math.sin(t * 1.4) * 0.008;
    },
  };
}
