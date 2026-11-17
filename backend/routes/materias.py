from flask import Blueprint, g, jsonify

from dao.materia_dao import MateriaDAO
from models.materia import Materia
from routes.util import corpo_json

bp = Blueprint("materias", __name__, url_prefix="/api/materias")
dao = MateriaDAO()


@bp.get("")
def listar():
    return jsonify([m.para_dict() for m in dao.listar_do_usuario(g.usuario_id)])


@bp.post("")
def cadastrar():
    dados = corpo_json()
    materia = Materia(nome=dados.get("nome"), cor=dados.get("cor", "#6c757d"), usuario_id=g.usuario_id)
    return jsonify(dao.inserir(materia).para_dict()), 201


@bp.get("/<int:materia_id>")
def consultar(materia_id):
    return jsonify(dao.exigir(materia_id).para_dict())


@bp.put("/<int:materia_id>")
def atualizar(materia_id):
    dados = corpo_json()
    materia = dao.exigir(materia_id)
    if "nome" in dados:
        materia.nome = dados["nome"]
    if "cor" in dados:
        materia.cor = dados["cor"]
    return jsonify(dao.atualizar(materia).para_dict())


@bp.delete("/<int:materia_id>")
def excluir(materia_id):
    dao.excluir(materia_id)
    return "", 204
