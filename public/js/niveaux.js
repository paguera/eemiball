// =====================================================================
//  LES NIVEAUX
//  Chaque niveau décrit son parcours avec quelques briques (voir level.js) :
//   - slab(debut, fin, largeur, couleur) : plateforme entre deux points du DESSUS
//     (plate si les deux points ont la même hauteur, sinon rampe)
//   - dalle(x, y, z, largeur, profondeur, couleur) : dalle carrée posée à plat
//   - mur(centre, taille, couleur) : rebord / obstacle
//   - bosse(x, ySol, z) : bosse à moitié enterrée
//   - virage({ centre, rayon, de, a, yDe, yA, largeur, couleur, rail }) : route en arc de cercle
//   - mobile({ taille, couleur, position(t), angle(t) }) : obstacle qui bouge
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
    nom: 'Atelier code',
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

  // ------------------------------------------------------------------
  {
    numero: 3,
    nom: 'Agence marketing',
    univers: 'marketing',     // décor : pubs, entonnoir de conversion, graphiques, j'aime…
    texture: 'trame',         // plateformes avec une trame d'impression (comme une affiche)
    description: 'Le plus long et le plus dur : entonnoir, virages, pop-ups qui bougent, bras tournant et lacets.',
    depart: { x: 0, y: 1.2, z: 3 },
    capDepart: 0,
    vue: [24, 1, -50],
    construire({ slab, mur, bosse, virage, mobile }) {
      const violet = 0x7b2cbf, orange = 0xff6b35, turquoise = 0x2ec4b6, rouge = 0xe63946, jaune = 0xffbe0b, blanc = 0xf4f4f4;
      slab([0, 0, 6], [0, 0, -5], 8, blanc);               // départ
      mur([0, 0.4, 6.25], [8, 0.8, 0.5], violet);
      // 1. Entonnoir de conversion : la route se resserre (6 m → 4 m → 2,4 m), avec deux bosses
      slab([0, 0, -5], [0, 0, -13], 6, violet);
      bosse(1.6, 0, -8.5, 1, 0.3);
      bosse(-1.6, 0, -11, 1, 0.3);
      slab([0, 0, -13], [0, 0, -19], 4, orange);
      slab([0, 0, -19], [0, 0, -25], 2.4, rouge);
      // 2. Virage serré à droite (rayon 6 m)
      virage({ centre: [6, -25], rayon: 6, de: Math.PI, a: 1.5 * Math.PI, yDe: 0, largeur: 3, couleur: turquoise });
      // 3. Ligne droite et deux pop-ups de pub qui coulissent en travers de la route
      slab([6, 0, -31], [20, 0, -31], 4, blanc);
      mobile({ taille: [0.5, 1.2, 1.7], couleur: rouge, position: (t) => [12.5, 0.6, -31 + Math.sin(t * 1.6) * 1.2] });
      mobile({ taille: [0.5, 1.2, 1.7], couleur: orange, position: (t) => [16.5, 0.6, -31 - Math.sin(t * 1.6) * 1.2] });
      // 4. Virage à gauche qui monte en spirale (+2 m), avec un rebord extérieur
      virage({ centre: [20, -37], rayon: 6, de: Math.PI / 2, a: 0, yDe: 0, yA: 2, largeur: 3, couleur: violet, rail: 'exterieur' });
      // 5. Plateau avec un bras qui tourne : il faut passer au bon moment
      slab([26, 2, -37], [26, 2, -40], 3, orange);
      slab([26, 2, -40], [26, 2, -50], 10, blanc);
      mur([26, 2.5, -45], [1, 1, 1], violet); // axe du bras
      mobile({ taille: [8.6, 0.7, 0.5], couleur: rouge, position: () => [26, 2.4, -45], angle: (t) => t * 0.9 });
      // 6. Lacets qui descendent : virage à droite puis à gauche, étroits (2,6 m)
      virage({ centre: [31, -50], rayon: 5, de: Math.PI, a: 1.5 * Math.PI, yDe: 2, yA: 1.25, largeur: 2.6, couleur: turquoise });
      virage({ centre: [31, -60], rayon: 5, de: Math.PI / 2, a: 0, yDe: 1.25, yA: 0.5, largeur: 2.6, couleur: orange });
      // 7. Ligne droite avec deux pop-ups qui balaient la largeur de la route
      slab([36, 0.5, -60], [36, 0.5, -76], 5, blanc);
      mobile({ taille: [1.8, 1.2, 0.5], couleur: violet, position: (t) => [36 + Math.sin(t * 1.9) * 1.6, 1.1, -65] });
      mobile({ taille: [1.8, 1.2, 0.5], couleur: turquoise, position: (t) => [36 - Math.sin(t * 1.9) * 1.6, 1.1, -71] });
      // 8. Tremplin et trou de 2,5 m
      slab([36, 0.5, -76], [36, 1.1, -78.5], 2.5, jaune);
      slab([36, -0.5, -81], [36, -0.5, -93], 8, blanc);    // réception
      // 9. Dernier virage à gauche (rebord extérieur), puis le parvis de l'EEMI
      virage({ centre: [29, -93], rayon: 7, de: 0, a: -Math.PI / 2, yDe: -0.5, largeur: 4, couleur: violet, rail: 'exterieur' });
      slab([29, -0.5, -100], [5, -0.5, -100], 12, blanc);
    },
    arrivee: { x: 20, y: -0.5, z: -100, angle: Math.PI / 2 },
    bonus: [
      { type: 'canette', pos: [0, 0.8, -9.5] },
      { type: 'canette', pos: [26, 2.8, -38.5] },
      { type: 'canette', pos: [36, 1.3, -62] },
      { type: 'canette', pos: [36, 0.3, -87] },
    ],
  },
];

export function trouverNiveau(numero) {
  return NIVEAUX.find((n) => n.numero === Number(numero)) || NIVEAUX[0];
}
