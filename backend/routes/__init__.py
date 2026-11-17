"""Rotas Flask (um Blueprint por módulo)."""

from routes import auth, dashboard, flashcards, gamificacao, materias, perfil, planner, pomodoro, usuarios


def registrar_rotas(app):
    for modulo in (auth, perfil, usuarios, materias, planner, pomodoro, flashcards, gamificacao, dashboard):
        app.register_blueprint(modulo.bp)
