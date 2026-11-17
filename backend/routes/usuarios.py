from flask import Blueprint, jsonify

from dao.usuario_dao import UsuarioDAO

bp = Blueprint("usuarios", __name__, url_prefix="/api/usuarios")
dao = UsuarioDAO()


@bp.get("/<int:usuario_id>")
def consultar(usuario_id):
    # o guarda de autenticação (auth.py) já garantiu que usuario_id é o do próprio usuário logado
    return jsonify(dao.exigir(usuario_id).para_dict())
