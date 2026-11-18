// =====================================================================
//  DÉCOR DE LYON (tout en bas, sous le parcours)
//  - la colline de Fourvière et sa basilique (le lieu emblématique)
//  - la tour métallique de Fourvière
//  - la Saône et le Rhône avec leurs ponts, la presqu'île
//  - le Vieux Lyon (façades ocre/rose, toits de tuiles), la place Bellecour
//  - la tour Part-Dieu « le Crayon » de l'autre côté du Rhône
//  Le parcours est au-dessus de la presqu'île (x de -5 à 50, z de 6 à -65).
// =====================================================================
import * as THREE from 'three';

export const Y_VILLE = -60; // niveau du sol de la ville

// Générateur pseudo-aléatoire stable (le décor est identique à chaque chargement)
function aleatoire(graine) {
  return () => { graine = (graine * 16807) % 2147483647; return (graine - 1) / 2147483646; };
}

function canvasTexture(l, h, dessiner) {
  const c = document.createElement('canvas');
  c.width = l; c.height = h;
  dessiner(c.getContext('2d'), l, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}

// Façade d'immeuble lyonnais : fenêtres hautes avec volets
const textureFacade = () => canvasTexture(128, 128, (ctx) => {
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const x = 10 + i * 30, y = 8 + j * 31;
    ctx.fillStyle = '#5a6a80'; ctx.fillRect(x + 4, y, 12, 20);
    ctx.fillStyle = 'rgba(120,150,110,0.55)'; ctx.fillRect(x, y, 4, 20); ctx.fillRect(x + 16, y, 4, 20);
  }
});

// Façade moderne (quartier Part-Dieu) : bandes vitrées
const textureVitree = () => canvasTexture(64, 128, (ctx) => {
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 64, 128);
  ctx.fillStyle = '#6f86a8';
  for (let j = 0; j < 8; j++) ctx.fillRect(0, 6 + j * 16, 64, 9);
});

// Façade de la basilique : arcades et rosace
const textureBasilique = () => canvasTexture(256, 128, (ctx) => {
  ctx.fillStyle = '#f3eee2'; ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#8c8a86';
  for (let i = 0; i < 7; i++) {
    const x = 14 + i * 34;
    ctx.beginPath(); ctx.arc(x + 9, 50, 9, Math.PI, 0); ctx.fillRect(x, 50, 18, 34); ctx.fill();
  }
  ctx.fillStyle = '#c9c2b0'; ctx.fillRect(0, 100, 256, 6); ctx.fillRect(0, 18, 256, 4);
});

/**
 * Immeubles en « instances » : des centaines de bâtiments pour un seul
 * appel de dessin (indispensable pour que ça reste fluide sur téléphone).
 */
function ajouterImmeubles(scene, liste, texture) {
  if (!liste.length) return;
  const corps = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ map: texture }),
    liste.length,
  );
  const avecToit = liste.filter((b) => b.toit);
  const toitGeo = new THREE.ConeGeometry(0.71, 1, 4);
  toitGeo.rotateY(Math.PI / 4); // pyramide à base carrée = toit à quatre pans
  const toits = new THREE.InstancedMesh(
    toitGeo,
    new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
    Math.max(1, avecToit.length),
  );
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const couleur = new THREE.Color();
  let iToit = 0;
  liste.forEach((b, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.angle || 0);
    m.compose(p.set(b.x, Y_VILLE + b.h / 2, b.z), q, s.set(b.l, b.h, b.p));
    corps.setMatrixAt(i, m);
    corps.setColorAt(i, couleur.setHex(b.couleur));
    if (b.toit) {
      const ht = Math.min(b.l, b.p) * 0.35;
      m.compose(p.set(b.x, Y_VILLE + b.h + ht / 2, b.z), q, s.set(b.l, ht, b.p));
      toits.setMatrixAt(iToit, m);
      toits.setColorAt(iToit, couleur.setHex(b.couleurToit));
      iToit++;
    }
  });
  toits.count = iToit;
  scene.add(corps);
  if (iToit > 0) scene.add(toits);
}

