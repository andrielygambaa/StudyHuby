"""Testes de autenticação, autorização, perfil, foto, recuperação de senha, busca e CORS.

Execução (a partir da raiz do repositório):
    python -m unittest discover -s tests -v
"""

import base64
import unittest
from datetime import datetime, timedelta
from unittest.mock import patch

import _ambiente  # noqa: F401
import config
import ratelimit
from app import app
from db import Conexao
from init_db import criar_banco
from services import auth_service
from test_api import SENHA, ApiTestCase as _Base

PNG_1X1 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
FOTO = "data:image/png;base64," + PNG_1X1


def setUpModule():
    criar_banco(reset=True)


class Caso(_Base):
    def entrar(self, email, senha=SENHA, status=200, lembrar=False):
        return self.post("/api/auth/login", {"email": email, "senha": senha, "lembrar": lembrar}, status=status)


class TestCadastroELogin(Caso):
    def test_cadastro_cria_conta_materias_e_ja_entra(self):
        u = self.novo_usuario()
        self.assertEqual((u["nivel"], u["tema"], u["tutorial_visto"], u["foto"]), (1, "escuro", False, None))
        self.assertNotIn("senha_hash", u)
        self.assertEqual(self.get("/api/auth/eu")["usuario"]["email"], u["email"])
        self.assertEqual(len(self.get("/api/materias")), 9)

    def test_senha_fica_com_hash_e_token_so_com_hash(self):
        u = self.novo_usuario()
        token = self.h["Authorization"][7:]
        with Conexao() as conn:
            senha_hash = conn.execute("SELECT senha_hash FROM usuario WHERE id = ?", (u["id"],)).fetchone()[0]
            tokens = [linha[0] for linha in conn.execute("SELECT token_hash FROM sessao_login WHERE usuario_id = ?", (u["id"],)).fetchall()]
        self.assertTrue(senha_hash.startswith("pbkdf2:sha256:"))
        self.assertNotIn(SENHA, senha_hash)
        self.assertNotIn(token, tokens)
        self.assertEqual(tokens, [auth_service.hash_do_token(token)])

    def test_validacoes_do_cadastro(self):
        base = {"nome": "Maria Silva", "email": "maria.val@teste.com", "senha": SENHA, "confirmar_senha": SENHA}
        for campo, valor in (("nome", "Maria"), ("nome", ""), ("email", "sem-arroba"), ("senha", "curta1"),
                             ("senha", "somenteletras"), ("senha", "12345678"), ("confirmar_senha", "outra12345")):
            erro = self.post("/api/auth/cadastro", {**base, campo: valor}, status=400)
            self.assertIn("erro", erro, (campo, valor))
        self.post("/api/auth/cadastro", base)
        self.post("/api/auth/cadastro", {**base, "email": "MARIA.VAL@teste.com"}, status=409)

    def test_login_logout_e_token_invalido(self):
        u = self.novo_usuario()
        self.h = {}
        self.entrar(u["email"], "senhaerrada1", status=401)
        mensagem_inexistente = self.entrar("ninguem@teste.com", status=401)["erro"]
        self.assertEqual(mensagem_inexistente, self.entrar(u["email"], "senhaerrada1", status=401)["erro"])   # não revela se a conta existe
        dados = self.entrar(u["email"].upper())
        self.h = {"Authorization": "Bearer " + dados["token"]}
        self.get("/api/auth/eu")
        self.post("/api/auth/logout", status=204)
        self.get("/api/auth/eu", status=401)                 # o token deixa de valer no servidor
        self.h = {"Authorization": "Bearer token-inventado"}
        self.get("/api/auth/eu", status=401)
        self.h = {"Authorization": "Basic abc"}
        self.get("/api/auth/eu", status=401)

    def test_sessao_expira_e_lembrar_dura_mais(self):
        u = self.novo_usuario()
        self.h = {}
        curta = self.entrar(u["email"])["token"]
        longa = self.entrar(u["email"], lembrar=True)["token"]
        daqui_a_2_dias = datetime.now() + timedelta(days=2)
        with patch.object(auth_service, "agora", lambda: daqui_a_2_dias):
            self.h = {"Authorization": "Bearer " + curta}
            self.get("/api/auth/eu", status=401)
            self.h = {"Authorization": "Bearer " + longa}
            self.get("/api/auth/eu")

    def test_limite_de_tentativas_de_login(self):
        u = self.novo_usuario()
        self.h = {}
        ratelimit.limpar()
        with patch.object(config, "RATE_LIMIT", True):
            for _ in range(8):
                self.entrar(u["email"], "senhaerrada1", status=401)
            self.entrar(u["email"], "senhaerrada1", status=429)
            self.entrar(u["email"], status=429)              # nem a senha certa passa durante o bloqueio
        ratelimit.limpar()


