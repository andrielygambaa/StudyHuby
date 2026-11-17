from flask import Blueprint, g, jsonify, request

from dao.busca_dao import BuscaDAO
from routes.util import corpo_json
from services.auth_service import AuthService

bp = Blueprint("perfil", __name__, url_prefix="/api")
servico = AuthService()
CAMPOS = ("nome", "apelido", "bio", "tema", "tutorial_visto")


@bp.put("/perfil")
def atualizar_perfil():
    d = corpo_json()
    return jsonify({"usuario": servico.atualizar_perfil(g.usuario_id, {c: d[c] for c in CAMPOS if c in d})})


@bp.post("/perfil/email")
def alterar_email():
    d = corpo_json()
    return jsonify({"usuario": servico.alterar_email(g.usuario_id, d.get("novo_email"), d.get("senha"), g.token)})


@bp.post("/perfil/senha")
def alterar_senha():
    d = corpo_json()
    servico.alterar_senha(g.usuario_id, d.get("senha_atual"), d.get("nova_senha"), d.get("confirmar_senha"), g.token)
    return jsonify({"mensagem": "Senha alterada. Os outros aparelhos foram desconectados."})


@bp.put("/perfil/foto")
def salvar_foto():
    return jsonify({"usuario": servico.salvar_foto(g.usuario_id, corpo_json().get("imagem"))})


@bp.delete("/perfil/foto")
def remover_foto():
    return jsonify({"usuario": servico.remover_foto(g.usuario_id)})


@bp.post("/perfil/excluir")
def excluir_conta():
    servico.excluir_conta(g.usuario_id, corpo_json().get("senha"))
    return "", 204


@bp.get("/busca")
def busca():
    termo = (request.args.get("q") or "").strip()[:60]
    if len(termo) < 2:
        return jsonify({"q": termo, "topicos": [], "baralhos": [], "cartoes": [], "materias": [], "conquistas": []})
    return jsonify({"q": termo, **BuscaDAO().buscar(g.usuario_id, termo)})
