from flask import Blueprint, g, jsonify, request

import config
import ratelimit
from routes.util import corpo_json
from services.auth_service import AuthService

bp = Blueprint("auth", __name__, url_prefix="/api/auth")
servico = AuthService()


def _ip():
    if config.TRUST_PROXY:
        encaminhado = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        if encaminhado:
            return encaminhado
    return request.remote_addr or "?"


@bp.post("/cadastro")
def cadastro():
    ratelimit.limitar(f"cadastro:{_ip()}", 30, 3600)
    d = corpo_json()
    token, usuario = servico.cadastrar(d.get("nome"), d.get("email"), d.get("senha"), d.get("confirmar_senha"), d.get("tema") or "escuro")
    return jsonify({"token": token, "usuario": servico.perfil(usuario.id)}), 201


@bp.post("/login")
def login():
    d = corpo_json()
    chave = f"login:{_ip()}:{str(d.get('email') or '').strip().lower()}"
    ratelimit.limitar(chave, 8, 600)
    token, usuario = servico.entrar(d.get("email"), d.get("senha"), d.get("lembrar"))
    ratelimit.esquecer(chave)
    return jsonify({"token": token, "usuario": servico.perfil(usuario.id)})


@bp.post("/logout")
def logout():
    servico.sair(g.token)
    return "", 204


@bp.get("/eu")
def eu():
    return jsonify({"usuario": servico.perfil(g.usuario_id)})


@bp.post("/esqueci-senha")
def esqueci_senha():
    ratelimit.limitar(f"esqueci:{_ip()}", 6, 900)
    link = servico.solicitar_recuperacao(corpo_json().get("email"))
    resposta = {"mensagem": "Se existir uma conta com esse e-mail, enviamos as instruções para redefinir a senha."}
    if config.DEV_RESET and link:       # só no modo demonstração (sem servidor de e-mail)
        resposta["link_dev"] = link[link.index("#"):]
    return jsonify(resposta)


@bp.post("/redefinir-senha")
def redefinir_senha():
    ratelimit.limitar(f"redefinir:{_ip()}", 10, 900)
    d = corpo_json()
    servico.redefinir_senha(d.get("token"), d.get("senha"), d.get("confirmar_senha"))
    return jsonify({"mensagem": "Senha alterada. Entre com a nova senha."})
