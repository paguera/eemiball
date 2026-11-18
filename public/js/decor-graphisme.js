// =====================================================================
//  UNIVERS GRAPHISME (niveau 2)
//  - nuancier : grandes cartes de couleur qui flottent (CMJN + couleurs EEMI)
//  - courbes de Bézier en arches au-dessus du parcours, avec points
//    d'ancrage et poignées comme dans un logiciel de dessin vectoriel
//  - roue chromatique, flèches de curseur, mots de graphiste,
//    repères (guides) cyan, panneau « Calques » au départ
//  - confettis CMJN qui tombent doucement
//  Tout est rangé dans un groupe que level.js affiche seulement au niveau 2.
// =====================================================================
import * as THREE from 'three';

const POLICE = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const CYAN = '#00aeef', MAGENTA = '#ec008c', JAUNE = '#fff200', NOIR = '#231f20';

function texture(l, h, dessiner) {
  const c = document.createElement('canvas');
  c.width = l; c.height = h;
  dessiner(c.getContext('2d'), l, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Plan texturé, transparent, visible des deux côtés. */
function plan(tex, largeur, hauteur) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(largeur, hauteur),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
  );
}

// Cartes du nuancier : [couleur, nom, code]
const NUANCES = [
  [CYAN, 'Cyan', 'C100 M0 J0 N0', [-11, 7, -8]],
  [MAGENTA, 'Magenta', 'C0 M100 J0 N0', [11, 9, -16]],
  [JAUNE, 'Jaune', 'C0 M0 J100 N0', [-12, 11, -30]],
  ['#e6007e', 'Rose EEMI', '#E6007E', [12, 8, -40]],
  [NOIR, 'Noir', 'C0 M0 J0 N100', [-10, 9, -64]],
  ['#ffcc00', 'Jaune EEMI', '#FFCC00', [11, 12, -72]],
  ['#5f7fd6', 'Bleu nuit', '#5F7FD6', [26, 10, -78]],
  ['#7dffb5', 'Menthe', '#7DFFB5', [40, 9, -97]],
];

// Mots de graphiste qui flottent : [texte, couleur, position, taille]
const MOTS = [
  ['Aa', MAGENTA, [-16, 15, -20], 9],
  ['Bézier', CYAN, [16, 16, -50], 12],
  ['Kerning', '#ffcc00', [-17, 13, -78], 12],
  ['Ctrl + Z', '#ffffff', [24, 15, -96], 12],
  ['300 dpi', '#7dffb5', [-8, 18, -100], 10],
  ['RVB ≠ CMJN', MAGENTA, [52, 13, -76], 13],
];

function carteNuance([couleur, nom, code]) {
  return texture(256, 360, (ctx, l, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.roundRect(0, 0, l, h, 18); ctx.fill();
    ctx.fillStyle = couleur;
    ctx.beginPath(); ctx.roundRect(14, 14, l - 28, 240, 10); ctx.fill();
    ctx.fillStyle = '#231f20';
    ctx.font = `bold 34px ${POLICE}`;
    ctx.fillText(nom, 18, 298);
    ctx.font = `22px ${POLICE}`;
    ctx.fillStyle = '#555';
    ctx.fillText(code, 18, 334);
  });
}

