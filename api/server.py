#!/usr/bin/env python3
"""
Mini serveur API + base de données SQLite pour le classement d'EEMI Ball.
Aucune dépendance externe requise (utilise uniquement la bibliothèque standard Python).
"""
import json
import os
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DB_PATH = os.environ.get("DB_PATH", "/data/scores.db")
PORT = int(os.environ.get("PORT", "3000"))


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


def lire_classement(limite=10):
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


def enregistrer_score(nom, score, temps, difficulte="normal", chutes=0):
    nom_propre = (str(nom or "").strip() or "Anonyme")[:24]
    score_int = max(0, int(round(float(score))))
    temps_float = round(max(0.0, float(temps)), 2)
    diff_propre = str(difficulte or "normal")
    if diff_propre not in ("facile", "normal", "difficile"):
        diff_propre = "normal"
    chutes_int = max(0, int(chutes or 0))

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
        self.send_header("Content-Length", str(len(corps)))
        self.end_headers()
        self.wfile.write(corps)

    def do_GET(self):
        if self.path.startswith("/api/scores"):
            try:
                self._envoyer_json(200, lire_classement())
            except Exception as e:
                self._envoyer_json(500, {"erreur": str(e)})
        else:
            self._envoyer_json(404, {"erreur": "Introuvable"})

    def do_POST(self):
        if self.path.startswith("/api/scores"):
            try:
                longueur = int(self.headers.get("Content-Length", "0"))
                brut = self.rfile.read(longueur).decode("utf-8")
                data = json.loads(brut) if brut else {}
                classement = enregistrer_score(
                    nom=data.get("nom"),
                    score=data.get("score", 0),
                    temps=data.get("temps", 0),
                    difficulte=data.get("difficulte", "normal"),
                    chutes=data.get("chutes", 0),
                )
                self._envoyer_json(201, classement)
            except Exception as e:
                self._envoyer_json(400, {"erreur": str(e)})
        else:
            self._envoyer_json(404, {"erreur": "Introuvable"})

    def log_message(self, fmt, *args):
        return


if __name__ == "__main__":
    init_db()
    serveur = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"API scores SQLite démarrée sur le port {PORT} ({DB_PATH})", flush=True)
    serveur.serve_forever()
