import logging
import smtplib
from email.message import EmailMessage
from urllib.parse import quote

from .config import settings

logger = logging.getLogger(__name__)


def is_email_delivery_configured() -> bool:
    return bool(settings.smtp_host and settings.smtp_from_email)


def build_password_reset_url(reset_token: str) -> str:
    base_url = settings.public_base_url.rstrip("/")
    return f"{base_url}/?mode=reset&token={quote(reset_token)}"


def send_password_reset_email(recipient_email: str, reset_token: str) -> bool:
    if not is_email_delivery_configured():
        return False

    message = EmailMessage()
    message["Subject"] = "Robin IA - Reinitialisation du mot de passe"
    message["From"] = (
        f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
        if settings.smtp_from_name
        else settings.smtp_from_email
    )
    message["To"] = recipient_email

    reset_url = build_password_reset_url(reset_token)
    ttl_minutes = settings.password_reset_ttl_minutes
    message.set_content(
        "Bonjour,\n\n"
        "Une demande de reinitialisation de mot de passe a ete recue pour votre compte Robin IA. "
        f"Ce lien reste valable {ttl_minutes} minutes.\n\n"
        f"Lien direct: {reset_url}\n\n"
        f"Code temporaire: {reset_token}\n\n"
        "Si vous n etes pas a l origine de cette demande, ignorez cet email.\n"
    )

    try:
        if settings.smtp_use_ssl:
            smtp_client = smtplib.SMTP_SSL(
                settings.smtp_host,
                settings.smtp_port,
                timeout=settings.smtp_timeout_seconds,
            )
        else:
            smtp_client = smtplib.SMTP(
                settings.smtp_host,
                settings.smtp_port,
                timeout=settings.smtp_timeout_seconds,
            )

        with smtp_client as server:
            if settings.smtp_starttls and not settings.smtp_use_ssl:
                server.starttls()
            if settings.smtp_username:
                server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
    except Exception:
        logger.exception("Unable to send password reset email")
        return False

    return True


def send_mfa_email_code(recipient_email: str, code: str, purpose: str) -> bool:
    if not is_email_delivery_configured():
        return False

    ttl_minutes = settings.mfa_email_code_ttl_minutes
    message = EmailMessage()
    message["Subject"] = "Robin IA - Code de verification"
    message["From"] = (
        f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
        if settings.smtp_from_name
        else settings.smtp_from_email
    )
    message["To"] = recipient_email
    context_label = "activation MFA" if purpose == "setup" else "connexion MFA"
    message.set_content(
        "Bonjour,\n\n"
        f"Voici votre code Robin IA pour {context_label}. Il reste valable {ttl_minutes} minutes.\n\n"
        f"Code: {code}\n\n"
        "Si vous n etes pas a l origine de cette operation, ignorez cet email.\n"
    )

    try:
        if settings.smtp_use_ssl:
            smtp_client = smtplib.SMTP_SSL(
                settings.smtp_host,
                settings.smtp_port,
                timeout=settings.smtp_timeout_seconds,
            )
        else:
            smtp_client = smtplib.SMTP(
                settings.smtp_host,
                settings.smtp_port,
                timeout=settings.smtp_timeout_seconds,
            )

        with smtp_client as server:
            if settings.smtp_starttls and not settings.smtp_use_ssl:
                server.starttls()
            if settings.smtp_username:
                server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
    except Exception:
        logger.exception("Unable to send MFA email code")
        return False

    return True


def send_account_verification_email(recipient_email: str, code: str) -> bool:
    if not is_email_delivery_configured():
        return False

    ttl_minutes = settings.mfa_email_code_ttl_minutes
    message = EmailMessage()
    message["Subject"] = "Robin IA - Verification du compte"
    message["From"] = (
        f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
        if settings.smtp_from_name
        else settings.smtp_from_email
    )
    message["To"] = recipient_email
    message.set_content(
        "Bonjour,\n\n"
        "Pour activer votre compte Robin IA, saisissez ce code de verification.\n\n"
        f"Code: {code}\n"
        f"Validite: {ttl_minutes} minutes\n\n"
        "Si vous n etes pas a l origine de cette inscription, ignorez cet email.\n"
    )

    try:
        if settings.smtp_use_ssl:
            smtp_client = smtplib.SMTP_SSL(
                settings.smtp_host,
                settings.smtp_port,
                timeout=settings.smtp_timeout_seconds,
            )
        else:
            smtp_client = smtplib.SMTP(
                settings.smtp_host,
                settings.smtp_port,
                timeout=settings.smtp_timeout_seconds,
            )

        with smtp_client as server:
            if settings.smtp_starttls and not settings.smtp_use_ssl:
                server.starttls()
            if settings.smtp_username:
                server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(message)
    except Exception:
        logger.exception("Unable to send account verification email")
        return False

    return True