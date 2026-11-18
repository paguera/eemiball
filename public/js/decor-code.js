// =====================================================================
//  UNIVERS DEV / CODING
//  - fenêtres d'éditeur de code qui flottent dans le ciel (coloration syntaxique)
//  - grands symboles { } </> ; qui tournent sur eux-mêmes
//  - un terminal au départ qui « lance » le niveau
//  - des particules de données qui montent depuis la ville
//  - un ciel dégradé coucher de soleil
//  Pour ajouter un bout de code dans le ciel : ajoute une entrée dans SNIPPETS.
// =====================================================================
import * as THREE from 'three';

// Couleurs façon thème « One Dark » (VS Code)
const C = {
  fond: 'rgba(30, 33, 45, 0.88)', barre: '#16181f', texte: '#abb2bf', motcle: '#c678dd',
  chaine: '#98c379', fonction: '#61afef', nombre: '#d19a66', commentaire: '#7f848e',
  variable: '#e06c75', balise: '#e06c75', numLigne: '#4b5263', terminal: '#3ddc84',
};
const MOTS_CLES = new Set(['const', 'let', 'var', 'if', 'else', 'while', 'for', 'function', 'return', 'try', 'catch', 'import', 'from', 'export', 'new', 'await', 'async', 'true', 'false', 'null']);
const POLICE = '"Cascadia Code", "Fira Code", Consolas, "Courier New", monospace';

// Les bouts de code dans le ciel (position x, y, z autour du parcours)
const SNIPPETS = [
  { pos: [-16, 9, -14], titre: 'lyon.js', lignes: ['const ville = "Lyon";', 'const ecole = "EEMI";', 'let retard = false;'] },
  { pos: [14, 11, -24], titre: 'boucle.js', lignes: ['while (!arrive) {', '  rouler();', '}'] },
  { pos: [-15, 13, -40], titre: 'bonus.js', lignes: ['if (canette) {', '  vitesse *= 1.6;', '}'] },
  { pos: [12, 15, -46], titre: 'todo.js', lignes: ['// TODO : arriver avant 9h', '// FIXME : ne pas tomber'] },
  { pos: [-12, 12, -70], titre: 'fourviere.js', lignes: ['function monter(colline) {', '  return "basilique";', '}'] },
  { pos: [16, 12, -76], titre: 'terminal', terminal: true, lignes: ['$ git commit -m "en route"', '$ git push origin main', '✔ 1 commit envoyé'] },
  { pos: [28, 10, -44], titre: 'app.jsx', lignes: ['<Eemi campus="Lyon">', '  <Etudiant pret />', '</Eemi>'] },
  { pos: [34, 9, -76], titre: 'chute.js', lignes: ['try { rouler(); }', 'catch (chute) {', '  respawn();', '}'] },
  { pos: [52, 11, -48], titre: 'main.js', lignes: ['console.log("Bonjour Lyon !");', 'let canettes = 3;'] },
  { pos: [50, 13, -70], titre: 'erreur.log', terminal: true, lignes: ['404 : cours introuvable', '> retente dans 60 s...'] },
];

const SYMBOLES = [
  { texte: '{ }', pos: [-24, 18, -28], couleur: C.fonction, taille: 9 },
  { texte: '</>', pos: [24, 22, -36], couleur: C.motcle, taille: 10 },
  { texte: ';', pos: [-20, 20, -58], couleur: C.nombre, taille: 9 },
  { texte: '( )', pos: [42, 20, -30], couleur: C.chaine, taille: 8 },
  { texte: '=>', pos: [30, 24, -88], couleur: C.variable, taille: 9 },
  { texte: '#', pos: [62, 18, -60], couleur: C.motcle, taille: 8 },
  { texte: '[ ]', pos: [-8, 26, -95], couleur: C.nombre, taille: 9 },
];

/** Découpe une ligne de code en morceaux colorés (coloration syntaxique simplifiée). */
function colorer(ligne, terminal) {
  if (terminal) {
    if (ligne.startsWith('$')) return [[ '$ ', C.terminal ], [ ligne.slice(2), C.texte ]];
    return [[ ligne, ligne.startsWith('✔') ? C.chaine : C.nombre ]];
  }
  const commentaire = ligne.indexOf('//');
  const morceaux = [];
  const code = commentaire >= 0 ? ligne.slice(0, commentaire) : ligne;
  const re = /("[^"]*")|(<\/?[A-Za-z]+)|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_]\w*\b)|(\s+)|([^\s\w"]+)/g;
  let m;
  while ((m = re.exec(code))) {
    const [t, chaine, balise, nombre, mot] = m;
    let couleur = C.texte;
    if (chaine) couleur = C.chaine;
    else if (balise) couleur = C.balise;
    else if (nombre) couleur = C.nombre;
    else if (mot) {
      if (MOTS_CLES.has(mot)) couleur = C.motcle;
      else if (code[m.index + t.length] === '(') couleur = C.fonction;
      else if (/^[A-Z]/.test(mot)) couleur = C.nombre;
      else couleur = C.variable;
    }
    morceaux.push([t, couleur]);
  }
  if (commentaire >= 0) morceaux.push([ligne.slice(commentaire), C.commentaire]);
  return morceaux;
}

