// =====================================================================
//  UNIVERS MARKETING (niveau 3)
//  - panneaux de pub et pop-ups (« -50 % », « Offre limitée »…)
//  - entonnoir de conversion, graphiques en barres qui grandissent,
//    camembert qui tourne, cartes KPI
//  - cœurs « j'aime » et bulles de notification qui flottent
//  - mégaphone, cible, flèche de croissance, hashtags
//  Tout est rangé dans un groupe que level.js affiche seulement au niveau 3.
// =====================================================================
import * as THREE from 'three';

const POLICE = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const ORANGE = '#ff6b35', VIOLET = '#7b2cbf', TURQUOISE = '#2ec4b6', ROUGE = '#e63946', JAUNE = '#ffbe0b';

function texture(l, h, dessiner) {
  const c = document.createElement('canvas');
  c.width = l; c.height = h;
  dessiner(c.getContext('2d'), l, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function plan(tex, largeur, hauteur) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(largeur, hauteur),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
  );
}

// Fenêtres « pop-up » de pub : [titre, gros texte, bouton, couleur, position]
const POPUPS = [
  ['PROMO', '-50 %', 'J\'EN PROFITE', ROUGE, [-11, 8, -10]],
  ['OFFRE LIMITÉE', 'Plus que 2 h !', 'VITE !', ORANGE, [14, 10, -18]],
  ['NOUVEAU', 'Formation EEMI', 'S\'INSCRIRE', VIOLET, [-12, 11, -40]],
  ['GRATUIT*', 'Tokens offerts', 'RÉCLAMER', TURQUOISE, [40, 10, -48]],
  ['FLASH', 'Soldes 24 h', 'ACHETER', ROUGE, [44, 9, -78]],
  ['PUB', 'Ce gyroscope est génial', 'EN SAVOIR +', JAUNE, [10, 12, -90]],
];

// Cartes KPI : [libellé, valeur, tendance, couleur, position]
const KPI = [
  ['Engagement', '+238 %', '▲', TURQUOISE, [-14, 15, -26]],
  ['Taux de clic', '4,2 %', '▲', ORANGE, [30, 16, -30]],
  ['Abonnés', '12,4 k', '▲', VIOLET, [22, 15, -72]],
  ['Rebond', '61 %', '▼', ROUGE, [52, 12, -96]],
];

const HASHTAGS = [
  ['#EEMI', VIOLET, [-6, 18, -55], 10],
  ['#Lyon', ORANGE, [48, 17, -60], 9],
  ['#Viral', ROUGE, [-14, 13, -86], 10],
  ['#Growth', TURQUOISE, [30, 19, -104], 11],
];

function texturePopup([titre, texte, bouton, couleur]) {
  return texture(400, 300, (ctx, l, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.roundRect(0, 0, l, h, 22); ctx.fill();
    ctx.fillStyle = couleur;
    ctx.beginPath(); ctx.roundRect(0, 0, l, 62, [22, 22, 0, 0]); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = `800 30px ${POLICE}`; ctx.textBaseline = 'middle';
    ctx.fillText(titre, 22, 32);
    ctx.font = `bold 34px ${POLICE}`; ctx.textAlign = 'right'; ctx.fillText('✕', l - 22, 32);
    ctx.textAlign = 'center'; ctx.fillStyle = '#1d1d24';
    ctx.font = `900 ${texte.length > 14 ? 34 : 64}px ${POLICE}`;
    ctx.fillText(texte, l / 2, 140, l - 30);
    ctx.fillStyle = couleur;
    ctx.beginPath(); ctx.roundRect(l / 2 - 120, 206, 240, 62, 31); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = `800 26px ${POLICE}`;
    ctx.fillText(bouton, l / 2, 238);
  });
}