class TestProtecaoDasRotas(Caso):
    def test_toda_rota_da_api_exige_login(self):
        publicas = {("GET", "/api/health"), ("POST", "/api/auth/cadastro"), ("POST", "/api/auth/login"),
                    ("POST", "/api/auth/esqueci-senha"), ("POST", "/api/auth/redefinir-senha")}
        conferidas = 0
        for regra in app.url_map.iter_rules():
            if not regra.rule.startswith("/api/"):
                continue
            url = regra.rule
            for trecho in ("<int:usuario_id>", "<int:materia_id>", "<int:topico_id>", "<int:sessao_id>", "<int:baralho_id>", "<int:cartao_id>"):
                url = url.replace(trecho, "1")
            for metodo in regra.methods - {"HEAD", "OPTIONS"}:
                if (metodo, regra.rule) in publicas:
                    continue
                resposta = getattr(self.client, metodo.lower())(url, json={})
                self.assertEqual(resposta.status_code, 401, f"{metodo} {url} respondeu {resposta.status_code} sem login")
                conferidas += 1
        self.assertGreaterEqual(conferidas, 40)

    def test_um_usuario_nao_alcanca_os_dados_do_outro(self):
        ana = self.novo_usuario()
        mat = self.materia()["id"]
        topico = self.post(f"/api/usuarios/{ana['id']}/topicos", {"materia_id": mat, "titulo": "Segredo da Ana"})
        sessao = self.post(f"/api/usuarios/{ana['id']}/sessoes", {"materia_id": mat, "duracao_min": 25})["sessao"]
        baralho = self.post(f"/api/usuarios/{ana['id']}/baralhos", {"materia_id": mat, "nome": "Baralho da Ana"})
        cartao = self.post(f"/api/baralhos/{baralho['id']}/cartoes", {"frente": "pergunta", "verso": "resposta"})

        bia = self.novo_usuario()                             # daqui em diante as chamadas são da Bia
        for caminho in ("dashboard", "topicos", "sessoes", "baralhos", "conquistas", "xp", "cartoes/pendentes"):
            self.get(f"/api/usuarios/{ana['id']}/{caminho}", status=403)
        self.get(f"/api/usuarios/{ana['id']}", status=403)
        self.post(f"/api/usuarios/{ana['id']}/topicos", {"materia_id": mat, "titulo": "invasão"}, status=403)
        self.get(f"/api/topicos/{topico['id']}", status=404)
        self.put(f"/api/topicos/{topico['id']}", {"titulo": "alterado"}, status=404)
        self.post(f"/api/topicos/{topico['id']}/avancar", status=404)
        self.delete(f"/api/topicos/{topico['id']}", status=404)
        self.get(f"/api/sessoes/{sessao['id']}", status=404)
        self.delete(f"/api/sessoes/{sessao['id']}", status=404)
        self.get(f"/api/baralhos/{baralho['id']}", status=404)
        self.post(f"/api/baralhos/{baralho['id']}/cartoes", {"frente": "a", "verso": "b"}, status=404)
        self.delete(f"/api/baralhos/{baralho['id']}", status=404)
        self.put(f"/api/cartoes/{cartao['id']}", {"verso": "alterado"}, status=404)
        self.post(f"/api/cartoes/{cartao['id']}/revisao", {"acertou": True}, status=404)
        self.get(f"/api/materias/{mat}", status=404)
        self.put(f"/api/materias/{mat}", {"nome": "alterada"}, status=404)
        self.delete(f"/api/materias/{mat}", status=404)
        # nem usar a matéria da Ana nos próprios dados
        self.post(f"/api/usuarios/{bia['id']}/topicos", {"materia_id": mat, "titulo": "x"}, status=404)
        self.post(f"/api/usuarios/{bia['id']}/baralhos", {"materia_id": mat, "nome": "x"}, status=404)
        self.post(f"/api/usuarios/{bia['id']}/sessoes", {"materia_id": mat, "duracao_min": 25}, status=404)
        self.assertNotIn(mat, [m["id"] for m in self.get("/api/materias")])
        self.assertEqual(self.get(f"/api/usuarios/{bia['id']}/topicos"), [])
        with Conexao() as conn:                               # nada da Ana foi alterado
            self.assertEqual(conn.execute("SELECT titulo FROM topico WHERE id = ?", (topico["id"],)).fetchone()[0], "Segredo da Ana")
            self.assertEqual(conn.execute("SELECT verso FROM cartao WHERE id = ?", (cartao["id"],)).fetchone()[0], "resposta")

    def test_arquivos_internos_nao_sao_servidos(self):
        for caminho in ("/backend/app.py", "/backend/.env", "/backend/.env.example", "/database/schema.sql", "/.gitignore",
                        "/README.md", "/requirements.txt", "/css/../backend/app.py", "/js/../.env", "/tests/test_api.py", "/css"):
            self.assertEqual(self.client.get(caminho).status_code, 404, caminho)
        for caminho in ("/", "/index.html", "/404.html", "/config.js", "/css/style.css", "/js/main.js"):
            resposta = self.client.get(caminho)
            self.assertEqual(resposta.status_code, 200, caminho)
            resposta.close()