/** Dessine une fenêtre d'éditeur (barre de titre, numéros de ligne, code coloré). */
function textureEditeur(titre, lignes, terminal) {
  const l = 512, hLigne = 42, h = 64 + lignes.length * hLigne + 24;
  const c = document.createElement('canvas');
  c.width = l; c.height = h;
  const ctx = c.getContext('2d');
  const r = 18;
  ctx.fillStyle = terminal ? 'rgba(12, 14, 18, 0.92)' : C.fond;
  ctx.beginPath(); ctx.roundRect(0, 0, l, h, r); ctx.fill();
  ctx.fillStyle = C.barre;
  ctx.beginPath(); ctx.roundRect(0, 0, l, 44, [r, r, 0, 0]); ctx.fill();
  ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => {
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(26 + i * 24, 22, 7, 0, Math.PI * 2); ctx.fill();
  });
  ctx.fillStyle = '#8a91a0';
  ctx.font = `22px ${POLICE}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(titre, l / 2, 23);
  ctx.textAlign = 'left';
  ctx.font = `26px ${POLICE}`;
  lignes.forEach((ligne, i) => {
    const y = 64 + i * hLigne + hLigne / 2;
    let x = 24;
    if (!terminal) {
      ctx.fillStyle = C.numLigne;
      ctx.fillText(String(i + 1), x, y);
      x = 64;
    }
    for (const [texte, couleur] of colorer(ligne, terminal)) {
      ctx.fillStyle = couleur;
      ctx.fillText(texte, x, y);
      x += ctx.measureText(texte).width;
    }
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return { texture: t, rapport: h / l };
}

function textureSymbole(texte, couleur) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.font = `bold 170px ${POLICE}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = couleur; ctx.shadowBlur = 24;
  ctx.fillStyle = couleur;
  ctx.fillText(texte, 128, 136);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Ciel en dégradé (violet en haut → bleu → pêche à l'horizon : coucher de soleil sur Lyon). */
function cielDegrade(scene) {
  const c = document.createElement('canvas');
  c.width = 2; c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#2b2a6b');
  g.addColorStop(0.3, '#5f7fd6');
  g.addColorStop(0.47, '#b9c6f0');
  g.addColorStop(0.5, '#ffd2b3');
  g.addColorStop(0.62, '#e7b9a0');
  g.addColorStop(1, '#8f7f86');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 2, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = t;
  scene.fog = new THREE.Fog(0xf1cdb6, 70, 280);
}

export function creerUniversCode(scene) {
  cielDegrade(scene);
  const animes = [];
  const centre = new THREE.Vector3(20, 4, -35); // les fenêtres regardent vers le parcours

  // --- Fenêtres de code flottantes ---
  for (const s of SNIPPETS) {
    const { texture, rapport } = textureEditeur(s.titre, s.lignes, s.terminal);
    const largeur = 11;
    const panneau = new THREE.Mesh(
      new THREE.PlaneGeometry(largeur, largeur * rapport),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
    );
    panneau.position.set(...s.pos);
    panneau.lookAt(centre.x, s.pos[1], centre.z);
    scene.add(panneau);
    animes.push({ obj: panneau, baseY: s.pos[1], phase: s.pos[0] * 0.3, ampl: 0.6, vitesse: 0.6 });
  }

  // --- Grands symboles qui tournent ---
  for (const s of SYMBOLES) {
    const symbole = new THREE.Mesh(
      new THREE.PlaneGeometry(s.taille, s.taille),
      new THREE.MeshBasicMaterial({ map: textureSymbole(s.texte, s.couleur), transparent: true, side: THREE.DoubleSide, depthWrite: false }),
    );
    symbole.position.set(...s.pos);
    scene.add(symbole);
    animes.push({ obj: symbole, baseY: s.pos[1], phase: s.pos[2] * 0.1, ampl: 1.2, vitesse: 0.4, tourne: 0.35 });
  }

  // --- Terminal au départ : il « lance » le niveau ---
  const { texture: texTerm, rapport: rTerm } = textureEditeur('bash — eemi-ball', [
    '$ node eemi-ball.js',
    '> Chargement de Lyon... OK',
    '> Objectif : rejoindre l\'EEMI',
    '> Penche ton téléphone ▶',
  ], true);
  const terminal = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8 * rTerm),
    new THREE.MeshBasicMaterial({ map: texTerm, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
  );
  terminal.position.set(7.5, 3.6, -5); // à droite : on garde la vue sur Fourvière à gauche
  terminal.rotation.y = -0.45;
  scene.add(terminal);
  animes.push({ obj: terminal, baseY: 3.6, phase: 0, ampl: 0.15, vitesse: 1 });

  // --- Particules de données qui montent depuis la ville ---
  const N = 500;
  const positions = new Float32Array(N * 3);
  const vitesses = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    positions[i * 3] = -60 + Math.random() * 170;
    positions[i * 3 + 1] = -55 + Math.random() * 90;
    positions[i * 3 + 2] = -140 + Math.random() * 170;
    vitesses[i] = 1.5 + Math.random() * 3;
  }
  const geoParticules = new THREE.BufferGeometry();
  geoParticules.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pointTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(160,255,200,0.8)'); g.addColorStop(1, 'rgba(0,255,140,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
  })();
  const particules = new THREE.Points(geoParticules, new THREE.PointsMaterial({
    color: 0x7dffb5, size: 0.9, map: pointTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(particules);

  return {
    /** Appelé à chaque image : fait flotter le code et monter les données. */
    animer(t, dt) {
      for (const a of animes) {
        a.obj.position.y = a.baseY + Math.sin(t * a.vitesse + a.phase) * a.ampl;
        if (a.tourne) a.obj.rotation.y += dt * a.tourne;
      }
      for (let i = 0; i < N; i++) {
        let y = positions[i * 3 + 1] + vitesses[i] * dt;
        if (y > 35) y = -55;
        positions[i * 3 + 1] = y;
      }
      geoParticules.attributes.position.needsUpdate = true;
    },
  };
}
