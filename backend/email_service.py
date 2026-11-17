"""Envio do e-mail de recuperação de senha por SMTP (opcional: só funciona se o SMTP estiver configurado)."""

import smtplib
from email.message import EmailMessage

import config


def smtp_configurado():
    return bool(config.SMTP_HOST and config.SMTP_FROM)


def enviar_recuperacao(destinatario, nome, link):
    """Devolve True se enviou. Não lança erro: se o e-mail falhar, a resposta da API continua a mesma."""
    if not smtp_configurado():
        return False
    msg = EmailMessage()
    msg["Subject"] = "StudyHub - redefinição de senha"
    msg["From"] = config.SMTP_FROM
    msg["To"] = destinatario
    msg.set_content(
        f"Olá, {nome}!\n\nPara criar uma nova senha, abra o link abaixo (vale por {config.RESET_MINUTOS} minutos):\n\n{link}\n\n"
        "Se você não pediu isso, ignore este e-mail: a sua senha continua a mesma.\n\nEquipe StudyHub")
    try:
        with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=15) as servidor:
            servidor.starttls()
            if config.SMTP_USER:
                servidor.login(config.SMTP_USER, config.SMTP_PASSWORD)
            servidor.send_message(msg)
        return True
    except (smtplib.SMTPException, OSError):
        return False
