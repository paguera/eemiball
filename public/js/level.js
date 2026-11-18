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
import { creerUniversGraphisme } from './decor-graphisme.js';
import { creerUniversMarketing } from './decor-marketing.js';
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

// Texture « papier millimétré » (niveau 2, univers graphisme) : 1 carreau = 2 m
function textureMillimetre() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(0, 120, 200, 0.22)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 128; i += 16) {
    ctx.beginPath(); ctx.moveTo(i + 0.5, 0); ctx.lineTo(i + 0.5, 128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i + 0.5); ctx.lineTo(128, i + 0.5); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(0, 90, 170, 0.45)';
  ctx.lineWidth = 5;
  ctx.strokeRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Texture « trame d'impression » (niveau 3, univers marketing) : points comme sur une affiche
function textureTrame() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.13)';
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const r = 1.5 + ((x + y) % 4) * 0.9; // points de tailles variées, effet trame
    ctx.beginPath(); ctx.arc(x * 16 + 8 + (y % 2) * 8, y * 16 + 8, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
  ctx.lineWidth = 5;
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
  const textures = { code: textureGrille(), millimetre: textureMillimetre(), trame: textureTrame() };
  let grille = textures.code; // texture des plateformes du niveau en cours

  // Ce qui appartient au parcours en cours (démonté à chaque changement de niveau)
  let groupe = null;
  let corpsParcours = [];
  let obstacles = []; // obstacles qui bougent (animés à chaque image)
  let lots = new Map(); // boîtes fixes du parcours, regroupées par couleur (voir fusionnerBoites)
  let materiauxParcours = [];
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

  /**
   * Boîte à la fois visible (Three.js) et solide (cannon-es).
   * Pour aller plus vite, la partie visible n'est pas créée tout de suite : elle est
   * mise de côté avec les autres boîtes de la même couleur, puis toutes sont fusionnées
   * en un seul objet à la fin de la construction (voir fusionnerBoites).
   */
  function addBox(centre, taille, quat, couleur) {
    const geo = geometrieBoite(taille);
    geo.applyMatrix4(new THREE.Matrix4().compose(centre, quat, new THREE.Vector3(1, 1, 1)));
    if (!lots.has(couleur)) lots.set(couleur, []);
    lots.get(couleur).push(geo);

    const corps = new CANNON.Body({
      mass: 0,
      material: solMat,
      shape: new CANNON.Box(new CANNON.Vec3(taille[0] / 2, taille[1] / 2, taille[2] / 2)),
    });
    corps.position.set(centre.x, centre.y, centre.z);
    corps.quaternion.set(quat.x, quat.y, quat.z, quat.w);
    ajouterCorps(corps);
  }

  /** Fusionne des géométries de boîtes (mêmes attributs) en une seule. */
  function fusionnerGeometries(geos) {
    const noms = ['position', 'normal', 'uv'];
    const total = geos.reduce((n, g) => n + g.attributes.position.count, 0);
    const nbIndex = geos.reduce((n, g) => n + g.index.count, 0);
    const donnees = noms.map((nom) => new Float32Array(total * geos[0].attributes[nom].itemSize));
    const index = new Uint32Array(nbIndex);
    let sommet = 0, i0 = 0;
    for (const g of geos) {
      noms.forEach((nom, k) => donnees[k].set(g.attributes[nom].array, sommet * g.attributes[nom].itemSize));
      const idx = g.index.array;
      for (let j = 0; j < idx.length; j++) index[i0 + j] = idx[j] + sommet;
      sommet += g.attributes.position.count;
      i0 += idx.length;
      g.dispose();
    }
    const geo = new THREE.BufferGeometry();
    noms.forEach((nom, k) => geo.setAttribute(nom, new THREE.BufferAttribute(donnees[k], geos[0].attributes[nom].itemSize)));
    geo.setIndex(new THREE.BufferAttribute(index, 1));
    geo.computeBoundingSphere();
    return geo;
  }

  /** Une seule forme par couleur : bien moins d'appels de dessin (important sur téléphone). */
  function fusionnerBoites() {
    for (const [couleur, geos] of lots) {
      const mat = new THREE.MeshStandardMaterial({ color: couleur, map: grille, roughness: 0.85 });
      materiauxParcours.push(mat);
      const mesh = new THREE.Mesh(fusionnerGeometries(geos), mat);
      mesh.castShadow = mesh.receiveShadow = true;
      groupe.add(mesh);
    }
    lots = new Map();
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

  /**
   * Virage : une route en arc de cercle, faite de courts tronçons qui se chevauchent.
   * centre : [x, z] du cercle ; de / a : angles de départ et d'arrivée (radians,
   * point = centre + rayon × (cos, sin)) ; la hauteur passe de yDe à yA (virage qui monte).
   * rail : 'exterieur' ou 'interieur' ajoute un rebord du côté choisi.
   */
  function virage({ centre, rayon, de, a, yDe, yA = yDe, largeur, couleur, rail = null, couleurRail = 0xffffff }) {
    const [cx, cz] = centre;
    const n = Math.max(4, Math.ceil(Math.abs(a - de) / (Math.PI / 24))); // un tronçon tous les 7,5°
    const point = (k, r = rayon) => {
      const ang = de + (a - de) * (k / n);
      return [cx + r * Math.cos(ang), yDe + (yA - yDe) * (k / n), cz + r * Math.sin(ang)];
    };
    for (let k = 0; k < n; k++) {
      const p0 = new THREE.Vector3(...point(k)), p1 = new THREE.Vector3(...point(k + 1));
      // On allonge chaque tronçon de 15 cm de chaque côté pour boucher les angles extérieurs.
      // Un tronçon sur deux est 1 cm plus haut : pas de scintillement là où ils se chevauchent.
      const dir = p1.clone().sub(p0).normalize();
      const decal = k % 2 ? 0.01 : 0;
      const debut = p0.clone().addScaledVector(dir, -0.15); debut.y += decal;
      const fin = p1.clone().addScaledVector(dir, 0.15); fin.y += decal;
      slab(debut.toArray(), fin.toArray(), largeur, couleur);
      if (rail) {
        const r = rail === 'exterieur' ? rayon + largeur / 2 - 0.25 : rayon - largeur / 2 + 0.25;
        const q0 = point(k, r), q1 = point(k + 1, r);
        const centreRail = new THREE.Vector3((q0[0] + q1[0]) / 2, (q0[1] + q1[1]) / 2 + 0.35, (q0[2] + q1[2]) / 2);
        const longueur = Math.hypot(q1[0] - q0[0], q1[2] - q0[2]) + 0.3;
        const qRail = new THREE.Quaternion().setFromAxisAngle(HAUT, Math.atan2(q1[0] - q0[0], q1[2] - q0[2]));
        addBox(centreRail, [0.5, 0.7, longueur], qRail, couleurRail);
      }
    }
  }

  /**
   * Obstacle mobile (bloc « pop-up de pub », bras qui tourne…).
   * position(t) renvoie [x, y, z] ; angle(t) (optionnel) la rotation autour de l'axe vertical.
   * C'est un corps « cinématique » : il pousse la boule sans être poussé.
   */
  function mobile({ taille, couleur, position, angle = () => 0, materiau = null }) {
    const mat = materiau || new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.5 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...taille), mat);
    mesh.castShadow = mesh.receiveShadow = true;
    groupe.add(mesh);
    const corps = new CANNON.Body({
      mass: 0, type: CANNON.Body.KINEMATIC, material: solMat,
      shape: new CANNON.Box(new CANNON.Vec3(taille[0] / 2, taille[1] / 2, taille[2] / 2)),
    });
    ajouterCorps(corps);
    const placer = (t) => {
      const p = position(t), p2 = position(t + 0.02);
      corps.position.set(...p);
      corps.velocity.set((p2[0] - p[0]) / 0.02, (p2[1] - p[1]) / 0.02, (p2[2] - p[2]) / 0.02);
      const a = angle(t);
      corps.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), a);
      corps.angularVelocity.set(0, (angle(t + 0.02) - a) / 0.02, 0);
      mesh.position.set(...p);
      mesh.rotation.y = a;
    };
    placer(0);
    obstacles.push(placer);
    return mesh;
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
  // Un univers par niveau : seul celui du niveau en cours est affiché et animé
  const univers = {
    code: creerUniversCode(scene),
    graphisme: creerUniversGraphisme(scene),
    marketing: creerUniversMarketing(scene),
  };
  let universActuel = univers.code;

  // ---------------- Chargement d'un niveau ----------------
  let niveauActuel = null;

  function demonter() {
    if (!groupe) return;
    groupe.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    for (const m of materiauxParcours) m.dispose();
    materiauxParcours = [];
    scene.remove(groupe);
    for (const b of corpsParcours) world.removeBody(b);
    corpsParcours = [];
    obstacles = [];
    groupe = null;
  }

  /** Démonte le parcours actuel et construit celui du niveau demandé (voir niveaux.js). */
  function charger(numero) {
    demonter();
    niveauActuel = trouverNiveau(numero);
    grille = textures[niveauActuel.texture] || textures.code;
    universActuel = univers[niveauActuel.univers] || univers.code;
    for (const u of Object.values(univers)) u.groupe.visible = u === universActuel;
    groupe = new THREE.Group();
    scene.add(groupe);
    niveauActuel.construire({ slab, dalle, mur, bosse, virage, mobile });
    fusionnerBoites();
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
    animer(t, dt) {
      universActuel.animer(t, dt);
      for (const placer of obstacles) placer(t); // obstacles mobiles du niveau
    },
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
