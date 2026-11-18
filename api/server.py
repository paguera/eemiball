#!/usr/bin/env python3
"""
Mini serveur API + base de données SQLite pour le classement d'EEMI Ball.
Aucune dépendance externe requise (utilise uniquement la bibliothèque standard Python).
"""
import json
import os
import re
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DB_PATH = os.environ.get("DB_PATH", "/data/scores.db")
PORT = int(os.environ.get("PORT", "3000"))
LIMITE_CLASSEMENT = 5
TAILLE_MAX_REQUETE = 2048  # octets max acceptés en POST

MULT_DIFFICULTE = {
    "facile": 1.0,
    "normal": 1.25,
    "difficile": 1.6,
}


def calculer_score(temps, difficulte="normal", chutes=0):
    mult = MULT_DIFFICULTE.get(difficulte, 1.25)
    base = (12000.0 / (max(1.0, temps) + 6.0)) * mult
    penalite = chutes * 40
    return max(50, int(round(base - penalite)))


def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nom TEXT NOT NULL,
                score INTEGER NOT NULL,
                temps REAL NOT NULL,
                difficulte TEXT NOT NULL DEFAULT 'normal',
                chutes INTEGER NOT NULL DEFAULT 0,
                cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.commit()


def lire_classement(limite=LIMITE_CLASSEMENT):
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        lignes = conn.execute(
            """
            SELECT nom, score, temps, difficulte, chutes, cree_le
            FROM scores
            ORDER BY score DESC, temps ASC
            LIMIT ?
            """,
            (limite,),
        ).fetchall()
        return [dict(r) for r in lignes]


def nettoyer_nom(nom):
    texte = re.sub(r"[\x00-\x1f\x7f]+", "", str(nom or "")).strip()
    return (texte or "Anonyme")[:20]


def enregistrer_score(nom, temps, difficulte="normal", chutes=0):
    nom_propre = nettoyer_nom(nom)
    temps_float = round(float(temps), 2)
    if temps_float < 4.0 or temps_float > 3600.0:
        raise ValueError("Temps de parcours invalide")

    diff_propre = str(difficulte or "normal")
    if diff_propre not in MULT_DIFFICULTE:
        diff_propre = "normal"

    chutes_int = max(0, min(999, int(chutes or 0)))
    score_int = calculer_score(temps_float, diff_propre, chutes_int)

    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            INSERT INTO scores (nom, score, temps, difficulte, chutes)
            VALUES (?, ?, ?, ?, ?)
            """,
            (nom_propre, score_int, temps_float, diff_propre, chutes_int),
        )
        conn.commit()
    return lire_classement()


class Handler(BaseHTTPRequestHandler):
    def _envoyer_json(self, code, donnees):
        corps = json.dumps(donnees, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(corps)))
        self.end_headers()
        self.wfile.write(corps)

    def do_GET(self):
        if self.path.startswith("/api/scores"):
            try:
                self._envoyer_json(200, lire_classement())
            except Exception:
                self._envoyer_json(500, {"erreur": "Erreur serveur"})
        else:
            self._envoyer_json(404, {"erreur": "Introuvable"})

    def do_POST(self):
        if self.path.startswith("/api/scores"):
            try:
                longueur = int(self.headers.get("Content-Length", "0"))
                if longueur <= 0 or longueur > TAILLE_MAX_REQUETE:
                    self._envoyer_json(413, {"erreur": "Requête trop volumineuse"})
                    return
                brut = self.rfile.read(longueur).decode("utf-8")
                data = json.loads(brut) if brut else {}
                classement = enregistrer_score(
                    nom=data.get("nom"),
                    temps=data.get("temps", 0),
                    difficulte=data.get("difficulte", "normal"),
                    chutes=data.get("chutes", 0),
                )
                self._envoyer_json(201, classement)
            except Exception:
                self._envoyer_json(400, {"erreur": "Données invalides"})
        else:
            self._envoyer_json(404, {"erreur": "Introuvable"})

    def log_message(self, fmt, *args):
        return


if __name__ == "__main__":
    init_db()
    serveur = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"API scores SQLite démarrée sur le port {PORT} ({DB_PATH})", flush=True)
    serveur.serve_forever()
