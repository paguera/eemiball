// =====================================================================
//  LE GÉANT : un personnage 2D (image PNG détourée)
//  C'est une image plate qui tourne seulement autour de l'axe vertical
//  pour faire face à la caméra : elle ne penche pas quand la caméra penche.
//  Il se tient dans la ville en contrebas, comme King Kong, et suit
//  le joueur en marchant à sa gauche. À chaque début de niveau, il arrive
//  du fond du niveau en déambulant.
// =====================================================================
import * as THREE from 'three';

const HAUTEUR = 70;        // taille en mètres (la boule fait 1 m)
const Y_SOL = -60;         // le sol de la ville (voir level.js)
const RAPPORT = 155 / 540; // largeur / hauteur de l'image
const VITESSE_SUIVI = 0.35;

// --- Arrivée en début de niveau ---
const DISTANCE_DEPART = 120; // il apparaît au fond du niveau, dans la brume…
const VITESSE_ARRIVEE = 7;   // …et arrive à cette vitesse (m/s), environ 15 s
const ZIGZAG = 0.6;          // ampleur de la déambulation (angle en radians)

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
      image.rotation.z = Math.sin(t * 0.7) * 0.025 + marche;
      image.position.y = Math.abs(Math.sin(pas)) * 1.5;
      image.scale.y = 1 + Math.sin(t * 1.4) * 0.008;
    },
  };
}
