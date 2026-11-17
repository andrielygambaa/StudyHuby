"""Proteção da API: login obrigatório, dono de cada recurso e cabeçalhos de segurança/CORS.

A autorização acontece AQUI, no servidor, antes de qualquer rota rodar. Esconder telas no
JavaScript do site não protege nada: quem chama a API direto também passa por esta checagem.
"""

import re
from urllib.parse import urlparse

from flask import g, request

import config
from dao.baralho_dao import BaralhoDAO
from dao.cartao_dao import CartaoDAO
from dao.materia_dao import MateriaDAO
from dao.sessao_dao import SessaoDAO
from dao.topico_dao import TopicoDAO
from erros import NaoAutorizadoErro, NaoEncontradoErro, ProibidoErro
from services.auth_service import AuthService

# Rotas que funcionam sem login
PUBLICAS = {
    ("GET", "/api/health"),
    ("POST", "/api/auth/cadastro"),
    ("POST", "/api/auth/login"),
    ("POST", "/api/auth/esqueci-senha"),
    ("POST", "/api/auth/redefinir-senha"),
}


def _dono(dao_classe):
    return lambda id_: getattr(dao_classe().buscar_por_id(id_), "usuario_id", None)


# (padrão da URL, função que descobre o dono do recurso)
RECURSOS = [
    (re.compile(r"^/api/materias/(\d+)(?:/|$)"), _dono(MateriaDAO)),
    (re.compile(r"^/api/topicos/(\d+)(?:/|$)"), _dono(TopicoDAO)),
    (re.compile(r"^/api/sessoes/(\d+)(?:/|$)"), _dono(SessaoDAO)),
    (re.compile(r"^/api/baralhos/(\d+)(?:/|$)"), _dono(BaralhoDAO)),
    (re.compile(r"^/api/cartoes/(\d+)(?:/|$)"), lambda id_: CartaoDAO().usuario_do_cartao(id_)),
]
_USUARIO = re.compile(r"^/api/usuarios/(\d+)(?:/|$)")


def _token():
    cabecalho = request.headers.get("Authorization", "")
    return cabecalho[7:].strip() if cabecalho.lower().startswith("bearer ") else None


def _autorizar_recurso(caminho, usuario_id):
    m = _USUARIO.match(caminho)
    if m and int(m.group(1)) != usuario_id:
        raise ProibidoErro("Você não tem acesso aos dados de outro usuário.")
    for padrao, dono in RECURSOS:
        m = padrao.match(caminho)
        if m:
            # o recurso de outra pessoa é tratado como inexistente (não revela que ele existe)
            if dono(int(m.group(1))) != usuario_id:
                raise NaoEncontradoErro("Registro não encontrado.")
            return


def _origem_permitida(origem):
    if origem.rstrip("/") in config.CORS_ORIGINS:
        return True
    return urlparse(origem).hostname in ("localhost", "127.0.0.1")     # desenvolvimento local, em qualquer porta


def instalar(app):
    @app.before_request
    def proteger():
        if request.method == "OPTIONS":
            return "", 204                 # pré-verificação do CORS (os cabeçalhos entram em after_request)
        caminho = request.path
        if not caminho.startswith("/api/") or (request.method, caminho) in PUBLICAS:
            return None
        token = _token()
        usuario_id = AuthService().usuario_por_token(token)
        if not usuario_id:
            raise NaoAutorizadoErro("Sessão inválida ou expirada. Entre novamente.")
        g.usuario_id, g.token = usuario_id, token
        _autorizar_recurso(caminho, usuario_id)
        return None

    @app.after_request
    def cabecalhos(resposta):
        origem = request.headers.get("Origin")
        if origem and _origem_permitida(origem):
            resposta.headers["Access-Control-Allow-Origin"] = origem
            resposta.headers["Vary"] = "Origin"
            resposta.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
            resposta.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            resposta.headers["Access-Control-Max-Age"] = "600"
        resposta.headers["X-Content-Type-Options"] = "nosniff"
        resposta.headers["Referrer-Policy"] = "no-referrer"
        if request.path.startswith("/api/"):
            resposta.headers["Cache-Control"] = "no-store"
        return resposta