class TestPerfil(Caso):
    def test_editar_perfil_tema_e_tutorial(self):
        self.novo_usuario()
        u = self.put("/api/perfil", {"nome": "Júlia de Souza", "apelido": "@juju.s", "bio": "  Estudando para o ENEM  ", "tema": "claro", "tutorial_visto": True})["usuario"]
        self.assertEqual((u["nome"], u["apelido"], u["bio"], u["tema"], u["tutorial_visto"]), ("Júlia de Souza", "juju.s", "Estudando para o ENEM", "claro", True))
        self.assertEqual(self.get("/api/auth/eu")["usuario"]["tema"], "claro")        # persiste no servidor
        self.put("/api/perfil", {"tema": "roxo"}, status=400)
        self.put("/api/perfil", {"nome": "Júlia"}, status=400)
        self.put("/api/perfil", {"apelido": "a b"}, status=400)
        self.put("/api/perfil", {"bio": "x" * 301}, status=400)
        u = self.put("/api/perfil", {"apelido": "", "bio": "", "xp_total": 9999, "email": "hack@x.com"})["usuario"]
        self.assertEqual((u["apelido"], u["bio"], u["xp_total"]), (None, None, 0))    # campos proibidos são ignorados
        self.assertNotEqual(u["email"], "hack@x.com")

    def test_trocar_email_exige_senha(self):
        u = self.novo_usuario()
        outro_email = f"novo{u['id']}@teste.com"
        self.post("/api/perfil/email", {"novo_email": outro_email, "senha": "errada123"}, status=401)
        self.post("/api/perfil/email", {"novo_email": "invalido", "senha": SENHA}, status=400)
        self.assertEqual(self.post("/api/perfil/email", {"novo_email": outro_email, "senha": SENHA}, status=200)["usuario"]["email"], outro_email)
        h = self.h
        outra = self.novo_usuario()
        self.post("/api/perfil/email", {"novo_email": outro_email, "senha": SENHA}, status=409)
        self.h = {}
        self.entrar(u["email"], status=401)
        self.entrar(outro_email)

    def test_trocar_senha_desconecta_os_outros_aparelhos(self):
        u = self.novo_usuario()
        aparelho1 = self.h
        aparelho2 = {"Authorization": "Bearer " + self.entrar(u["email"])["token"]}
        self.post("/api/perfil/senha", {"senha_atual": "errada123", "nova_senha": "novasenha1", "confirmar_senha": "novasenha1"}, status=401)
        self.post("/api/perfil/senha", {"senha_atual": SENHA, "nova_senha": "fraca", "confirmar_senha": "fraca"}, status=400)
        self.post("/api/perfil/senha", {"senha_atual": SENHA, "nova_senha": "novasenha1", "confirmar_senha": "diferente1"}, status=400)
        self.post("/api/perfil/senha", {"senha_atual": SENHA, "nova_senha": "novasenha1", "confirmar_senha": "novasenha1"}, status=200)
        self.get("/api/auth/eu")                              # quem trocou continua logado
        self.h = aparelho2
        self.get("/api/auth/eu", status=401)
        self.h = {}
        self.entrar(u["email"], status=401)
        self.entrar(u["email"], "novasenha1")

    def test_foto_de_perfil(self):
        u = self.novo_usuario()
        salvo = self.put("/api/perfil/foto", {"imagem": FOTO})["usuario"]
        self.assertEqual(salvo["foto"], FOTO)
        self.assertEqual(self.get("/api/auth/eu")["usuario"]["foto"], FOTO)
        self.assertEqual(self.entrar(u["email"])["usuario"]["foto"], FOTO)
        texto_disfarcado = "data:image/png;base64," + base64.b64encode(b"<script>alert(1)</script>").decode()
        self.put("/api/perfil/foto", {"imagem": texto_disfarcado}, status=400)       # o conteúdo não é imagem
        self.put("/api/perfil/foto", {"imagem": "data:image/svg+xml;base64," + PNG_1X1}, status=400)
        self.put("/api/perfil/foto", {"imagem": "data:text/html;base64," + PNG_1X1}, status=400)
        self.put("/api/perfil/foto", {"imagem": None}, status=400)
        grande = base64.b64encode(base64.b64decode(PNG_1X1) + b"0" * (301 * 1024)).decode()
        self.put("/api/perfil/foto", {"imagem": "data:image/png;base64," + grande}, status=400)
        self.assertEqual(self.get("/api/auth/eu")["usuario"]["foto"], FOTO)          # as tentativas inválidas não trocaram nada
        self.assertIsNone(self.delete("/api/perfil/foto", status=200)["usuario"]["foto"])
        resposta = self.client.put("/api/perfil/foto", data=b"x" * (3 * 1024 * 1024), headers={**self.h, "Content-Type": "application/json"})
        self.assertEqual(resposta.status_code, 413)


