// =====================================================================
//  NIVEAU « BAC À SABLE »
//  Parcours : départ → bosses → rampe → plateau → pont étroit → saut
//             → virage avec rebords → descente → arrivée à l'EEMI
//  Coordonnées : -Z = devant au départ, +X = droite, Y = hauteur.
//  Les points donnés à slab() sont le DESSUS de la plateforme.
// =====================================================================
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { creerLyon } from './decor-lyon.js';
import { creerUniversCode } from './decor-code.js';

const HAUT = new THREE.Vector3(0, 1, 0);

// Texture des plateformes : quadrillage (aide à percevoir la vitesse) + lignes de code
function textureGrille() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 128);
  // Lignes de « code » discrètes (indentation + longueurs variées, façon minimap d'éditeur)
  const lignes = [[8, 70], [8, 46], [22, 60], [22, 38], [36, 52], [22, 30], [8, 20], [8, 84]];
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  lignes.forEach(([x, l], i) => ctx.fillRect(x + 6, 14 + i * 13, l, 6));
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Texte sur une texture (pour l'enseigne EEMI, les panneaux…)
function textureTexte(lignes, fond, couleur, l = 512, h = 256) {
  const c = document.createElement('canvas');
  c.width = l; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = fond;
  ctx.fillRect(0, 0, l, h);
  ctx.fillStyle = couleur;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lignes.forEach((ligne, i) => {
    ctx.font = `bold ${ligne.taille}px system-ui, sans-serif`;
    ctx.fillText(ligne.texte, l / 2, h * (i + 1) / (lignes.length + 1));
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildLevel(scene, world, solMat) {
  const grille = textureGrille();

  /** Boîte à la fois visible (Three.js) et solide (cannon-es). */
  function addBox(centre, taille, quat, couleur, options = {}) {
    const tex = grille.clone();
    tex.needsUpdate = true;
    tex.repeat.set(Math.max(1, taille[0] / 2), Math.max(1, taille[2] / 2));
    const mat = options.materiau || new THREE.MeshStandardMaterial({ color: couleur, map: tex, roughness: 0.85 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...taille), mat);
    mesh.position.copy(centre);
    mesh.quaternion.copy(quat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const corps = new CANNON.Body({
      mass: 0,
      material: solMat,
      shape: new CANNON.Box(new CANNON.Vec3(taille[0] / 2, taille[1] / 2, taille[2] / 2)),
    });
    corps.position.set(centre.x, centre.y, centre.z);
    corps.quaternion.set(quat.x, quat.y, quat.z, quat.w);
    world.addBody(corps);
    return mesh;
  }

  /** Plateforme (plate ou en pente) entre deux points du dessus. */
  function slab(debut, fin, largeur, couleur, epaisseur = 1) {
    const s = new THREE.Vector3(...debut);
    const e = new THREE.Vector3(...fin);
    const dir = e.clone().sub(s);
    const L = dir.length();
    dir.normalize();
    const x = new THREE.Vector3().crossVectors(HAUT, dir).normalize();
    const y = new THREE.Vector3().crossVectors(dir, x);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, dir));
    const centre = s.clone().add(e).multiplyScalar(0.5).addScaledVector(y, -epaisseur / 2);
    return addBox(centre, [largeur, epaisseur, L], q, couleur);
  }

  /** Mur / rebord aligné sur les axes. */
  function mur(centre, taille, couleur = 0xffffff) {
    return addBox(new THREE.Vector3(...centre), taille, new THREE.Quaternion(), couleur);
  }

  /** Bosse : une sphère à moitié enterrée dans le sol. */
  function bosse(x, ySol, z, rayon = 1.2, depasse = 0.35) {
    const y = ySol - rayon + depasse;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(rayon, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0xff8a3d, roughness: 0.7 }),
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
    const corps = new CANNON.Body({ mass: 0, material: solMat, shape: new CANNON.Sphere(rayon) });
    corps.position.set(x, y, z);
    world.addBody(corps);
  }

  // ---------------- PARCOURS ----------------
  const bleu = 0x4f8cff, vert = 0x46c37b, jaune = 0xffd447, rose = 0xff5fa2, gris = 0xd8dbe6;

  // 1. Départ (avec un petit mur derrière)
  slab([0, 0, 6], [0, 0, -6], 8, bleu);
  mur([0, 0.4, 6.25], [8, 0.8, 0.5]);

  // 2. Ligne droite avec des bosses
  slab([0, 0, -6], [0, 0, -18], 5, vert);
  bosse(1.2, 0, -9.5);
  bosse(-1.3, 0, -13);
  bosse(0.9, 0, -16);

  // 3. Rampe qui monte (3 m sur 12 m)
  slab([0, 0, -18], [0, 3, -30], 5, jaune);

  // 4. Plateau
  slab([0, 3, -30], [0, 3, -35], 7, bleu);

  // 5. Pont étroit
  slab([0, 3, -35], [0, 3, -46], 1.8, rose);

  // 6. Tremplin puis trou de 2 m
  slab([0, 3, -46], [0, 3.6, -48.5], 2.5, jaune);

  // 7. Réception (plus basse)
  slab([0, 2, -50.5], [0, 2, -62], 9, vert);

  // 8. Virage à droite avec rebords
  slab([3, 2, -59], [20, 2, -59], 5, bleu);
  mur([13, 2.35, -56.75], [14, 0.7, 0.5]);
  mur([13, 2.35, -61.25], [14, 0.7, 0.5]);

  // 9. Descente vers l'école
  slab([20, 2, -59], [28, 0.5, -59], 5, jaune);

  // 10. Parvis de l'EEMI
  slab([28, 0.5, -59], [49, 0.5, -59], 12, gris);

  // ---------------- ARRIVÉE : portail + bâtiment EEMI ----------------
  const portailX = 36;
  const matPoteau = new THREE.MeshStandardMaterial({ color: 0xe6007e });
  for (const z of [-62.2, -55.8]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4, 0.4), matPoteau);
    p.position.set(portailX, 2.5, z);
    p.castShadow = true;
    scene.add(p);
  }
  const banniere = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 1, 6.8),
    [
      matPoteau, // +x
      new THREE.MeshBasicMaterial({ map: textureTexte([{ texte: 'ARRIVÉE', taille: 120 }], '#e6007e', '#ffffff', 1024, 160) }), // -x (vers le joueur)
      matPoteau, matPoteau, matPoteau, matPoteau,
    ],
  );
  banniere.position.set(portailX, 4.5, -59);
  scene.add(banniere);

  // Bâtiment (solide : la boule s'arrête contre)
  const facade = textureTexte(
    [{ texte: 'EEMI', taille: 200 }, { texte: 'Lyon', taille: 80 }],
    '#1b1f3b', '#ffffff', 512, 512,
  );
  const fenetres = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#e9e4da'; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#5b8fd6';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) ctx.fillRect(20 + i * 60, 20 + j * 60, 36, 40);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const matFenetres = new THREE.MeshStandardMaterial({ map: fenetres });
  const batiment = new THREE.Mesh(new THREE.BoxGeometry(5, 9, 12), [
    matFenetres, new THREE.MeshStandardMaterial({ map: facade }),
    new THREE.MeshStandardMaterial({ color: 0x444a66 }), matFenetres, matFenetres, matFenetres,
  ]);
  batiment.position.set(46, 0.5 + 4.5, -59);
  batiment.castShadow = batiment.receiveShadow = true;
  scene.add(batiment);
  const corpsBat = new CANNON.Body({ mass: 0, material: solMat, shape: new CANNON.Box(new CANNON.Vec3(2.5, 4.5, 6)) });
  corpsBat.position.set(46, 5, -59);
  world.addBody(corpsBat);

  // ---------------- DÉCOR : Lyon en contrebas + univers dev/coding ----------------
  creerLyon(scene);
  const universCode = creerUniversCode(scene);

  return {
    depart: { x: 0, y: 1.2, z: 3 },
    capDepart: 0,          // la caméra regarde vers -Z
    /** Animation du décor (code qui flotte, particules), appelée à chaque image. */
    animer(t, dt) { universCode.animer(t, dt); },
    yChute: -8,            // en dessous : on a chuté
    /** Vrai quand la boule passe sous le portail. */
    estArrive(p) {
      return p.x > portailX - 0.5 && p.x < portailX + 1.5 && p.z > -62 && p.z < -56 && p.y > 0;
    },
    bonus: [
      { type: 'canette', pos: [-1.5, 0.8, -11] },
      { type: 'canette', pos: [0, 3.8, -40.5] },
      { type: 'canette', pos: [32, 1.3, -61] },
    ],
  };
}
