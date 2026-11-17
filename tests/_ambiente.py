"""Prepara o ambiente dos testes. Deve ser importado ANTES de qualquer módulo do backend.

Os testes NUNCA usam o seu banco de verdade:
  - MySQL: usam um banco separado chamado "studyhub_teste" (criado e apagado pelos testes);
  - SQLite (modo de teste): usam um arquivo temporário.
Os dados de conexão (usuário, senha, host) continuam vindo de backend/.env.
"""

import os
import sys
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))
os.environ["STUDYHUB_DB_NAME"] = "studyhub_teste"
os.environ["STUDYHUB_DB"] = os.path.join(tempfile.mkdtemp(prefix="studyhub_teste_"), "teste.db")
os.environ["STUDYHUB_HASH_ITER"] = "1000"      # hash de senha rápido só nos testes
os.environ["STUDYHUB_RATE_LIMIT"] = "0"        # o limite de tentativas tem um teste próprio
os.environ["STUDYHUB_DEV_RESET"] = "1"
os.environ["STUDYHUB_CORS_ORIGINS"] = "https://aluna.github.io"
