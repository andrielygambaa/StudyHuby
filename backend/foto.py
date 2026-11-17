"""Validação da foto de perfil enviada pelo usuário."""

import base64
import binascii
import re

from erros import ValidacaoErro

TAMANHO_MAXIMO = 300 * 1024   # 300 KB (o site reduz a imagem para 256x256 antes de enviar)
_DATA_URL = re.compile(r"^data:(image/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$")


def _tipo_pelo_conteudo(dados):
    """O tipo vem dos primeiros bytes do arquivo, nunca do que o cliente diz."""
    if dados[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if dados[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if dados[:4] == b"RIFF" and dados[8:12] == b"WEBP":
        return "image/webp"
    return None


def validar_data_url(texto):
    """Recebe 'data:image/...;base64,...' e devolve (tipo, bytes) ou lança ValidacaoErro."""
    if not isinstance(texto, str):
        raise ValidacaoErro("Envie uma imagem.")
    m = _DATA_URL.match(texto.strip())
    if not m:
        raise ValidacaoErro("Formato inválido. Use uma imagem JPG, PNG ou WebP.")
    try:
        dados = base64.b64decode(m.group(2), validate=False)
    except (binascii.Error, ValueError):
        raise ValidacaoErro("A imagem está corrompida.")
    if not dados:
        raise ValidacaoErro("A imagem está vazia.")
    if len(dados) > TAMANHO_MAXIMO:
        raise ValidacaoErro("A imagem é grande demais (máximo de 300 KB).")
    tipo = _tipo_pelo_conteudo(dados)
    if tipo is None:
        raise ValidacaoErro("O arquivo não é uma imagem JPG, PNG ou WebP válida.")
    return tipo, dados


def para_data_url(tipo, dados):
    return f"data:{tipo};base64,{base64.b64encode(dados).decode('ascii')}"
