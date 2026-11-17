import validacao
from models.base import Entidade


class Materia(Entidade):
    _COLUNAS = ("id", "usuario_id", "nome", "cor")

    def __init__(self, nome, cor="#6c757d", id=None, usuario_id=None):
        self._id = id
        self._usuario_id = usuario_id
        self.nome = nome
        self.cor = cor

    @property
    def id(self):
        return self._id

    @property
    def usuario_id(self):
        return self._usuario_id

    @property
    def nome(self):
        return self._nome

    @nome.setter
    def nome(self, valor):
        self._nome = validacao.texto(valor, "nome", maximo=60)

    @property
    def cor(self):
        return self._cor

    @cor.setter
    def cor(self, valor):
        self._cor = validacao.cor_hex(valor)