export function creerLyon(scene) {
  const rnd = aleatoire(69); // 69 : le Rhône !
  const choisir = (tab) => tab[Math.floor(rnd() * tab.length)];

  // ---------------- Sol, fleuves, ponts ----------------
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), new THREE.MeshStandardMaterial({ color: 0xc9bfa8 }));
  sol.rotation.x = -Math.PI / 2;
  sol.position.set(20, Y_VILLE, -40);
  scene.add(sol);

  const fleuves = [
    { nom: 'Saône', x: -25, largeur: 14, couleur: 0x4f8a8b },
    { nom: 'Rhône', x: 70, largeur: 22, couleur: 0x3f7fbf },
  ];
  const matPont = new THREE.MeshStandardMaterial({ color: 0xd8cfbd });
  for (const f of fleuves) {
    const eau = new THREE.Mesh(
      new THREE.PlaneGeometry(f.largeur, 700),
      new THREE.MeshStandardMaterial({ color: f.couleur, roughness: 0.15, metalness: 0.2 }),
    );
    eau.rotation.x = -Math.PI / 2;
    eau.position.set(f.x, Y_VILLE + 0.1, -40);
    scene.add(eau);
    for (const z of [-200, -150, -95, -35, 25, 85]) {
      const pont = new THREE.Mesh(new THREE.BoxGeometry(f.largeur + 8, 1.2, 4), matPont);
      pont.position.set(f.x, Y_VILLE + 1.2, z + (f.x > 0 ? 18 : 0));
      scene.add(pont);
    }
  }

  // ---------------- Colline de Fourvière ----------------
  const FX = -75, FZ = -120, R_COLLINE = 42, H_COLLINE = 40;
  const sommet = Y_VILLE + H_COLLINE; // -20
  const colline = new THREE.Mesh(
    new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x6e9a55, roughness: 1 }),
  );
  colline.scale.set(R_COLLINE, H_COLLINE, R_COLLINE);
  colline.position.set(FX, Y_VILLE, FZ);
  scene.add(colline);
  const esplanade = new THREE.Mesh(new THREE.CylinderGeometry(17, 19, 4, 24), new THREE.MeshStandardMaterial({ color: 0xd9d1bf }));
  esplanade.position.set(FX, sommet - 2, FZ);
  scene.add(esplanade);

  // Arbres sur la colline (cônes) : position sur la surface de la demi-sphère
  const arbres = new THREE.InstancedMesh(
    new THREE.ConeGeometry(1.6, 5, 6),
    new THREE.MeshStandardMaterial({ color: 0x3f6b35, flatShading: true }),
    120,
  );
  const m = new THREE.Matrix4();
  for (let i = 0; i < 120; i++) {
    const a = rnd() * Math.PI * 2, r = 19 + rnd() * 21;
    const y = Y_VILLE + H_COLLINE * Math.sqrt(Math.max(0, 1 - (r / R_COLLINE) ** 2));
    const ech = 0.7 + rnd() * 0.7;
    m.makeScale(ech, ech, ech).setPosition(FX + Math.cos(a) * r, y + 2 * ech, FZ + Math.sin(a) * r);
    arbres.setMatrixAt(i, m);
  }
  scene.add(arbres);

  // ---------------- Basilique Notre-Dame de Fourvière ----------------
  const basilique = new THREE.Group();
  const pierre = new THREE.MeshStandardMaterial({ color: 0xf3eee2, roughness: 0.7 });
  const facadeTex = textureBasilique();
  const matFacade = new THREE.MeshStandardMaterial({ map: facadeTex, roughness: 0.7 });
  // Nef (longue, orientée vers la ville à l'est) : façades latérales avec arcades
  const nef = new THREE.Mesh(new THREE.BoxGeometry(30, 13, 14), [pierre, matFacade, pierre, pierre, matFacade, matFacade]);
  nef.position.y = 6.5;
  basilique.add(nef);
  // Toit légèrement en pente
  const toitNef = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.5, 30, 3), new THREE.MeshStandardMaterial({ color: 0x9aa1a6, flatShading: true }));
  toitNef.rotation.z = Math.PI / 2;
  toitNef.scale.set(1, 1, 0.35);
  toitNef.position.y = 13 + 1;
  basilique.add(toitNef);
  // Abside (au fond, côté ouest)
  const abside = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 12, 20, 1, false, Math.PI, Math.PI), pierre);
  abside.position.set(-15, 6, 0);
  basilique.add(abside);
  // Les quatre tours octogonales aux angles (le « éléphant renversé » des Lyonnais)
  for (const tx of [-13, 13]) for (const tz of [-6.8, 6.8]) {
    const tour = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 23, 8), pierre);
    tour.position.set(tx, 11.5, tz);
    const couronne = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 1.4, 8), pierre);
    couronne.position.set(tx, 23.6, tz);
    basilique.add(tour, couronne);
  }
  // Portique d'entrée (côté ville)
  const portique = new THREE.Mesh(new THREE.BoxGeometry(3, 9, 14), pierre);
  portique.position.set(16.5, 4.5, 0);
  const fronton = new THREE.Mesh(new THREE.CylinderGeometry(7.4, 7.4, 3, 3), pierre);
  fronton.rotation.set(0, 0, 0); fronton.rotation.x = Math.PI / 2; fronton.rotation.z = Math.PI / 2;
  fronton.scale.set(1, 1, 0.5);
  fronton.position.set(16.5, 10.2, 0);
  basilique.add(portique, fronton);
  // Chapelle et sa statue dorée de la Vierge (celle des illuminations du 8 décembre)
  const chapelle = new THREE.Mesh(new THREE.BoxGeometry(4, 16, 4), pierre);
  chapelle.position.set(4, 8, -12);
  const or = new THREE.MeshStandardMaterial({ color: 0xe8b62c, metalness: 0.8, roughness: 0.3, emissive: 0x4a3400 });
  const statue = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.4, 10), or);
  statue.position.set(4, 17.7, -12);
  const tete = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), or);
  tete.position.set(4, 19.6, -12);
  basilique.add(chapelle, statue, tete);
  basilique.position.set(FX, sommet, FZ);
  basilique.traverse((o) => { o.castShadow = false; });
  scene.add(basilique);

  // Tour métallique de Fourvière (la petite tour Eiffel lyonnaise)
  const metal = new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 0.2, roughness: 0.6 });
  const tourMetal = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 3.2, 48, 4, 8), metal);
  tourMetal.position.set(FX + 22, sommet + 22, FZ - 14);
  tourMetal.rotation.y = Math.PI / 4;
  const treillis = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 4.3, 48, 4, 10),
    new THREE.MeshBasicMaterial({ color: 0x6b7078, wireframe: true }),
  );
  treillis.position.copy(tourMetal.position);
  treillis.rotation.y = Math.PI / 4;
  const antenne = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 10, 4), metal);
  antenne.position.set(FX + 22, sommet + 51, FZ - 14);
  scene.add(tourMetal, treillis, antenne);

  // ---------------- Place Bellecour (grande place rouge) + statue ----------------
  const bellecour = new THREE.Mesh(new THREE.PlaneGeometry(30, 20), new THREE.MeshStandardMaterial({ color: 0xc8714f }));
  bellecour.rotation.x = -Math.PI / 2;
  bellecour.position.set(30, Y_VILLE + 0.15, 0);
  const socle = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 3), pierre);
  socle.position.set(30, Y_VILLE + 1.5, 0);
  const cavalier = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 2.6), new THREE.MeshStandardMaterial({ color: 0x3d4a3f, metalness: 0.5 }));
  cavalier.position.set(30, Y_VILLE + 4.1, 0);
  scene.add(bellecour, socle, cavalier);

  // ---------------- La tour Part-Dieu « le Crayon » ----------------
  const crayonTex = canvasTexture(64, 256, (ctx) => {
    ctx.fillStyle = '#c9967a'; ctx.fillRect(0, 0, 64, 256);
    ctx.fillStyle = '#8a6553';
    for (let j = 0; j < 32; j++) ctx.fillRect(0, j * 8 + 2, 64, 3);
  });
  const crayon = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 85, 24), new THREE.MeshStandardMaterial({ map: crayonTex }));
  crayon.position.set(120, Y_VILLE + 42.5, -85);
  const mine = new THREE.Mesh(new THREE.ConeGeometry(8.3, 16, 4), new THREE.MeshStandardMaterial({ color: 0x6f4c3e, flatShading: true }));
  mine.position.set(120, Y_VILLE + 85 + 8, -85);
  scene.add(crayon, mine);

  // ---------------- Quartiers ----------------
  const ocres = [0xf0c27b, 0xe39b6b, 0xf5d6a8, 0xd9826a, 0xf2b38f, 0xe8c9a0, 0xf4a582];
  const tuiles = [0xb5532f, 0xa8482a, 0xc0653b];
  const anciens = [];
  const modernes = [];
  const dansColline = (x, z) => Math.hypot(x - FX, z - FZ) < R_COLLINE - 2;

  // Vieux Lyon : entre la Saône et la colline
  for (let z = -230; z < 140; z += 9) {
    for (const x of [-38, -47]) {
      if (dansColline(x, z)) continue;
      anciens.push({ x: x + (rnd() - 0.5) * 2, z, l: 8, p: 8, h: 10 + rnd() * 8, couleur: choisir(ocres), toit: true, couleurToit: choisir(tuiles) });
    }
  }
  // Presqu'île : îlots entre Saône et Rhône
  for (let z = -230; z < 140; z += 13) {
    for (let x = -10; x < 60; x += 13) {
      if (x > 14 && x < 46 && z > -12 && z < 12) continue; // place Bellecour
      if (rnd() < 0.12) continue; // quelques cours et squares
      anciens.push({
        x: x + (rnd() - 0.5) * 2, z: z + (rnd() - 0.5) * 2, l: 9 + rnd() * 2, p: 9 + rnd() * 2,
        h: 12 + rnd() * 10, couleur: choisir(ocres), toit: rnd() < 0.7, couleurToit: choisir(tuiles),
      });
    }
  }
  // Rive gauche du Rhône : quartier Part-Dieu, plus moderne et plus haut
  for (let z = -230; z < 140; z += 15) {
    for (let x = 88; x < 200; x += 15) {
      if (Math.hypot(x - 120, z + 85) < 14) continue; // le Crayon
      if (rnd() < 0.15) continue;
      modernes.push({
        x: x + (rnd() - 0.5) * 3, z, l: 10 + rnd() * 3, p: 10 + rnd() * 3, h: 14 + rnd() * 26,
        couleur: choisir([0xe7e9ee, 0xc9d3df, 0xb7c4d6, 0xdcd6cc]), toit: false,
      });
    }
  }
  // Ouest de Fourvière : quelques maisons
  for (let i = 0; i < 40; i++) {
    const x = -125 - rnd() * 60, z = -230 + rnd() * 360;
    if (dansColline(x, z)) continue;
    anciens.push({ x, z, l: 7, p: 7, h: 7 + rnd() * 5, couleur: choisir(ocres), toit: true, couleurToit: choisir(tuiles), angle: rnd() });
  }

  ajouterImmeubles(scene, anciens, textureFacade());
  ajouterImmeubles(scene, modernes, textureVitree());
}
