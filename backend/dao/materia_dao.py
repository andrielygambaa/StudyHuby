from dao.base_dao import BaseDAO
from db import ErroIntegridade
from erros import ConflitoErro, NaoEncontradoErro
from models.materia import Materia


class MateriaDAO(BaseDAO):
    TABELA = "materia"
    MODELO = Materia
    NOME_ENTIDADE = "Matéria"

    def inserir(self, materia):
        try:
            novo_id, _ = self._executar(
                "INSERT INTO materia (usuario_id, nome, cor) VALUES (?, ?, ?)",
                (materia.usuario_id, materia.nome, materia.cor),
            )
        except ErroIntegridade:
            raise ConflitoErro("Você já tem uma matéria com esse nome.")
        return self.exigir(novo_id)

    def atualizar(self, materia):
        try:
            self._executar("UPDATE materia SET nome = ?, cor = ? WHERE id = ?", (materia.nome, materia.cor, materia.id))
        except ErroIntegridade:
            raise ConflitoErro("Você já tem uma matéria com esse nome.")
        return self.exigir(materia.id)

    def excluir(self, id):
        self.exigir(id)
        try:
            self._executar("DELETE FROM materia WHERE id = ?", (id,))
        except ErroIntegridade:
            raise ConflitoErro("A matéria está em uso por tópicos, sessões ou baralhos e não pode ser excluída.")

    def listar_do_usuario(self, usuario_id):
        linhas = self._linhas("SELECT * FROM materia WHERE usuario_id = ? ORDER BY nome", (usuario_id,))
        return [Materia.de_linha(linha) for linha in linhas]

    def exigir_do_usuario(self, materia_id, usuario_id):
        """Devolve a matéria só se ela for do usuário (a de outra pessoa é tratada como inexistente)."""
        materia = self.buscar_por_id(materia_id)
        if materia is None or materia.usuario_id != usuario_id:
            raise NaoEncontradoErro("Matéria não encontrada.")
        return materia
