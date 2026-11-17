from dao.base_dao import BaseDAO


class ResetSenhaDAO(BaseDAO):
    TABELA = "reset_senha"

    def criar(self, usuario_id, token_hash, expira_em):
        self._executar("DELETE FROM reset_senha WHERE usuario_id = ?", (usuario_id,))   # só o link mais recente vale
        self._executar("INSERT INTO reset_senha (usuario_id, token_hash, expira_em) VALUES (?, ?, ?)",
                       (usuario_id, token_hash, expira_em))

    def buscar_valido(self, token_hash, agora):
        """Linha {id, usuario_id} do token, se não foi usado e não expirou."""
        return self._linha("SELECT id, usuario_id FROM reset_senha WHERE token_hash = ? AND usado = 0 AND expira_em > ?",
                           (token_hash, agora))

    def marcar_usado(self, reset_id):
        self._executar("UPDATE reset_senha SET usado = 1 WHERE id = ?", (reset_id,))
