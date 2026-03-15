import logging
import smtplib
from email.message import EmailMessage
from email.utils import formatdate, make_msgid
from urllib.parse import quote

from .config import settings

logger = logging.getLogger(__name__)

LOCAL_SMTP_HOSTS = {"postfix", "localhost", "127.0.0.1"}


def apply_standard_headers(message: EmailMessage) -> None:
    # RFC-compliant headers improve deliverability with strict providers (e.g. Gmail).
    if "Date" not in message:
        message["Date"] = formatdate(localtime=False, usegmt=True)
    if "Message-ID" not in message:
        domain = (settings.smtp_from_email or "").split("@")[-1] or "localhost"
        message["Message-ID"] = make_msgid(domain=domain)


def email_delivery_issue_reason() -> str | None:
    missing: list[str] = []
    if not settings.smtp_host:
        missing.append("SMTP_HOST")
    if not settings.smtp_from_email:
        missing.append("SMTP_FROM_EMAIL")
    if missing:
        return f"Email delivery disabled: missing required SMTP settings ({', '.join(missing)})."

    if settings.smtp_use_ssl and settings.smtp_starttls:
        return "Email delivery misconfigured: SMTP_USE_SSL and SMTP_STARTTLS cannot both be enabled."

    if settings.smtp_host not in LOCAL_SMTP_HOSTS and (not settings.smtp_username or not settings.smtp_password):
        return "Email delivery likely to fail: SMTP authentication credentials are missing (SMTP_USERNAME/SMTP_PASSWORD)."

    return None


def is_email_delivery_configured() -> bool:
    return email_delivery_issue_reason() is None


def build_password_reset_url(reset_token: str) -> str:
    base_url = settings.public_base_url.rstrip("/")
    return f"{base_url}/?mode=reset&token={quote(reset_token)}"


def send_password_reset_email(recipient_email: str, reset_token: str) -> bool:
    if not is_email_delivery_configured():
        logger.warning(email_delivery_issue_reason())
        return False

    message = EmailMessage()
    message["Subject"] = "Robin IA - Reinitialisation du mot de passe"
    message["From"] = (
        f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
        if settings.smtp_from_name
        else settings.smtp_from_email
    )
    message["To"] = recipient_email
    apply_standard_headers(message)

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
        logger.warning(email_delivery_issue_reason())
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
    apply_standard_headers(message)
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
        logger.warning(email_delivery_issue_reason())
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
    apply_standard_headers(message)
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