"""Limite simples de tentativas (em memória) contra força bruta no login e abuso do cadastro."""

import time
from collections import defaultdict, deque

import config
from erros import LimiteErro

_tentativas = defaultdict(deque)


def limitar(chave, maximo, janela_segundos):
    if not config.RATE_LIMIT:
        return
    agora = time.monotonic()
    fila = _tentativas[chave]
    while fila and agora - fila[0] > janela_segundos:
        fila.popleft()
    if len(fila) >= maximo:
        raise LimiteErro("Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.")
    fila.append(agora)


def esquecer(chave):
    _tentativas.pop(chave, None)


def limpar():
    _tentativas.clear()
