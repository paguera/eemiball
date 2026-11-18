// =====================================================================
//  PHYSIQUE (cannon-es)
//  Astuce : le niveau ne bouge jamais. Quand on penche le téléphone,
//  on penche la GRAVITÉ. La boule roule comme si le plateau était incliné.
// =====================================================================
import * as CANNON from 'cannon-es';

export const RAYON_BOULE = 0.5;
export const BOOST = 1.6; // multiplicateur du boost (canette)

export function createPhysics(params) {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -params.gravite, 0) });
  world.allowSleep = false;

  // Matériaux : réglent l'adhérence et le rebond entre la boule et le sol
  const solMat = new CANNON.Material('sol');
  const bouleMat = new CANNON.Material('boule');
  const contact = new CANNON.ContactMaterial(solMat, bouleMat, {
    friction: params.frottement,
    restitution: params.rebond,
  });
  world.addContactMaterial(contact);

  const boule = new CANNON.Body({
    mass: 1,
    shape: new CANNON.Sphere(RAYON_BOULE),
    material: bouleMat,
    linearDamping: params.amorti,
    angularDamping: 0.1,
  });
  world.addBody(boule);

  return {
    world, boule, solMat,

    appliquerReglages() {
      contact.friction = params.frottement;
      contact.restitution = params.rebond;
      boule.linearDamping = params.amorti;
    },

    /**
     * tilt : {x, y} entre -1 et 1 ; cap : angle de la caméra (radians)
     * Les directions « avant » et « droite » sont celles de la caméra.
     */
    appliquerInclinaison(tilt, cap, boost) {
      const maxRad = (params.inclinaisonJeu * Math.PI) / 180;
      const angleAvant = tilt.y * maxRad;
      const angleCote = tilt.x * maxRad;
      const G = params.gravite;
      const mult = boost ? BOOST : 1;

      const avX = -Math.sin(cap), avZ = -Math.cos(cap); // vecteur avant
      const drX = Math.cos(cap), drZ = -Math.sin(cap);  // vecteur droite

      const hAvant = Math.sin(angleAvant) * G * mult;
      const hCote = Math.sin(angleCote) * G * mult;
      world.gravity.set(
        avX * hAvant + drX * hCote,
        -G * Math.cos(angleAvant) * Math.cos(angleCote),
        avZ * hAvant + drZ * hCote,
      );
    },

    /** Empêche la boule d'aller trop vite à l'horizontale. */
    limiterVitesse(boost) {
      const max = params.vitesseMax * (boost ? BOOST : 1);
      const v = boule.velocity;
      const h = Math.hypot(v.x, v.z);
      if (h > max) { v.x *= max / h; v.z *= max / h; }
    },

    /** Replace la boule au point donné, immobile. */
    replacer(pos) {
      boule.position.set(pos.x, pos.y, pos.z);
      boule.velocity.set(0, 0, 0);
      boule.angularVelocity.set(0, 0, 0);
      boule.quaternion.set(0, 0, 0, 1);
      world.gravity.set(0, -params.gravite, 0);
    },
  };
}