function textureKpi([libelle, valeur, tendance, couleur]) {
  return texture(360, 200, (ctx, l, h) => {
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath(); ctx.roundRect(0, 0, l, h, 20); ctx.fill();
    ctx.fillStyle = '#555'; ctx.font = `600 28px ${POLICE}`; ctx.textBaseline = 'middle';
    ctx.fillText(libelle, 24, 40);
    ctx.fillStyle = '#1d1d24'; ctx.font = `900 64px ${POLICE}`;
    ctx.fillText(valeur, 24, 112);
    ctx.fillStyle = tendance === '▲' ? '#2a9d55' : ROUGE; ctx.font = `bold 40px ${POLICE}`;
    ctx.textAlign = 'right'; ctx.fillText(tendance, l - 24, 112);
    // petite courbe de tendance
    ctx.strokeStyle = couleur; ctx.lineWidth = 6; ctx.lineJoin = 'round';
    ctx.beginPath();
    [0, 0.3, 0.2, 0.55, 0.45, 0.8].forEach((v, i) => {
      const x = 24 + i * 60, y = 182 - (tendance === '▲' ? v : 0.8 - v) * 30;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.stroke();
  });
}

function textureTexte(texte, couleur) {
  return texture(512, 192, (ctx, l, h) => {
    ctx.font = `900 120px ${POLICE}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 12; ctx.strokeStyle = '#ffffff';
    ctx.strokeText(texte, l / 2, h / 2, l - 20);
    ctx.fillStyle = couleur;
    ctx.fillText(texte, l / 2, h / 2, l - 20);
  });
}

/** Panneau d'accueil (comme le terminal du niveau 1) : un brief de campagne. */
function textureBrief() {
  return texture(512, 400, (ctx, l, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.roundRect(0, 0, l, h, 20); ctx.fill();
    ctx.fillStyle = VIOLET;
    ctx.beginPath(); ctx.roundRect(0, 0, l, 64, [20, 20, 0, 0]); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = `800 30px ${POLICE}`; ctx.textBaseline = 'middle';
    ctx.fillText('Brief de campagne', 24, 33);
    const lignes = [['Cible', 'Toi, en retard'], ['Objectif', 'Arriver à l\'EEMI'], ['Budget', '3 canettes'], ['KPI', 'Le chrono']];
    lignes.forEach(([cle, valeur], i) => {
      const y = 110 + i * 72;
      ctx.fillStyle = '#888'; ctx.font = `600 24px ${POLICE}`; ctx.fillText(cle, 24, y);
      ctx.fillStyle = '#1d1d24'; ctx.font = `800 30px ${POLICE}`; ctx.fillText(valeur, 170, y);
      if (i < lignes.length - 1) { ctx.fillStyle = '#eee'; ctx.fillRect(24, y + 34, l - 48, 2); }
    });
  });
}

/** Cœur en relief (les « j'aime »). */
function coeur(couleur = 0xe63946) {
  const s = new THREE.Shape();
  s.moveTo(0, -1.2);
  s.bezierCurveTo(-0.2, -1, -1.6, -0.2, -1.6, 0.5);
  s.bezierCurveTo(-1.6, 1.3, -0.6, 1.6, 0, 0.9);
  s.bezierCurveTo(0.6, 1.6, 1.6, 1.3, 1.6, 0.5);
  s.bezierCurveTo(1.6, -0.2, 0.2, -1, 0, -1.2);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.45, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 2 });
  geo.center();
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.35 }));
}

/** Bulle de notification avec pastille rouge. */
function notification(nombre) {
  const g = new THREE.Group();
  g.add(plan(texture(256, 256, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.roundRect(20, 40, 180, 150, 36); ctx.fill();
    ctx.beginPath(); ctx.moveTo(60, 186); ctx.lineTo(50, 236); ctx.lineTo(110, 186); ctx.fill();
    ctx.fillStyle = '#c9c9d4';
    for (let i = 0; i < 3; i++) ctx.fillRect(48, 76 + i * 34, 124 - i * 30, 14);
    ctx.fillStyle = ROUGE;
    ctx.beginPath(); ctx.arc(196, 54, 46, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = `900 46px ${POLICE}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(nombre, 196, 56);
  }), 4, 4));
  return g;
}

/** Entonnoir de conversion : 4 étages de plus en plus étroits. */
function entonnoir() {
  const g = new THREE.Group();
  const couleurs = [VIOLET, ORANGE, TURQUOISE, ROUGE];
  couleurs.forEach((c, i) => {
    const haut = 4.2 - i * 0.95, bas = haut - 0.85;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(haut, bas, 1.6, 32, 1, true),
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, side: THREE.DoubleSide }));
    m.position.y = -i * 1.75;
    g.add(m);
  });
  return g;
}

/** Graphique en barres qui grandissent en boucle. */
function graphiqueBarres() {
  const g = new THREE.Group();
  const barres = [];
  [ORANGE, VIOLET, TURQUOISE, JAUNE, ROUGE].forEach((c, i) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1, 1.4), new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }));
    b.geometry.translate(0, 0.5, 0);
    b.position.x = (i - 2) * 1.9;
    g.add(b);
    barres.push(b);
  });
  const socle = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.2, 2), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  g.add(socle);
  return { g, barres };
}

/** Camembert (diagramme circulaire) qui tourne. */
function camembert() {
  const g = new THREE.Group();
  const parts = [[0.42, VIOLET], [0.26, ORANGE], [0.18, TURQUOISE], [0.14, JAUNE]];
  let debut = 0;
  for (const [part, c] of parts) {
    const geo = new THREE.CylinderGeometry(4, 4, 1.2, 40, 1, false, debut * Math.PI * 2, part * Math.PI * 2);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }));
    if (part === 0.14) m.position.set(Math.sin((debut + part / 2) * Math.PI * 2) * 0.6, 0, Math.cos((debut + part / 2) * Math.PI * 2) * 0.6); // part détachée
    g.add(m);
    debut += part;
  }
  return g;
}

