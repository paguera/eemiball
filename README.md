# EEMI Ball : prototype

Fais rouler la boule jusqu'à l'EEMI (Lyon) avant la fin du chrono, en penchant ton téléphone.
Prototype « bac à sable » pour tester le gyroscope et le concept.

- **Rendu** : Three.js (3D), **physique** : cannon-es, chargés depuis un CDN, sans installation
- **Contrôles** : gyroscope (téléphone), flèches ou ZQSD (ordinateur), joystick tactile si le gyroscope est refusé
- **Règles** : 60 s, chute dans le vide = retour au départ, ⚡ canette énergisante = vitesse x1,6 pendant 5 s
- **⟳** recalibre (la position actuelle du téléphone devient « à plat »), **⚙** ouvre les réglages en direct
- Touche **R** sur ordinateur : retour au départ

## 1. Tester sur l'ordinateur

Dans un terminal PowerShell, depuis ce dossier :

```bash
powershell -ExecutionPolicy Bypass -File serve-local.ps1
```

Puis ouvre http://localhost:8080 et joue aux flèches.

## 2. Tester sur iPhone / Android (gyroscope)

Le gyroscope ne fonctionne qu'en **HTTPS**. Le plus simple est un tunnel gratuit Cloudflare.

1. Installe cloudflared (une seule fois) :
   ```bash
   winget install Cloudflare.cloudflared
   ```
2. Laisse `serve-local.ps1` tourner, ouvre un **deuxième** terminal et lance :
   ```bash
   cloudflared tunnel --url http://localhost:8080 --http-host-header localhost:8080
   ```
3. Une adresse du type `https://xxxx.trycloudflare.com` s'affiche : ouvre-la sur le téléphone (ou génère un QR code).
4. Tiens le téléphone comme pour lire, appuie sur **Jouer**, puis sur iPhone **autorise l'accès au mouvement**.

En cas de problème, ouvre ⚙ : la zone en bas affiche les valeurs du capteur (beta/gamma), si la page est bien en HTTPS, etc.
Si la boule part à l'envers, coche « Inverser avant/arrière » ou « Inverser gauche/droite ».
Sur iPhone, si tu as refusé l'accès par erreur, ferme l'onglet Safari et rouvre l'adresse.

## 3. Mettre en ligne (Docker Compose + ton domaine)

Sur un serveur (VPS) avec Docker :

1. Copie ce dossier sur le serveur.
2. Crée un enregistrement DNS **A** de ton domaine (ex. `jeu.mondomaine.fr`) vers l'IP du serveur.
3. Sur le serveur :
   ```bash
   cp .env.example .env
   ```
   puis remplace le domaine dans `.env`.
4. Lance :
   ```bash
   docker compose up -d
   ```

Caddy obtient automatiquement le certificat HTTPS (ports 80 et 443 ouverts).
Pour mettre à jour le jeu : recopie le dossier `public/` (pas besoin de redémarrer).

## Organisation du code (`public/js/`)

| Fichier | Rôle |
|---|---|
| `main.js` | Boucle de jeu, caméra, chrono, écrans |
| `controls.js` | Gyroscope + calibration, clavier, joystick |
| `physics.js` | Physique : on penche la **gravité** au lieu du niveau |
| `level.js` | Le parcours (`slab()` = plateforme entre deux points), bâtiment EEMI, décor |
| `bonuses.js` | Les bonus : ajoute une entrée dans `TYPES_BONUS` pour en créer un |
| `tuning.js` | Les curseurs de réglage |
