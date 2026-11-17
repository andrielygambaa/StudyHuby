"""Configurações do StudyHub.

Os dados de conexão vêm de variáveis de ambiente ou do arquivo backend/.env
(copie o backend/.env.example para backend/.env e ajuste a senha do MySQL).
"""

import os
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _ler_env():
    valores = {}
    arquivo = Path(__file__).resolve().parent / ".env"
    if arquivo.exists():
        for linha in arquivo.read_text(encoding="utf-8").splitlines():
            linha = linha.strip()
            if linha and not linha.startswith("#") and "=" in linha:
                chave, valor = linha.split("=", 1)
                valores[chave.strip()] = valor.strip().strip('"').strip("'")
    return valores


_ENV = _ler_env()


def _cfg(nome, padrao):
    """Prioridade: variável de ambiente > arquivo .env > valor padrão."""
    return os.environ.get(nome, _ENV.get(nome, padrao))


# "mysql" (padrão) ou "sqlite" (modo de teste, sem instalar nada)
TIPO_BANCO = _cfg("STUDYHUB_BANCO", "mysql").lower()

# --- MySQL ---
DB_HOST = _cfg("STUDYHUB_DB_HOST", "localhost")
DB_PORT = int(_cfg("STUDYHUB_DB_PORT", "3306"))
DB_USER = _cfg("STUDYHUB_DB_USER", "root")
DB_PASSWORD = _cfg("STUDYHUB_DB_PASSWORD", "")
DB_NAME = _cfg("STUDYHUB_DB_NAME", "studyhub")
if not re.fullmatch(r"[A-Za-z0-9_]+", DB_NAME):
    raise ValueError("STUDYHUB_DB_NAME deve ter só letras, números e _")

# --- SQLite (modo de teste) ---
DB_PATH = Path(_cfg("STUDYHUB_DB", BASE_DIR / "database" / "studyhub.db"))

_pasta_sql = BASE_DIR / "database" if TIPO_BANCO == "mysql" else BASE_DIR / "database" / "sqlite"
SCHEMA_PATH = _pasta_sql / "schema.sql"
SEED_PATH = _pasta_sql / "seed.sql"

# O front-end fica na RAIZ do repositório (index.html, css/, js/, assets/)
FRONTEND_DIR = BASE_DIR

# --- Autenticação e segurança ---
SESSAO_HORAS = 12              # duração do login normal
SESSAO_LEMBRAR_DIAS = 30       # duração quando marca "lembrar de mim"
RESET_MINUTOS = 30             # validade do link de recuperação de senha
HASH_ITERACOES = int(_cfg("STUDYHUB_HASH_ITER", "600000"))
RATE_LIMIT = _cfg("STUDYHUB_RATE_LIMIT", "1") != "0"
# 1 = o servidor está atrás de um proxy confiável (hospedagem) e o IP real vem em X-Forwarded-For
TRUST_PROXY = _cfg("STUDYHUB_TRUST_PROXY", "0") == "1"
# Endereços (separados por vírgula) do site publicado que podem chamar a API. Ex.: https://usuario.github.io
CORS_ORIGINS = [o.strip().rstrip("/") for o in _cfg("STUDYHUB_CORS_ORIGINS", "").split(",") if o.strip()]
# Endereço público do site (usado no link do e-mail de recuperação). Ex.: https://usuario.github.io/studyhub
APP_URL = _cfg("STUDYHUB_APP_URL", "").rstrip("/")
# Modo demonstração: sem servidor de e-mail, a API devolve o link de recuperação na resposta. NUNCA use em produção.
DEV_RESET = _cfg("STUDYHUB_DEV_RESET", "0") == "1"
# E-mail (SMTP) para enviar o link de recuperação de senha
SMTP_HOST = _cfg("STUDYHUB_SMTP_HOST", "")
SMTP_PORT = int(_cfg("STUDYHUB_SMTP_PORT", "587"))
SMTP_USER = _cfg("STUDYHUB_SMTP_USER", "")
SMTP_PASSWORD = _cfg("STUDYHUB_SMTP_PASSWORD", "")
SMTP_FROM = _cfg("STUDYHUB_SMTP_FROM", "")
