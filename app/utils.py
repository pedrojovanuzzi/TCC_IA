from datetime import datetime

from app.config import ENCRYPTION_KEY
from .database import get_connection
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from email.utils import formatdate
import os
import traceback
from dotenv import load_dotenv
import mimetypes
from cryptography.fernet import Fernet
import threading

load_dotenv()
FERNET_KEY = ENCRYPTION_KEY
fernet = Fernet(FERNET_KEY)


def log_operation(user_id: int, operacao: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "INSERT INTO register (`user`, operacao, date) VALUES (%s, %s, CURRENT_TIMESTAMP)",
        (user_id, operacao),
    )
    conn.commit()
    conn.close()
    
    
def enviar_email_em_background(results, alert_path):
    """Executa o envio de e-mail em uma thread separada."""
    def _thread_func():
        try:
            verificar_e_enviar_alerta(results, alert_path)
        except Exception as e:
            print("❌ Erro no envio de e-mail em background:", e)
    threading.Thread(target=_thread_func, daemon=True).start()

def verificar_e_enviar_alerta(result, media_path: str):
    """Verifica classes detectadas e envia alerta com imagem/vídeo descriptografado."""
    try:
        CLASSES_SEGURO = {"helmet", "glove", "glasses", "belt", "boots"}
        classes_detectadas = {result.names[int(b.cls[0])] for b in result.boxes}
        classes_perigosas = {c for c in classes_detectadas if c not in CLASSES_SEGURO}

        if not classes_perigosas:
            print("✅ Nenhum alerta necessário — todos os EPIs foram detectados.")
            return

        assunto = "🚨 Alerta de Segurança - Detecção Irregular"
        corpo = f"""
        <h2>⚠️ Alerta de Segurança Detectado</h2>
        <p>Classes detectadas sem EPI: <b>{', '.join(classes_perigosas)}</b></p>
        <p>Data: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</p>
        <p>Verifique o anexo para mais detalhes.</p>
        """

        destinatario = os.getenv("EMAIL_ALERT_RECEIVER", "seuemail@empresa.com")
        SMTP_SERVER = os.getenv("SMTP_SERVER")
        SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
        EMAIL_USER = os.getenv("EMAIL_USER")
        EMAIL_PASS = os.getenv("EMAIL_PASS")

        if not all([SMTP_SERVER, EMAIL_USER, EMAIL_PASS]):
            print("❌ Variáveis SMTP ausentes no .env — verifique SMTP_SERVER, EMAIL_USER e EMAIL_PASS")
            return

        if not os.path.exists(media_path):
            print(f"⚠️ Arquivo não encontrado: {media_path}")
            return

        # 🔓 Descriptografa (se necessário)
        with open(media_path, "rb") as f:
            encrypted_data = f.read()
        try:
            media_data = fernet.decrypt(encrypted_data)
        except Exception:
            print("⚠️ Arquivo não estava criptografado, enviando como está.")
            media_data = encrypted_data

        # 📩 Monta o e-mail
        msg = MIMEMultipart()
        msg["From"] = EMAIL_USER
        msg["To"] = destinatario
        msg["Date"] = formatdate(localtime=True)
        msg["Subject"] = assunto
        msg.attach(MIMEText(corpo, "html"))

        # 🧩 Detecta tipo MIME (automático)
        mime_type, _ = mimetypes.guess_type(media_path)
        if mime_type is None:
            mime_type = "application/octet-stream"
        main_type, sub_type = mime_type.split("/", 1)

        filename = os.path.basename(media_path)

        # 🔁 Escolhe tipo correto (imagem, vídeo, etc.)
        if main_type == "image":
            from email.mime.image import MIMEImage
            part = MIMEImage(media_data, _subtype=sub_type, name=filename)
        elif main_type == "video":
            from email.mime.base import MIMEBase
            from email import encoders
            part = MIMEBase(main_type, sub_type)
            part.set_payload(media_data)
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", f'attachment; filename="{filename}"')
        else:
            from email.mime.base import MIMEBase
            from email import encoders
            part = MIMEBase(main_type, sub_type)
            part.set_payload(media_data)
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", f'attachment; filename="{filename}"')

        msg.attach(part)

        print(f"📡 Enviando alerta via {SMTP_SERVER}:{SMTP_PORT} para {destinatario} ({filename})")

        smtp = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        smtp.starttls()
        smtp.login(EMAIL_USER, EMAIL_PASS)
        smtp.send_message(msg)
        smtp.quit()

        print(f"✅ Alerta enviado com sucesso ({filename}) para {destinatario}")
        log_operation(0, f"E-mail de alerta enviado ({', '.join(classes_perigosas)}) para {destinatario}")

    except Exception:
        print("❌ Erro ao verificar e enviar alerta:")
        traceback.print_exc()
