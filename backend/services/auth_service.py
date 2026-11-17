"""Contas, senhas, sessões (tokens) e perfil.

- A senha nunca é guardada: só o hash (PBKDF2-SHA256 com sal, do Werkzeug).
- O token de sessão é aleatório; no banco fica só o hash dele (SHA-256), então um vazamento
  do banco não entrega logins prontos.
"""

import hashlib
import re
import secrets
from datetime import datetime, timedelta

from werkzeug.security import check_password_hash, generate_password_hash

import config
import validacao
from dao.materia_dao import MateriaDAO
from dao.reset_dao import ResetSenhaDAO
from dao.sessao_login_dao import SessaoLoginDAO
from dao.usuario_dao import UsuarioDAO
from db import Conexao
from email_service import enviar_recuperacao
from erros import ConflitoErro, NaoAutorizadoErro, ValidacaoErro
from foto import para_data_url, validar_data_url
from models.materia import Materia
from models.usuario import Usuario

MATERIAS_PADRAO = [("Matemática", "#e63946"), ("Português", "#f4a261"), ("Física", "#2a9d8f"), ("Química", "#8338ec"),
                   ("Biologia", "#38b000"), ("História", "#b5838d"), ("Geografia", "#0077b6"), ("Inglês", "#ff006e"),
                   ("Programação", "#3a86ff")]

_FORMATO = "%Y-%m-%d %H:%M:%S"
_hash_falso = None


def agora():
    return datetime.now()


def texto_data(momento):
    return momento.strftime(_FORMATO)


