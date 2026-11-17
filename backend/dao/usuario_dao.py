from dao.base_dao import BaseDAO
from db import ErroIntegridade
from erros import ConflitoErro
from models.usuario import Usuario


class UsuarioDAO(BaseDAO):
    TABELA = "usuario"
    MODELO = Usuario
    NOME_ENTIDADE = "Usuário"

    def inserir(self, usuario):
        try:
            novo_id, _ = self._executar(
                "INSERT INTO usuario (nome, email, senha_hash, apelido, bio, tema) VALUES (?, ?, ?, ?, ?, ?)",
                (usuario.nome, usuario.email, usuario.senha_hash, usuario.apelido, usuario.bio, usuario.tema),
            )
        except ErroIntegridade:
            raise ConflitoErro("Já existe uma conta com esse e-mail.")
        return self.exigir(novo_id)

    def atualizar_perfil(self, usuario):
        self._executar(
            "UPDATE usuario SET nome = ?, apelido = ?, bio = ?, tema = ?, tutorial_visto = ? WHERE id = ?",
            (usuario.nome, usuario.apelido, usuario.bio, usuario.tema, int(usuario.tutorial_visto), usuario.id),
        )
        return self.exigir(usuario.id)

    def atualizar_email(self, usuario_id, email):
        try:
            self._executar("UPDATE usuario SET email = ? WHERE id = ?", (email, usuario_id))
        except ErroIntegridade:
            raise ConflitoErro("Já existe uma conta com esse e-mail.")

    def atualizar_senha(self, usuario_id, senha_hash):
        self._executar("UPDATE usuario SET senha_hash = ? WHERE id = ?", (senha_hash, usuario_id))

    def atualizar_xp(self, usuario):
        self._executar("UPDATE usuario SET xp_total = ? WHERE id = ?", (usuario.xp_total, usuario.id))

    def buscar_por_email(self, email):
        linha = self._linha("SELECT * FROM usuario WHERE email = ?", (email,))
        return Usuario.de_linha(linha) if linha else None

    def excluir_conta(self, usuario_id):
        """Apaga o usuário e tudo que é dele. Primeiro o que aponta para as matérias (RESTRICT)."""
        for tabela in ("sessao_estudo", "topico", "baralho"):
            self._executar(f"DELETE FROM {tabela} WHERE usuario_id = ?", (usuario_id,))
        self._executar("DELETE FROM usuario WHERE id = ?", (usuario_id,))

    # --- foto de perfil ---
    def salvar_foto(self, usuario_id, tipo, dados):
        self._executar("DELETE FROM foto_perfil WHERE usuario_id = ?", (usuario_id,))
        self._executar("INSERT INTO foto_perfil (usuario_id, tipo, dados) VALUES (?, ?, ?)", (usuario_id, tipo, dados))

    def obter_foto(self, usuario_id):
        linha = self._linha("SELECT tipo, dados FROM foto_perfil WHERE usuario_id = ?", (usuario_id,))
        return (linha["tipo"], bytes(linha["dados"])) if linha else None

    def remover_foto(self, usuario_id):
        self._executar("DELETE FROM foto_perfil WHERE usuario_id = ?", (usuario_id,))