class TestRecuperacaoDeSenha(Caso):
    def _token(self, email):
        link = self.post("/api/auth/esqueci-senha", {"email": email}, status=200)["link_dev"]
        self.assertTrue(link.startswith("#/redefinir?token="))
        return link.split("token=")[1]

    def test_fluxo_completo_e_uso_unico(self):
        u = self.novo_usuario()
        sessao_antiga = self.h
        self.h = {}
        token = self._token(u["email"])
        nova = {"senha": "outrasenha9", "confirmar_senha": "outrasenha9"}
        self.post("/api/auth/redefinir-senha", {"token": "inventado", **nova}, status=400)
        self.post("/api/auth/redefinir-senha", {"token": token, "senha": "fraca", "confirmar_senha": "fraca"}, status=400)
        self.post("/api/auth/redefinir-senha", {"token": token, **nova}, status=200)
        self.post("/api/auth/redefinir-senha", {"token": token, **nova}, status=400)     # o link só vale uma vez
        self.entrar(u["email"], status=401)
        self.entrar(u["email"], "outrasenha9")
        self.h = sessao_antiga
        self.get("/api/auth/eu", status=401)                  # as sessões antigas caem

    def test_nao_revela_se_o_email_existe_e_link_expira(self):
        u = self.novo_usuario()
        self.h = {}
        existente = self.post("/api/auth/esqueci-senha", {"email": u["email"]}, status=200)
        inexistente = self.post("/api/auth/esqueci-senha", {"email": "ninguem@teste.com"}, status=200)
        self.assertEqual(existente["mensagem"], inexistente["mensagem"])
        self.assertNotIn("link_dev", inexistente)
        with patch.object(config, "DEV_RESET", False):        # em produção o link nunca volta na resposta
            self.assertNotIn("link_dev", self.post("/api/auth/esqueci-senha", {"email": u["email"]}, status=200))
        token = self._token(u["email"])
        depois = datetime.now() + timedelta(minutes=config.RESET_MINUTOS + 1)
        with patch.object(auth_service, "agora", lambda: depois):
            self.post("/api/auth/redefinir-senha", {"token": token, "senha": "outrasenha9", "confirmar_senha": "outrasenha9"}, status=400)
        primeiro = self._token(u["email"])
        segundo = self._token(u["email"])                     # pedir de novo invalida o link anterior
        self.post("/api/auth/redefinir-senha", {"token": primeiro, "senha": "outrasenha9", "confirmar_senha": "outrasenha9"}, status=400)
        self.post("/api/auth/redefinir-senha", {"token": segundo, "senha": "outrasenha9", "confirmar_senha": "outrasenha9"}, status=200)