function textureMot(texte, couleur) {
  return texture(512, 192, (ctx, l, h) => {
    ctx.font = `800 120px ${POLICE}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 10; ctx.strokeStyle = 'rgba(35,31,32,0.85)';
    ctx.strokeText(texte, l / 2, h / 2, l - 20);
    ctx.fillStyle = couleur;
    ctx.fillText(texte, l / 2, h / 2, l - 20);
  });
}

/** Panneau « Calques » au départ, comme dans un logiciel de graphisme. */
function texturePanneauCalques() {
  const calques = [
    ['Boule', MAGENTA, true], ['Parcours', CYAN, true], ['Repères', CYAN, false],
    ['Lyon', '#ffcc00', true], ['EEMI', '#e6007e', true],
  ];
  return texture(512, 420, (ctx, l, h) => {
    ctx.fillStyle = 'rgba(38,38,44,0.94)';
    ctx.beginPath(); ctx.roundRect(0, 0, l, h, 18); ctx.fill();
    ctx.fillStyle = '#1b1b20';
    ctx.beginPath(); ctx.roundRect(0, 0, l, 56, [18, 18, 0, 0]); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = `bold 28px ${POLICE}`; ctx.textBaseline = 'middle';
    ctx.fillText('Calques', 24, 29);
    calques.forEach(([nom, couleur, visible], i) => {
      const y = 70 + i * 68;
      if (i === 0) { ctx.fillStyle = 'rgba(0,174,239,0.25)'; ctx.fillRect(0, y, l, 62); }
      // œil (visible) ou trait (masqué)
      ctx.strokeStyle = visible ? '#ffffff' : '#777'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(44, y + 31, 16, 9, 0, 0, Math.PI * 2); ctx.stroke();
      if (visible) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(44, y + 31, 4, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = couleur; ctx.fillRect(84, y + 14, 34, 34);
      ctx.fillStyle = visible ? '#ffffff' : '#888'; ctx.font = `26px ${POLICE}`;
      ctx.fillText(nom, 136, y + 32);
    });
  });
}

/** Courbe de Bézier épaisse + points d'ancrage carrés + poignées, comme l'outil Plume. */
function courbeBezier(p0, c0, c1, p1, couleur) {
  const g = new THREE.Group();
  const courbe = new THREE.CubicBezierCurve3(...[p0, c0, c1, p1].map((p) => new THREE.Vector3(...p)));
  g.add(new THREE.Mesh(
    new THREE.TubeGeometry(courbe, 64, 0.22, 8, false),
    new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.4, emissive: couleur, emissiveIntensity: 0.15 }),
  ));
  const matAncre = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const matContour = new THREE.MeshBasicMaterial({ color: 0x00aeef });
  const matPoignee = new THREE.LineBasicMaterial({ color: 0x00aeef });
  for (const [ancre, poignee] of [[p0, c0], [p1, c1]]) {
    const contour = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.85, 0.85), matContour);
    const carre = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.9), matAncre);
    contour.position.set(...ancre); carre.position.set(...ancre);
    g.add(contour, carre);
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...ancre), new THREE.Vector3(...poignee)]), matPoignee));
    const rond = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), matContour);
    rond.position.set(...poignee);
    g.add(rond);
  }
  return g;
}

/** Flèche de curseur (comme la souris), en relief. */
function curseur(couleur = 0x231f20) {
  const f = new THREE.Shape();
  f.moveTo(0, 0); f.lineTo(0, -4.2); f.lineTo(1.05, -3.2); f.lineTo(1.9, -5.1);
  f.lineTo(2.6, -4.8); f.lineTo(1.8, -2.95); f.lineTo(3.2, -2.95); f.closePath();
  const geo = new THREE.ExtrudeGeometry(f, { depth: 0.35, bevelEnabled: false });
  geo.center();
  const g = new THREE.Group();
  const contour = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
  contour.scale.set(1.12, 1.08, 0.9);
  const corps = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.5 }));
  corps.position.z = 0.05;
  g.add(contour, corps);
  return g;
}

/** Roue chromatique (dégradé conique) entourée d'un cadre de sélection avec ses poignées. */
function roueChromatique() {
  const tex = texture(256, 256, (ctx, l, h) => {
    const g = ctx.createConicGradient(0, l / 2, h / 2);
    ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(l / 2, h / 2, l / 2 - 2, 0, Math.PI * 2); ctx.fill();
    const blanc = ctx.createRadialGradient(l / 2, h / 2, 0, l / 2, h / 2, l / 2);
    blanc.addColorStop(0, 'rgba(255,255,255,1)'); blanc.addColorStop(0.65, 'rgba(255,255,255,0)');
    ctx.fillStyle = blanc; ctx.beginPath(); ctx.arc(l / 2, h / 2, l / 2 - 2, 0, Math.PI * 2); ctx.fill();
  });
  const groupe = new THREE.Group();
  const roue = plan(tex, 12, 12);
  groupe.add(roue);
  // Cadre de sélection bleu + 8 poignées carrées
  const cadre = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([[-6.8, -6.8], [6.8, -6.8], [6.8, 6.8], [-6.8, 6.8]].map(([x, y]) => new THREE.Vector3(x, y, 0.05))),
    new THREE.LineBasicMaterial({ color: 0x00aeef }),
  );
  groupe.add(cadre);
  const matPoignee = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const x of [-6.8, 0, 6.8]) for (const y of [-6.8, 0, 6.8]) {
    if (x === 0 && y === 0) continue;
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), matPoignee);
    p.position.set(x, y, 0.06);
    groupe.add(p);
  }
  return { groupe, roue };
}

export function creerUniversGraphisme(scene) {
  const groupe = new THREE.Group();
  groupe.visible = false;
  scene.add(groupe);
  const animes = [];
  // Les éléments plats se tournent vers le joueur qui arrive (vers +Z, un peu vers le parcours)
  const versJoueur = (obj, [x, y, z]) => obj.lookAt(x * 0.3, y, z + 30);

  // --- Nuancier ---
  for (const n of NUANCES) {
    const carte = plan(carteNuance(n), 4.2, 5.9);
    carte.position.set(...n[3]);
    versJoueur(carte, n[3]);
    groupe.add(carte);
    animes.push({ obj: carte, baseY: n[3][1], phase: n[3][2] * 0.2, ampl: 0.5, vitesse: 0.7 });
  }

  // --- Mots de graphiste ---
  for (const [texte, couleur, pos, taille] of MOTS) {
    const mot = plan(textureMot(texte, couleur), taille, taille * 0.375);
    mot.position.set(...pos);
    groupe.add(mot);
    animes.push({ obj: mot, baseY: pos[1], phase: pos[0] * 0.1, ampl: 0.9, vitesse: 0.45, tourne: 0.25 });
  }

  // --- Courbes de Bézier en arches au-dessus du parcours ---
  groupe.add(courbeBezier([-7, 4, -26], [-6, 16, -24], [12, 16, -36], [11, 4, -34], 0xec008c));
  groupe.add(courbeBezier([-6, 7, -60], [-4, 18, -66], [6, 18, -70], [6, 7, -76], 0x00aeef));
  groupe.add(courbeBezier([26, 6, -82], [30, 19, -80], [36, 19, -94], [42, 6, -92], 0xfff200));

  // --- Roue chromatique qui tourne lentement ---
  const { groupe: roueGroupe, roue } = roueChromatique();
  roueGroupe.position.set(-19, 13, -48);
  versJoueur(roueGroupe, [-19, 13, -48]);
  groupe.add(roueGroupe);
  animes.push({ obj: roueGroupe, baseY: 13, phase: 0, ampl: 0.6, vitesse: 0.5 });

  // --- Flèches de curseur ---
  for (const [pos, couleur] of [[[14, 13, -24], 0x231f20], [[-14, 10, -88], 0xec008c], [[34, 12, -70], 0x00aeef]]) {
    const c = curseur(couleur);
    c.position.set(...pos);
    c.rotation.z = 0.3;
    groupe.add(c);
    animes.push({ obj: c, baseY: pos[1], phase: pos[2], ampl: 0.8, vitesse: 0.8, tourne: 0.5 });
  }

  // --- Repères (guides) cyan qui traversent le ciel ---
  const matGuide = new THREE.MeshBasicMaterial({ color: 0x00aeef, transparent: true, opacity: 0.55 });
  for (const [x, y] of [[-14, 9], [34, 11]]) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 220), matGuide);
    g.position.set(x, y, -50);
    groupe.add(g);
  }
  for (const z of [-20, -84]) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(160, 0.08, 0.08), matGuide);
    g.position.set(18, 17, z);
    groupe.add(g);
  }

  // --- Panneau « Calques » au départ (à droite, comme le terminal du niveau 1) ---
  const calques = plan(texturePanneauCalques(), 7, 5.74);
  calques.position.set(7.5, 3.8, -4);
  calques.rotation.y = -0.45;
  groupe.add(calques);
  animes.push({ obj: calques, baseY: 3.8, phase: 0, ampl: 0.15, vitesse: 1 });

  // --- Confettis CMJN qui tombent ---
  const N = 450;
  const positions = new Float32Array(N * 3);
  const couleurs = new Float32Array(N * 3);
  const vitesses = new Float32Array(N);
  const palette = [CYAN, MAGENTA, JAUNE, '#ffffff'].map((c) => new THREE.Color(c));
  for (let i = 0; i < N; i++) {
    positions[i * 3] = -40 + Math.random() * 110;
    positions[i * 3 + 1] = -30 + Math.random() * 60;
    positions[i * 3 + 2] = 10 - Math.random() * 120;
    const c = palette[i % palette.length];
    couleurs.set([c.r, c.g, c.b], i * 3);
    vitesses[i] = 0.8 + Math.random() * 1.6;
  }
  const geoConfettis = new THREE.BufferGeometry();
  geoConfettis.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geoConfettis.setAttribute('color', new THREE.BufferAttribute(couleurs, 3));
  const confettis = new THREE.Points(geoConfettis, new THREE.PointsMaterial({ size: 0.35, vertexColors: true }));
  groupe.add(confettis);

  return {
    groupe,
    animer(t, dt) {
      for (const a of animes) {
        a.obj.position.y = a.baseY + Math.sin(t * a.vitesse + a.phase) * a.ampl;
        if (a.tourne) a.obj.rotation.y += dt * a.tourne;
      }
      roue.rotation.z -= dt * 0.25;
      for (let i = 0; i < N; i++) {
        let y = positions[i * 3 + 1] - vitesses[i] * dt;
        if (y < -30) y = 30;
        positions[i * 3 + 1] = y;
      }
      geoConfettis.attributes.position.needsUpdate = true;
    },
  };
}
