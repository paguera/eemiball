// =====================================================================
//  BONUS
//  Pour créer un nouveau bonus :
//   1. ajoute une entrée dans TYPES_BONUS (forme 3D + effet)
//   2. place-le dans le niveau (level.js → liste `bonus`)
// =====================================================================
import * as THREE from 'three';

export const TYPES_BONUS = {
  canette: {
    nom: 'Canette énergisante',
    creerMesh() {
      // Étiquette dessinée sur un canvas : moitié bleue, moitié argent en damier
      const c = document.createElement('canvas');
      c.width = 256; c.height = 256;
      const ctx = c.getContext('2d');
      for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
        const haut = j < 8;
        ctx.fillStyle = (i + j) % 2
          ? (haut ? '#c9ced6' : '#1f3c8c')
          : (haut ? '#e8ebf0' : '#2a4fb0');
        ctx.fillRect(i * 16, j * 16, 16, 16);
      }
      ctx.fillStyle = '#d7263d';
      ctx.font = 'bold 50px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const x of [64, 192]) ctx.fillText('ENERGY', x, 128);
      const etiquette = new THREE.CanvasTexture(c);
      etiquette.colorSpace = THREE.SRGBColorSpace;

      const alu = new THREE.MeshStandardMaterial({ color: 0xd9dde3, metalness: 0.9, roughness: 0.25 });
      const corps = new THREE.Mesh(
        new THREE.CylinderGeometry(0.17, 0.17, 0.62, 24, 1, true),
        new THREE.MeshStandardMaterial({ map: etiquette, metalness: 0.5, roughness: 0.35 }),
      );
      const haut = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.06, 24), alu);
      haut.position.y = 0.34;
      const bas = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.05, 24), alu);
      bas.position.y = -0.335;
      const languette = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.01, 0.12), alu);
      languette.position.set(0, 0.375, 0.03);
      const g = new THREE.Group();
      g.add(corps, haut, bas, languette);
      g.rotation.z = 0.25; // légèrement penchée
      g.scale.setScalar(1.5);
      g.traverse((o) => { o.castShadow = true; });
      return g;
    },
    appliquer(game) {
      game.boostJusqua = Math.max(game.temps, game.boostJusqua) + 5;
      game.audio?.jouer('redbull');
      game.flash('⚡ Canette : Boost x1.6 !');
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
    /** Changement de niveau : enlève ces bonus de la scène. */
    retirer() {
      for (const it of items) scene.remove(it.mesh);
    },
  };
}
