// =====================================================================
//  CONSTRUCTION DES NIVEAUX
//  Le décor (Lyon, univers code) est construit une seule fois.
//  Le parcours du niveau choisi (voir niveaux.js) est construit dans un
//  groupe à part : on peut le démonter et en charger un autre.
//  Coordonnées : -Z = devant au départ, +X = droite, Y = hauteur.
//  Les points donnés à slab() sont le DESSUS de la plateforme.
// =====================================================================
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { creerLyon } from './decor-lyon.js';
import { creerUniversCode } from './decor-code.js';
import { trouverNiveau } from './niveaux.js';

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

  // Ce qui appartient au parcours en cours (démonté à chaque changement de niveau)
  let groupe = null;
  let corpsParcours = [];
  const ajouterCorps = (b) => { world.addBody(b); corpsParcours.push(b); };

  /**
   * Boîte dont la texture garde la même taille sur toutes les faces (1 case = 2 m).
   * Avant, chaque face reprenait la répétition du dessus : sur les côtés fins
   * (1 m de haut), le quadrillage était écrasé en fines rayures.
   */
  function geometrieBoite([l, h, p]) {
    const geo = new THREE.BoxGeometry(l, h, p);
    const uv = geo.attributes.uv;
    // Ordre des faces de BoxGeometry : +x, -x, +y, -y, +z, -z (4 sommets chacune)
    const tailles = [[p, h], [p, h], [l, p], [l, p], [l, h], [l, h]];
    tailles.forEach(([u, v], face) => {
      for (let i = face * 4; i < face * 4 + 4; i++) uv.setXY(i, uv.getX(i) * u / 2, uv.getY(i) * v / 2);
    });
    uv.needsUpdate = true;
    return geo;
  }

  /** Boîte à la fois visible (Three.js) et solide (cannon-es). */
  function addBox(centre, taille, quat, couleur, options = {}) {
    const mat = options.materiau || new THREE.MeshStandardMaterial({ color: couleur, map: grille, roughness: 0.85 });
    const mesh = new THREE.Mesh(geometrieBoite(taille), mat);
    mesh.position.copy(centre);
    mesh.quaternion.copy(quat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    groupe.add(mesh);

    const corps = new CANNON.Body({
      mass: 0,
      material: solMat,
      shape: new CANNON.Box(new CANNON.Vec3(taille[0] / 2, taille[1] / 2, taille[2] / 2)),
    });
    corps.position.set(centre.x, centre.y, centre.z);
    corps.quaternion.set(quat.x, quat.y, quat.z, quat.w);
    ajouterCorps(corps);
    return mesh;
  }

  /** Plateforme (plate ou en pente) entre deux points du dessus. */
  function slab(debut, fin, largeur, couleur = 0x4f8cff, epaisseur = 1) {
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

  /**
   * Dalle carrée à plat, 2 cm plus haute que les routes qu'elle recouvre
   * (aux jonctions, deux dessus au même niveau scintilleraient).
   */
  function dalle(x, y, z, largeur, profondeur, couleur = 0x4f8cff) {
    return slab([x, y + 0.02, z + profondeur / 2], [x, y + 0.02, z - profondeur / 2], largeur, couleur);
  }

  /** Mur / rebord aligné sur les axes. */
  function mur(centre, taille, couleur = 0xffffff) {
    return addBox(new THREE.Vector3(...centre), taille, new THREE.Quaternion(), couleur);
  }

  /** Bosse : une sphère à moitié enterrée dans le sol. */
  const matBosse = new THREE.MeshStandardMaterial({ color: 0xff8a3d, roughness: 0.7 });
  function bosse(x, ySol, z, rayon = 1.2, depasse = 0.35) {
    const y = ySol - rayon + depasse;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(rayon, 24, 16), matBosse);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    groupe.add(mesh);
    const corps = new CANNON.Body({ mass: 0, material: solMat, shape: new CANNON.Sphere(rayon) });
    corps.position.set(x, y, z);
    ajouterCorps(corps);
  }

  // ---------------- ARRIVÉE : portail + bâtiment EEMI (matériaux partagés entre niveaux) ----------------
  const matPoteau = new THREE.MeshStandardMaterial({ color: 0xe6007e });
  const matBanniere = new THREE.MeshBasicMaterial({ map: textureTexte([{ texte: 'ARRIVÉE', taille: 120 }], '#e6007e', '#ffffff', 1024, 160) });
  const facade = textureTexte([{ texte: 'EEMI', taille: 200 }, { texte: 'Lyon', taille: 80 }], '#1b1f3b', '#ffffff', 512, 512);
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
  const matsBatiment = [
    matFenetres, matFenetres, new THREE.MeshStandardMaterial({ color: 0x444a66 }), matFenetres,
    new THREE.MeshStandardMaterial({ map: facade }), matFenetres,
  ];

  /**
   * Portail d'arrivée et bâtiment EEMI, orientés selon la direction d'arrivée.
   * Repère local de l'arrivée : -Z = sens de la course (comme la caméra).
   */
  function construireArrivee({ x, y, z, angle }) {
    const arrivee = new THREE.Group();
    arrivee.position.set(x, y, z);
    arrivee.rotation.y = angle;
    for (const cote of [-3.2, 3.2]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4, 0.4), matPoteau);
      p.position.set(cote, 2, 0);
      p.castShadow = true;
      arrivee.add(p);
    }
    // La face +Z de la bannière regarde le joueur qui arrive
    const banniere = new THREE.Mesh(new THREE.BoxGeometry(6.8, 1, 0.3), [matPoteau, matPoteau, matPoteau, matPoteau, matBanniere, matPoteau]);
    banniere.position.set(0, 4, 0);
    arrivee.add(banniere);
    // Bâtiment EEMI 10 m après le portail, façade (+Z) tournée vers le joueur
    const batiment = new THREE.Mesh(new THREE.BoxGeometry(12, 9, 5), matsBatiment);
    batiment.position.set(0, 4.5, -10);
    batiment.castShadow = batiment.receiveShadow = true;
    arrivee.add(batiment);
    groupe.add(arrivee);

    arrivee.updateMatrixWorld(true);
    const posBat = batiment.getWorldPosition(new THREE.Vector3());
    const corpsBat = new CANNON.Body({ mass: 0, material: solMat, shape: new CANNON.Box(new CANNON.Vec3(6, 4.5, 2.5)) });
    corpsBat.position.set(posBat.x, posBat.y, posBat.z);
    corpsBat.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angle);
    ajouterCorps(corpsBat);
  }

  // ---------------- DÉCOR : Lyon en contrebas + univers dev/coding (une seule fois) ----------------
  creerLyon(scene);
  const universCode = creerUniversCode(scene);

  // ---------------- Chargement d'un niveau ----------------
  let niveauActuel = null;

  function demonter() {
    if (!groupe) return;
    groupe.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    scene.remove(groupe);
    for (const b of corpsParcours) world.removeBody(b);
    corpsParcours = [];
    groupe = null;
  }

  /** Démonte le parcours actuel et construit celui du niveau demandé (voir niveaux.js). */
  function charger(numero) {
    demonter();
    niveauActuel = trouverNiveau(numero);
    groupe = new THREE.Group();
    scene.add(groupe);
    niveauActuel.construire({ slab, dalle, mur, bosse });
    construireArrivee(niveauActuel.arrivee);
  }

  charger(1);

  return {
    charger,
    get numero() { return niveauActuel.numero; },
    get nom() { return niveauActuel.nom; },
    get depart() { return niveauActuel.depart; },
    get capDepart() { return niveauActuel.capDepart; },
    get vue() { return niveauActuel.vue; },
    get bonus() { return niveauActuel.bonus; },
    yChute: -8,            // en dessous : on a chuté
    /** Animation du décor (code qui flotte, particules), appelée à chaque image. */
    animer(t, dt) { universCode.animer(t, dt); },
    /** Vrai quand la boule passe sous le portail (calcul dans le repère de l'arrivée). */
    estArrive(p) {
      const { x, y, z, angle } = niveauActuel.arrivee;
      const dx = p.x - x, dz = p.z - z;
      const avant = -dx * Math.sin(angle) - dz * Math.cos(angle); // distance parcourue après le portail
      const cote = dx * Math.cos(angle) - dz * Math.sin(angle);
      return avant > -0.5 && avant < 1.5 && Math.abs(cote) < 3 && p.y > y - 0.5;
    },
  };
}
