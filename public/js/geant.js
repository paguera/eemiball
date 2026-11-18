// =====================================================================
//  LE GÉANT : un personnage en SPRITE 2D (image PNG détourée)
//  Un sprite est une image plate qui fait toujours face à la caméra.
//  Il se tient dans la ville en contrebas, comme King Kong, et suit
//  le joueur en marchant lentement à sa gauche.
// =====================================================================
import * as THREE from 'three';

const HAUTEUR = 70;        // taille en mètres (la boule fait 1 m)
const Y_SOL = -60;         // le sol de la ville (voir level.js)
const RAPPORT = 155 / 540; // largeur / hauteur de l'image
const VITESSE_SUIVI = 0.35;

export function createGeant(scene) {
  const texture = new THREE.TextureLoader().load('assets/geant.png');
  texture.colorSpace = THREE.SRGBColorSpace;

  const materiau = new THREE.SpriteMaterial({ map: texture, alphaTest: 0.2 });
  const sprite = new THREE.Sprite(materiau);
  sprite.center.set(0.5, 0);                 // ancré aux pieds : il pivote depuis le sol
  sprite.scale.set(HAUTEUR * RAPPORT, HAUTEUR, 1);
  sprite.position.set(-20, Y_SOL, -35);
  scene.add(sprite);

  const cible = new THREE.Vector3();
  let pas = 0; // pour l'effet de marche

  return {
    sprite,
    /**
     * posBoule : position de la boule ; cap : direction de la caméra
     * immediat : true pour le téléporter (nouvelle partie)
     */
    update(dt, t, posBoule, cap, immediat = false) {
      if (posBoule) {
        // Devant-gauche de la caméra : visible sans gêner le parcours
        const avX = -Math.sin(cap), avZ = -Math.cos(cap);
        const gaX = -Math.cos(cap), gaZ = Math.sin(cap);
        cible.set(posBoule.x + avX * 22 + gaX * 26, Y_SOL, posBoule.z + avZ * 22 + gaZ * 26);
        const avant = sprite.position.clone();
        if (immediat) sprite.position.copy(cible);
        else sprite.position.lerp(cible, 1 - Math.exp(-dt * VITESSE_SUIVI));
        pas += avant.distanceTo(sprite.position) * 0.6;
      }
      // Balancement (respiration + marche) façon King Kong
      const marche = Math.sin(pas) * 0.06;
      materiau.rotation = Math.sin(t * 0.7) * 0.025 + marche;
      sprite.position.y = Y_SOL + Math.abs(Math.sin(pas)) * 1.5;
      sprite.scale.y = HAUTEUR * (1 + Math.sin(t * 1.4) * 0.008);
    },
  };
}
