from dao.base_dao import BaseDAO


class SessaoLoginDAO(BaseDAO):
    TABELA = "sessao_login"

    def criar(self, usuario_id, token_hash, expira_em):
        self._executar("INSERT INTO sessao_login (usuario_id, token_hash, expira_em) VALUES (?, ?, ?)",
                       (usuario_id, token_hash, expira_em))

    def usuario_da_sessao(self, token_hash, agora):
        """Id do usuário dono do token, se ele ainda não expirou."""
        return self._escalar("SELECT usuario_id FROM sessao_login WHERE token_hash = ? AND expira_em > ?",
                             (token_hash, agora))

    def remover(self, token_hash):
        self._executar("DELETE FROM sessao_login WHERE token_hash = ?", (token_hash,))

    def remover_do_usuario(self, usuario_id, exceto_hash=None):
        if exceto_hash:
            self._executar("DELETE FROM sessao_login WHERE usuario_id = ? AND token_hash <> ?", (usuario_id, exceto_hash))
        else:
            self._executar("DELETE FROM sessao_login WHERE usuario_id = ?", (usuario_id,))

    def limpar_expiradas(self, agora):
        self._executar("DELETE FROM sessao_login WHERE expira_em <= ?", (agora,))
