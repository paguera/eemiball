// =====================================================================
//  CONTRÔLES : gyroscope (téléphone), clavier (ordinateur), joystick tactile (secours)
//  Résultat : this.tilt = { x: gauche(-1) → droite(+1), y: arrière(-1) → avant(+1) }
// =====================================================================

const borner = (v, a, b) => Math.max(a, Math.min(b, v));

// Petite zone morte : en dessous de 4 % on considère que le téléphone est à plat
function zoneMorte(v, zm = 0.04) {
  const a = Math.abs(v);
  if (a < zm) return 0;
  return Math.sign(v) * (a - zm) / (1 - zm);
}

export class Controls {
  constructor(params) {
    this.params = params;
    this.tilt = { x: 0, y: 0 };      // valeur lissée utilisée par le jeu
    this.cible = { x: 0, y: 0 };     // valeur brute de l'entrée active
    this.mode = 'clavier';           // 'gyro' | 'clavier' | 'tactile'
    this.gyroActif = false;          // vrai dès qu'on reçoit une vraie mesure
    this.brut = { beta: 0, gamma: 0, angle: 0 };
    this.neutre = null;              // position de référence « à plat »
    this.calibrerProchain = true;
    this.touches = new Set();
    this.tactileActif = false;
    this.joy = null;                 // { x0, y0, x, y } pendant un appui

    // --- Clavier ---
    const flechesEtc = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '];
    addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      this.touches.add(k);
      if (flechesEtc.includes(k)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.touches.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.touches.clear());

    // --- Gyroscope ---
    this._onOrient = this._onOrient.bind(this);
    // Si on tourne l'écran (portrait ↔ paysage), on recalibre automatiquement
    if (screen.orientation) screen.orientation.addEventListener('change', () => this.calibrer());
    else addEventListener('orientationchange', () => this.calibrer());
  }

  /** À appeler DANS un clic (obligatoire sur iPhone). Renvoie true si autorisé. */
  async activerGyro() {
    if (!('DeviceOrientationEvent' in window)) return false;
    try {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        const reponse = await DeviceOrientationEvent.requestPermission();
        if (reponse !== 'granted') return false;
      }
    } catch (e) {
      return false;
    }
    window.addEventListener('deviceorientation', this._onOrient);
    return true;
  }

  /** La prochaine mesure du gyroscope deviendra la position « à plat ». */
  calibrer() { this.calibrerProchain = true; }

  angleEcran() {
    let a = (screen.orientation && typeof screen.orientation.angle === 'number')
      ? screen.orientation.angle
      : (window.orientation || 0);
    return ((a % 360) + 360) % 360;
  }

  _onOrient(e) {
    if (e.beta == null || e.gamma == null) return; // ordinateur sans capteur
    this.gyroActif = true;
    this.brut = { beta: e.beta, gamma: e.gamma, angle: this.angleEcran() };
    if (this.calibrerProchain || !this.neutre) {
      this.neutre = { beta: e.beta, gamma: e.gamma };
      this.calibrerProchain = false;
    }
  }

  /** Convertit beta/gamma en inclinaison « écran » selon portrait/paysage. */
  _inclinaisonGyro() {
    const { beta, gamma, angle } = this.brut;
    const db = beta - this.neutre.beta;
    let dg = gamma - this.neutre.gamma;
    if (dg > 90) dg -= 180;     // gamma saute de +90 à -90 : on corrige
    if (dg < -90) dg += 180;

    let droite, avant;
    if (angle === 90)       { droite = db;  avant = dg; }   // paysage (téléphone tourné vers la gauche)
    else if (angle === 270) { droite = -db; avant = -dg; }  // paysage (tourné vers la droite)
    else if (angle === 180) { droite = -dg; avant = db; }   // portrait à l'envers
    else                    { droite = dg;  avant = -db; }  // portrait normal

    const p = this.params;
    const x = borner((droite / p.inclinaisonTel) * p.sensibilite, -1, 1);
    const y = borner((avant / p.inclinaisonTel) * p.sensibilite, -1, 1);
    return { x: zoneMorte(x), y: zoneMorte(y) };
  }

  // ---------- Joystick tactile (secours si pas de gyroscope) ----------
  activerTactile(elJoystick, elBouton) {
    if (this.tactileActif) return;
    this.tactileActif = true;
    const rayon = 60;
    const estUI = (t) => t.closest && t.closest('button, #reglages, .ecran');

    addEventListener('pointerdown', (e) => {
      if (estUI(e.target)) return;
      this.joy = { x0: e.clientX, y0: e.clientY, x: 0, y: 0, id: e.pointerId };
      elJoystick.style.left = e.clientX + 'px';
      elJoystick.style.top = e.clientY + 'px';
      elJoystick.classList.remove('cache');
      elBouton.style.transform = '';
    });
    addEventListener('pointermove', (e) => {
      if (!this.joy || e.pointerId !== this.joy.id) return;
      let dx = e.clientX - this.joy.x0, dy = e.clientY - this.joy.y0;
      const d = Math.hypot(dx, dy);
      if (d > rayon) { dx *= rayon / d; dy *= rayon / d; }
      this.joy.x = dx / rayon;
      this.joy.y = -dy / rayon;
      elBouton.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    const fin = (e) => {
      if (!this.joy || e.pointerId !== this.joy.id) return;
      this.joy = null;
      elJoystick.classList.add('cache');
    };
    addEventListener('pointerup', fin);
    addEventListener('pointercancel', fin);
  }

  /** Appelé à chaque image : choisit l'entrée active et lisse la valeur. */
  update(dt) {
    const t = this.touches;
    const kx = (t.has('arrowright') || t.has('d') ? 1 : 0) - (t.has('arrowleft') || t.has('q') || t.has('a') ? 1 : 0);
    const ky = (t.has('arrowup') || t.has('z') || t.has('w') ? 1 : 0) - (t.has('arrowdown') || t.has('s') ? 1 : 0);

    if (kx || ky) {
      this.mode = 'clavier';
      this.cible = { x: kx, y: ky };
    } else if (this.joy) {
      this.mode = 'tactile';
      this.cible = { x: this.joy.x, y: this.joy.y };
    } else if (this.gyroActif && this.neutre) {
      this.mode = 'gyro';
      this.cible = this._inclinaisonGyro();
    } else {
      this.cible = { x: 0, y: 0 };
    }

    if (this.params.inverserCote) this.cible.x = -this.cible.x;
    if (this.params.inverserAvant) this.cible.y = -this.cible.y;

    // Lissage (filtre passe-bas) : supprime les tremblements du capteur
    const k = 1 - Math.exp(-dt * 12);
    this.tilt.x += (this.cible.x - this.tilt.x) * k;
    this.tilt.y += (this.cible.y - this.tilt.y) * k;
  }
}
