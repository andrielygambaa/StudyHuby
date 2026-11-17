from dao.base_dao import BaseDAO


def _padrao(termo):
    """Escapa % e _ para o LIKE tratar o que a pessoa digitou como texto comum."""
    return "%" + termo.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%"


class BuscaDAO(BaseDAO):
    """Pesquisa apenas nos dados do próprio usuário (e no catálogo público de conquistas)."""

    def buscar(self, usuario_id, termo, limite=6):
        p = _padrao(termo)
        dic = lambda linhas: [dict(linha) for linha in linhas]
        return {
            "topicos": dic(self._linhas(
                """SELECT t.id, t.titulo, t.status, m.nome AS materia, m.cor FROM topico t JOIN materia m ON m.id = t.materia_id
                    WHERE t.usuario_id = ? AND (t.titulo LIKE ? ESCAPE '!' OR m.nome LIKE ? ESCAPE '!') ORDER BY t.id DESC LIMIT ?""",
                (usuario_id, p, p, limite))),
            "baralhos": dic(self._linhas(
                """SELECT b.id, b.nome, m.nome AS materia, m.cor FROM baralho b JOIN materia m ON m.id = b.materia_id
                    WHERE b.usuario_id = ? AND (b.nome LIKE ? ESCAPE '!' OR m.nome LIKE ? ESCAPE '!') ORDER BY b.nome LIMIT ?""",
                (usuario_id, p, p, limite))),
            "cartoes": dic(self._linhas(
                """SELECT c.id, c.baralho_id, c.frente, c.verso, b.nome AS baralho FROM cartao c JOIN baralho b ON b.id = c.baralho_id
                    WHERE b.usuario_id = ? AND (c.frente LIKE ? ESCAPE '!' OR c.verso LIKE ? ESCAPE '!') ORDER BY c.id DESC LIMIT ?""",
                (usuario_id, p, p, limite))),
            "materias": dic(self._linhas(
                "SELECT id, nome, cor FROM materia WHERE usuario_id = ? AND nome LIKE ? ESCAPE '!' ORDER BY nome LIMIT ?",
                (usuario_id, p, limite))),
            "conquistas": dic(self._linhas(
                "SELECT id, codigo, nome, descricao FROM conquista WHERE nome LIKE ? ESCAPE '!' OR descricao LIKE ? ESCAPE '!' ORDER BY id LIMIT ?",
                (p, p, limite))),
        }