class TestBuscaECors(Caso):
    def test_busca_so_nos_dados_do_proprio_usuario(self):
        ana = self.novo_usuario()
        mat = self.materia("Física")["id"]
        self.post(f"/api/usuarios/{ana['id']}/topicos", {"materia_id": mat, "titulo": "Leis de Newton"})
        bid = self.post(f"/api/usuarios/{ana['id']}/baralhos", {"materia_id": mat, "nome": "Newton e a gravidade"})["id"]
        self.post(f"/api/baralhos/{bid}/cartoes", {"frente": "Quem formulou a gravitação?", "verso": "Isaac Newton"})
        r = self.get("/api/busca?q=newton")
        self.assertEqual((len(r["topicos"]), len(r["baralhos"]), len(r["cartoes"])), (1, 1, 1))
        self.assertEqual(self.get("/api/busca?q=fís")["materias"][0]["nome"], "Física")
        self.assertEqual(len(self.get("/api/busca?q=pomodoro")["conquistas"]), 2)
        self.assertEqual(self.get("/api/busca?q=n")["topicos"], [])                 # menos de 2 letras não pesquisa
        vazio = self.get("/api/busca?q=%25")                                         # "%" é texto comum, não curinga
        self.assertEqual(sum(len(vazio[k]) for k in ("topicos", "baralhos", "cartoes", "materias", "conquistas")), 0)
        self.get("/api/busca?q=' OR 1=1 --")
        self.novo_usuario()
        outra = self.get("/api/busca?q=newton")
        self.assertEqual((outra["topicos"], outra["baralhos"], outra["cartoes"]), ([], [], []))

    def test_cors_so_para_os_enderecos_permitidos(self):
        permitido = self.client.get("/api/health", headers={"Origin": "https://aluna.github.io"})
        self.assertEqual(permitido.headers.get("Access-Control-Allow-Origin"), "https://aluna.github.io")
        self.assertEqual(self.client.get("/api/health", headers={"Origin": "http://localhost:8080"}).headers.get("Access-Control-Allow-Origin"), "http://localhost:8080")
        self.assertIsNone(self.client.get("/api/health", headers={"Origin": "https://site-malicioso.com"}).headers.get("Access-Control-Allow-Origin"))
        previa = self.client.options("/api/perfil", headers={"Origin": "https://aluna.github.io", "Access-Control-Request-Method": "PUT",
                                                               "Access-Control-Request-Headers": "authorization,content-type"})
        self.assertEqual(previa.status_code, 204)
        self.assertIn("Authorization", previa.headers["Access-Control-Allow-Headers"])
        self.assertIn("PUT", previa.headers["Access-Control-Allow-Methods"])
        self.assertEqual(self.client.get("/api/health").headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(self.client.get("/api/health").headers["Cache-Control"], "no-store")


if __name__ == "__main__":
    unittest.main()