def hash_do_token(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def gerar_hash_de_senha(senha):
    return generate_password_hash(senha, method=f"pbkdf2:sha256:{config.HASH_ITERACOES}")


def validar_senha(senha):
    if not isinstance(senha, str) or len(senha) < 8:
        raise ValidacaoErro("A senha deve ter pelo menos 8 caracteres.")
    if len(senha) > 128:
        raise ValidacaoErro("A senha deve ter no máximo 128 caracteres.")
    if not re.search(r"[A-Za-z]", senha) or not re.search(r"\d", senha):
        raise ValidacaoErro("A senha deve ter letras e números.")
    return senha


def _nome_completo(nome):
    nome = validacao.texto(nome, "nome", minimo=3, maximo=100)
    if len(nome.split()) < 2:
        raise ValidacaoErro("Informe o nome completo (nome e sobrenome).")
    return nome


def _conferir_senha(usuario, senha):
    """Confirma a senha (gasta o mesmo tempo mesmo se a conta não existir)."""
    global _hash_falso
    if _hash_falso is None:
        _hash_falso = gerar_hash_de_senha("senha-falsa-para-equalizar-o-tempo")
    confere = check_password_hash(usuario.senha_hash if usuario else _hash_falso, senha if isinstance(senha, str) else "")
    return confere and usuario is not None


class AuthService:
    # ------------------------------------------------------------ sessões
    def _abrir_sessao(self, conn, usuario_id, lembrar):
        token = secrets.token_urlsafe(32)
        duracao = timedelta(days=config.SESSAO_LEMBRAR_DIAS) if lembrar else timedelta(hours=config.SESSAO_HORAS)
        sessoes = SessaoLoginDAO(conn)
        sessoes.limpar_expiradas(texto_data(agora()))
        sessoes.criar(usuario_id, hash_do_token(token), texto_data(agora() + duracao))
        return token

    def usuario_por_token(self, token):
        if not token or len(token) > 200:
            return None
        return SessaoLoginDAO().usuario_da_sessao(hash_do_token(token), texto_data(agora()))

    def sair(self, token):
        SessaoLoginDAO().remover(hash_do_token(token))

    # ------------------------------------------------------------ cadastro e login
    def cadastrar(self, nome, email, senha, confirmar, tema="escuro"):
        nome = _nome_completo(nome)
        email = validacao.email(email)
        validar_senha(senha)
        if senha != confirmar:
            raise ValidacaoErro("As senhas não coincidem.")
        validacao.tema(tema)
        with Conexao() as conn:
            usuarios = UsuarioDAO(conn)
            if usuarios.buscar_por_email(email):
                raise ConflitoErro("Já existe uma conta com esse e-mail.")
            usuario = usuarios.inserir(Usuario(nome, email, senha_hash=gerar_hash_de_senha(senha), tema=tema))
            materias = MateriaDAO(conn)
            for nome_materia, cor in MATERIAS_PADRAO:
                materias.inserir(Materia(nome_materia, cor, usuario_id=usuario.id))
            token = self._abrir_sessao(conn, usuario.id, False)
        return token, usuario

    def entrar(self, email, senha, lembrar=False):
        email = str(email or "").strip().lower()
        usuario = UsuarioDAO().buscar_por_email(email) if email else None
        if not _conferir_senha(usuario, senha):
            raise NaoAutorizadoErro("E-mail ou senha incorretos.")
        with Conexao() as conn:
            token = self._abrir_sessao(conn, usuario.id, bool(lembrar))
        return token, usuario

    # ------------------------------------------------------------ perfil
    def perfil(self, usuario_id):
        """Dados do usuário + foto (como data URL, para o <img> funcionar sem cabeçalho de login)."""
        usuarios = UsuarioDAO()
        dados = usuarios.exigir(usuario_id).para_dict()
        foto = usuarios.obter_foto(usuario_id)
        dados["foto"] = para_data_url(*foto) if foto else None
        return dados

    def atualizar_perfil(self, usuario_id, dados):
        usuarios = UsuarioDAO()
        usuario = usuarios.exigir(usuario_id)
        if "nome" in dados:
            usuario.nome = _nome_completo(dados["nome"])
        if "apelido" in dados:
            usuario.apelido = dados["apelido"]
        if "bio" in dados:
            usuario.bio = dados["bio"]
        if "tema" in dados:
            usuario.tema = dados["tema"]
        if "tutorial_visto" in dados:
            usuario.tutorial_visto = dados["tutorial_visto"]
        usuarios.atualizar_perfil(usuario)
        return self.perfil(usuario_id)

    def salvar_foto(self, usuario_id, imagem):
        tipo, dados = validar_data_url(imagem)
        UsuarioDAO().salvar_foto(usuario_id, tipo, dados)
        return self.perfil(usuario_id)

    def remover_foto(self, usuario_id):
        UsuarioDAO().remover_foto(usuario_id)
        return self.perfil(usuario_id)

    def alterar_email(self, usuario_id, novo_email, senha, token_atual):
        novo_email = validacao.email(novo_email)
        with Conexao() as conn:
            usuarios = UsuarioDAO(conn)
            usuario = usuarios.exigir(usuario_id)
            if not _conferir_senha(usuario, senha):
                raise NaoAutorizadoErro("Senha incorreta.")
            existente = usuarios.buscar_por_email(novo_email)
            if existente and existente.id != usuario_id:
                raise ConflitoErro("Já existe uma conta com esse e-mail.")
            usuarios.atualizar_email(usuario_id, novo_email)
            SessaoLoginDAO(conn).remover_do_usuario(usuario_id, hash_do_token(token_atual))   # derruba os outros aparelhos
        return self.perfil(usuario_id)

    def alterar_senha(self, usuario_id, senha_atual, nova, confirmar, token_atual):
        with Conexao() as conn:
            usuarios = UsuarioDAO(conn)
            usuario = usuarios.exigir(usuario_id)
            if not _conferir_senha(usuario, senha_atual):
                raise NaoAutorizadoErro("A senha atual está incorreta.")
            validar_senha(nova)
            if nova != confirmar:
                raise ValidacaoErro("As senhas não coincidem.")
            usuarios.atualizar_senha(usuario_id, gerar_hash_de_senha(nova))
            SessaoLoginDAO(conn).remover_do_usuario(usuario_id, hash_do_token(token_atual))

    def excluir_conta(self, usuario_id, senha):
        with Conexao() as conn:
            usuarios = UsuarioDAO(conn)
            if not _conferir_senha(usuarios.exigir(usuario_id), senha):
                raise NaoAutorizadoErro("Senha incorreta.")
            usuarios.excluir_conta(usuario_id)

    # ------------------------------------------------------------ recuperação de senha
    def solicitar_recuperacao(self, email):
        """Gera o link de recuperação. Devolve o link (ou None se a conta não existe); a rota nunca revela qual caso foi."""
        try:
            email = validacao.email(email)
        except ValidacaoErro:
            return None
        with Conexao() as conn:
            usuario = UsuarioDAO(conn).buscar_por_email(email)
            if usuario is None:
                return None
            token = secrets.token_urlsafe(32)
            ResetSenhaDAO(conn).criar(usuario.id, hash_do_token(token), texto_data(agora() + timedelta(minutes=config.RESET_MINUTOS)))
        link = f"{config.APP_URL}/#/redefinir?token={token}"
        enviar_recuperacao(usuario.email, usuario.nome.split()[0], link)
        return link

    def redefinir_senha(self, token, nova, confirmar):
        validar_senha(nova)
        if nova != confirmar:
            raise ValidacaoErro("As senhas não coincidem.")
        with Conexao() as conn:
            reset = ResetSenhaDAO(conn).buscar_valido(hash_do_token(str(token or "")), texto_data(agora()))
            if reset is None:
                raise ValidacaoErro("Este link de recuperação é inválido ou já expirou. Peça um novo.")
            UsuarioDAO(conn).atualizar_senha(reset["usuario_id"], gerar_hash_de_senha(nova))
            ResetSenhaDAO(conn).marcar_usado(reset["id"])
            SessaoLoginDAO(conn).remover_do_usuario(reset["usuario_id"])    # encerra todas as sessões abertas