/** Mégaphone. */
function megaphone() {
  const g = new THREE.Group();
  const pavillon = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 0.7, 4, 24, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xff6b35, roughness: 0.5, side: THREE.DoubleSide }));
  pavillon.rotation.z = -Math.PI / 2;
  const poignee = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.5), new THREE.MeshStandardMaterial({ color: 0x1d1d24 }));
  poignee.position.set(-1.2, -1, 0);
  const arriere = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1, 20), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  arriere.rotation.z = Math.PI / 2;
  arriere.position.x = -2.3;
  g.add(pavillon, poignee, arriere);
  return g;
}

/** Cible (le « public cible »). */
function cible() {
  const g = new THREE.Group();
  [[3, ROUGE], [2.3, '#ffffff'], [1.6, ROUGE], [0.9, '#ffffff'], [0.4, ROUGE]].forEach(([r, c], i) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.3, 40), new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }));
    m.rotation.x = Math.PI / 2;
    m.position.z = i * 0.05;
    g.add(m);
  });
  const fleche = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4, 8), new THREE.MeshStandardMaterial({ color: 0x1d1d24 }));
  fleche.rotation.x = Math.PI / 2.4;
  fleche.position.set(0.3, 0.3, 1.8);
  g.add(fleche);
  return g;
}

export function creerUniversMarketing(scene) {
  const groupe = new THREE.Group();
  groupe.visible = false;
  scene.add(groupe);
  const animes = [];
  const versJoueur = (obj, [x, y, z]) => obj.lookAt(x * 0.3 + 10, y, z + 30);
  const flotter = (obj, pos, ampl = 0.6, vitesse = 0.6, tourne = 0) =>
    animes.push({ obj, baseY: pos[1], phase: pos[0] * 0.2 + pos[2] * 0.1, ampl, vitesse, tourne });

  for (const p of POPUPS) {
    const m = plan(texturePopup(p), 6, 4.5);
    m.position.set(...p[4]); versJoueur(m, p[4]);
    groupe.add(m); flotter(m, p[4]);
  }
  for (const k of KPI) {
    const m = plan(textureKpi(k), 6.3, 3.5);
    m.position.set(...k[4]); versJoueur(m, k[4]);
    groupe.add(m); flotter(m, k[4], 0.5, 0.5);
  }
  for (const [texte, couleur, pos, taille] of HASHTAGS) {
    const m = plan(textureTexte(texte, couleur), taille, taille * 0.375);
    m.position.set(...pos);
    groupe.add(m); flotter(m, pos, 0.9, 0.45, 0.25);
  }

  // Panneau « Brief de campagne » au départ, à droite
  const brief = plan(textureBrief(), 7, 5.47);
  brief.position.set(7.5, 3.8, -4); brief.rotation.y = -0.45;
  groupe.add(brief); flotter(brief, [7.5, 3.8, -4], 0.15, 1);

  // Cœurs « j'aime »
  for (const pos of [[-8, 9, -20], [18, 13, -40], [-9, 10, -62], [48, 11, -86], [16, 14, -100]]) {
    const c = coeur(); c.position.set(...pos); c.scale.setScalar(1.2);
    groupe.add(c); flotter(c, pos, 1, 0.9, 0.8);
  }
  // Notifications
  for (const [pos, n] of [[[-15, 12, -32], '9+'], [[34, 13, -24], '3'], [[52, 14, -66], '12']]) {
    const nt = notification(n); nt.position.set(...pos); versJoueur(nt, pos);
    groupe.add(nt); flotter(nt, pos, 0.7, 1.1);
  }
  // Entonnoir de conversion
  const ent = entonnoir(); ent.position.set(-17, 16, -48);
  groupe.add(ent); flotter(ent, [-17, 16, -48], 0.6, 0.4, 0.3);
  // Graphique en barres
  const { g: graph, barres } = graphiqueBarres();
  graph.position.set(54, 4, -40); graph.rotation.y = -1.1;
  groupe.add(graph);
  // Camembert
  const cam = camembert(); cam.position.set(-16, 10, -100); cam.rotation.x = 1.1;
  groupe.add(cam);
  // Mégaphone et cible
  const mega = megaphone(); mega.position.set(26, 14, -12); mega.rotation.y = 2.2;
  groupe.add(mega); flotter(mega, [26, 14, -12], 0.8, 0.7);
  const cib = cible(); cib.position.set(58, 12, -100); versJoueur(cib, [58, 12, -100]);
  groupe.add(cib); flotter(cib, [58, 12, -100], 0.5, 0.5);

  return {
    groupe,
    animer(t, dt) {
      for (const a of animes) {
        a.obj.position.y = a.baseY + Math.sin(t * a.vitesse + a.phase) * a.ampl;
        if (a.tourne) a.obj.rotation.y += dt * a.tourne;
      }
      // Les barres grandissent chacune à leur rythme (croissance !)
      barres.forEach((b, i) => { b.scale.y = 2 + i * 1.3 + Math.sin(t * 0.8 + i) * 1.2; });
      cam.rotation.y += dt * 0.4;
    },
  };
}
