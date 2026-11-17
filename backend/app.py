"""Aplicação Flask do StudyHub (API).

Execução local (a partir da raiz do repositório):
    python backend/app.py

O front-end fica na RAIZ do repositório (index.html, css/, js/, assets/) e é publicado pelo
GitHub Pages. Em desenvolvimento, este servidor também entrega esses arquivos, para tudo
funcionar em um endereço só. Nada de backend/, database/ ou .env é servido.
"""

import mimetypes
import os

from flask import Flask, abort, jsonify, send_from_directory
from werkzeug.exceptions import HTTPException

import auth
from config import FRONTEND_DIR, TIPO_BANCO
from db import Conexao, ErroIntegridade
from erros import ErroApp
from routes import registrar_rotas

# Alguns Windows registram .js como text/plain, o que impede o navegador de carregar os módulos JS
mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("image/svg+xml", ".svg")

# Só estes arquivos e pastas da raiz são públicos
ARQUIVOS_DO_SITE = ("index.html", "404.html", "config.js")
PASTAS_DO_SITE = ("css", "js", "assets")


def criar_app():
    app = Flask(__name__, static_folder=None)
    app.json.ensure_ascii = False            # acentos legíveis no JSON
    app.json.sort_keys = False               # mantém a ordem dos campos
    app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024   # corpo de requisição de no máximo 2 MB

    auth.instalar(app)                       # login obrigatório + dono de cada recurso + CORS

    @app.get("/")
    def pagina_inicial():
        return send_from_directory(FRONTEND_DIR, "index.html")

    @app.get("/<path:caminho>")
    def arquivo_do_site(caminho):
        partes = caminho.split("/")
        # nada de "..", pastas ocultas (.env, .git) ou caminhos fora da lista do site
        if any(p in ("", ".", "..") or p.startswith(".") for p in partes):
            abort(404)
        if caminho in ARQUIVOS_DO_SITE or (partes[0] in PASTAS_DO_SITE and len(partes) > 1):
            return send_from_directory(FRONTEND_DIR, caminho)
        abort(404)

    @app.get("/api/health")
    def health():
        conexao = Conexao()
        try:
            if not conexao.testar():
                return jsonify(status="erro", mensagem="Não foi possível conectar ao banco. Confira se o MySQL está "
                                                       "ligado e os dados do arquivo backend/.env."), 503
            tabelas = conexao.listar_tabelas()
        finally:
            conexao.fechar()
        if not tabelas:
            return jsonify(status="erro", mensagem="O banco não tem tabelas. Rode: python backend/init_db.py"), 503
        return jsonify(status="ok", banco="conectado", tipo=TIPO_BANCO, total_tabelas=len(tabelas))

    registrar_rotas(app)

    # --- Erros sempre em JSON ---------------------------------------------
    @app.errorhandler(ErroApp)
    def erro_de_negocio(erro):
        return jsonify(erro=erro.mensagem), erro.status

    def erro_de_integridade(erro):
        return jsonify(erro="A operação viola uma regra de integridade do banco de dados."), 409

    for classe_de_erro in ErroIntegridade:
        app.register_error_handler(classe_de_erro, erro_de_integridade)

    @app.errorhandler(HTTPException)
    def erro_http(erro):
        return jsonify(erro=erro.description), erro.code

    return app


app = criar_app()

if __name__ == "__main__":
    app.run(host=os.environ.get("HOST", "127.0.0.1"), port=int(os.environ.get("PORT", "5000")),
            debug=os.environ.get("STUDYHUB_DEBUG", "1") == "1")
