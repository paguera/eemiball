// =====================================================================
//  LES NIVEAUX
//  Chaque niveau décrit son parcours avec quelques briques (voir level.js) :
//   - slab(debut, fin, largeur, couleur) : plateforme entre deux points du DESSUS
//     (plate si les deux points ont la même hauteur, sinon rampe)
//   - dalle(x, y, z, largeur, profondeur, couleur) : dalle carrée posée à plat
//   - mur(centre, taille, couleur) : rebord / obstacle
//   - bosse(x, ySol, z) : bosse à moitié enterrée
//  Coordonnées : -Z = devant au départ, +X = droite, Y = hauteur.
//  arrivee : position du portail (au sol) et direction dans laquelle on le traverse
//  (même convention que la caméra : 0 = vers -Z, π/2 = vers -X, -π/2 = vers +X).
//  Pour ajouter un niveau : copie un bloc, change le parcours, ajoute-le à NIVEAUX.
// =====================================================================

const bleu = 0x4f8cff, vert = 0x46c37b, jaune = 0xffd447, rose = 0xff5fa2, gris = 0xd8dbe6;

export const NIVEAUX = [
  // ------------------------------------------------------------------
  {
    numero: 1,
    nom: 'Presqu\'île',
    univers: 'code',          // décor : fenêtres de code, terminal, particules
    texture: 'code',          // plateformes quadrillées avec lignes de code
    description: 'Bosses, pont étroit, tremplin et virage jusqu\'à l\'EEMI.',
    depart: { x: 0, y: 1.2, z: 3 },
    capDepart: 0,
    vue: [10, 0, -32], // point que la caméra de l'accueil regarde en tournant
    construire({ slab, mur, bosse }) {
      slab([0, 0, 6], [0, 0, -6], 8, bleu);           // départ
      mur([0, 0.4, 6.25], [8, 0.8, 0.5]);
      slab([0, 0, -6], [0, 0, -18], 5, vert);         // ligne droite à bosses
      bosse(1.2, 0, -9.5); bosse(-1.3, 0, -13); bosse(0.9, 0, -16);
      slab([0, 0, -18], [0, 3, -30], 5, jaune);       // rampe
      slab([0, 3, -30], [0, 3, -35], 7, bleu);        // plateau
      slab([0, 3, -35], [0, 3, -46], 1.8, rose);      // pont étroit
      slab([0, 3, -46], [0, 3.6, -48.5], 2.5, jaune); // tremplin, puis trou de 2 m
      slab([0, 2, -50.5], [0, 2, -62], 9, vert);      // réception
      slab([4.5, 2, -59], [20, 2, -59], 5, bleu);     // virage à droite avec rebords
      mur([13, 2.35, -56.75], [14, 0.7, 0.5]);
      mur([13, 2.35, -61.25], [14, 0.7, 0.5]);
      slab([20, 2, -59], [28, 0.5, -59], 5, jaune);   // descente
      slab([28, 0.5, -59], [49, 0.5, -59], 12, gris); // parvis de l'EEMI
    },
    arrivee: { x: 36, y: 0.5, z: -59, angle: -Math.PI / 2 },
    bonus: [
      { type: 'canette', pos: [-1.5, 0.8, -11] },
      { type: 'canette', pos: [0, 3.8, -40.5] },
      { type: 'canette', pos: [32, 1.3, -61] },
    ],
  },

  // ------------------------------------------------------------------
  {
    numero: 2,
    nom: 'Studio graphisme',
    univers: 'graphisme',     // décor : nuancier, courbes de Bézier, roue chromatique…
    texture: 'millimetre',    // plateformes en papier millimétré
    description: 'Plus long et plus dur : nuancier à sauter, courbe de Bézier, chicanes, grand saut et couloir étroit.',
    depart: { x: 0, y: 1.2, z: 3 },
    capDepart: 0,
    vue: [12, 1, -45],
    construire({ slab, dalle, mur, bosse }) {
      const cyan = 0x00aeef, magenta = 0xec008c, jaune = 0xfff200, noir = 0x4a4550, blanc = 0xf4f4f4;
      slab([0, 0, 6], [0, 0, -5], 8, blanc);              // départ
      mur([0, 0.4, 6.25], [8, 0.8, 0.5], noir);
      // 1. Nuancier : 4 pastilles de couleur séparées de 30 cm, en quinconce
      //    (plus large, la boule pourrait rester coincée dans l'écart sans pouvoir en sortir)
      dalle(0.7, 0, -6.8, 3, 3, cyan);
      dalle(-0.7, 0, -10.1, 3, 3, magenta);
      dalle(0.7, 0, -13.4, 3, 3, jaune);
      dalle(-0.7, 0, -16.7, 3, 3, noir);
      // 2. Courbe de Bézier : un S étroit (3,2 m) avec des dalles aux virages
      dalle(0, 0, -21.5, 5, 6, blanc);
      slab([0, 0, -24], [6, 0, -32], 3.2, cyan);
      dalle(6, 0, -33, 4, 4, blanc);
      slab([6, 0, -33], [0, 0, -41], 3.2, magenta);
      dalle(0, 0, -42, 4, 4, blanc);
      // 3. La règle : une longue rampe étroite (2,2 m) qui monte
      slab([0, 0, -44], [0, 3, -58], 2.2, jaune);
      // 4. Calque : petit plateau
      slab([0, 3, -58], [0, 3, -63], 7, blanc);
      // 5. Outil plume : pont à trois chicanes
      slab([0, 3, -63], [0, 3, -77], 2.6, cyan);
      mur([0.7, 3.35, -66.5], [1.2, 0.7, 0.6], magenta);
      mur([-0.7, 3.35, -70.5], [1.2, 0.7, 0.6], magenta);
      mur([0.7, 3.35, -74.5], [1.2, 0.7, 0.6], magenta);
      // 6. Tremplin et trou de 2,5 m (plus long qu'au niveau 1)
      slab([0, 3, -77], [0, 3.6, -79.5], 2.5, jaune);
      slab([0, 2, -82], [0, 2, -95], 8, blanc);          // réception (longue : on arrive vite)
      mur([0, 2.25, -95.25], [8, 0.5, 0.5], noir);         // butée au bout, pour ne pas filer dans le vide
      // 7. Couloir étroit vers la droite, entre deux rebords
      slab([4, 2, -87], [20, 2, -87], 3.5, magenta);
      mur([13, 2.35, -85.5], [14, 0.7, 0.5], noir);
      mur([13, 2.35, -88.5], [14, 0.7, 0.5], noir);
      // 8. Dégradé : descente avec deux bosses
      slab([20, 2, -87], [32, 0, -87], 5, cyan);
      bosse(24.5, 2 - (2 * 4.5) / 12, -86, 0.9, 0.3);
      bosse(28.5, 2 - (2 * 8.5) / 12, -88, 0.9, 0.3);
      slab([32, 0, -87], [54, 0, -87], 12, blanc);       // parvis de l'EEMI
    },
    arrivee: { x: 40, y: 0, z: -87, angle: -Math.PI / 2 },
    bonus: [
      { type: 'canette', pos: [0.7, 0.8, -13.4] },
      { type: 'canette', pos: [6, 0.8, -33] },
      { type: 'canette', pos: [0, 3.8, -60.5] },
      { type: 'canette', pos: [-2, 2.8, -86] },
    ],
  },

  // Niveau 3 : à venir (copier un bloc et changer le parcours)
];

export function trouverNiveau(numero) {
  return NIVEAUX.find((n) => n.numero === Number(numero)) || NIVEAUX[0];
}
