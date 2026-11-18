// =====================================================================
//  BONUS
//  Pour créer un nouveau bonus :
//   1. ajoute une entrée dans TYPES_BONUS (forme 3D + effet)
//   2. place-le dans le niveau (level.js → liste `bonus`)
// =====================================================================
import * as THREE from 'three';

export const TYPES_BONUS = {
  cafe: {
    nom: 'Café',
    duree: 4,
    creerMesh() {
      const g = new THREE.Group();
      const tasse = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.22, 0.45, 20),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
      );
      const cafe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.25, 0.02, 20),
        new THREE.MeshStandardMaterial({ color: 0x5a3214 }),
      );
      cafe.position.y = 0.2;
      const anse = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.04, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0xffffff }),
      );
      anse.position.x = 0.3;
      g.add(tasse, cafe, anse);
      g.scale.setScalar(1.3);
      g.traverse((o) => { o.castShadow = true; });
      return g;
    },
    appliquer(game) {
      game.boostJusqua = game.temps + this.duree;
      game.flash('☕ Café ! Vitesse x1.6');
    },
  },

  croissant: {
    nom: 'Croissant',
    creerMesh() {
      const m = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.15, 10, 20, Math.PI * 1.25),
        new THREE.MeshStandardMaterial({ color: 0xe0a040, roughness: 0.6 }),
      );
      m.rotation.z = Math.PI * 0.62;
      const g = new THREE.Group();
      g.add(m);
      g.scale.setScalar(1.3);
      m.castShadow = true;
      return g;
    },
    appliquer(game) {
      game.tempsRestant += 10;
      game.flash('🥐 +10 secondes');
    },
  },
};

/** Place les bonus dans la scène et gère leur ramassage. */
export function createBonuses(scene, liste, game) {
  const items = liste.map((b, i) => {
    const def = TYPES_BONUS[b.type];
    const mesh = def.creerMesh();
    mesh.position.set(b.pos[0], b.pos[1], b.pos[2]);
    scene.add(mesh);
    return { def, mesh, baseY: b.pos[1], actif: true, phase: i };
  });

  return {
    update(dt, t, posBoule) {
      for (const it of items) {
        if (!it.actif) continue;
        it.mesh.rotation.y += dt * 2;
        it.mesh.position.y = it.baseY + Math.sin(t * 3 + it.phase) * 0.15;
        if (posBoule && it.mesh.position.distanceTo(posBoule) < 1.1) {
          it.actif = false;
          it.mesh.visible = false;
          it.def.appliquer(game);
        }
      }
    },
    reset() {
      for (const it of items) { it.actif = true; it.mesh.visible = true; }
    },
  };
}
