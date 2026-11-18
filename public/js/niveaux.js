// =====================================================================
//  LES NIVEAUX
//  Chaque niveau décrit son parcours avec quelques briques (voir level.js) :
//   - slab(debut, fin, largeur, couleur) : plateforme entre deux points du DESSUS
//     (plate si les deux points ont la même hauteur, sinon rampe)
//   - dalle(x, y, z, largeur, profondeur, couleur) : dalle carrée posée à plat
//   - mur(centre, taille) : rebord / obstacle
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

  // Niveaux 2 et 3 : à venir (copier le bloc du niveau 1 et changer le parcours)
];

export function trouverNiveau(numero) {
  return NIVEAUX.find((n) => n.numero === Number(numero)) || NIVEAUX[0];
}
