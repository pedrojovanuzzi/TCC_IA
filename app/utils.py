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

def verificar_e_enviar_alerta(result, image_path: str):
    """Verifica classes detectadas e envia alerta com imagem já descriptografada."""
    try:
        CLASSES_SEGURO = {"helmet", "glove", "glasses", "belt", "boots"}
        classes_detectadas = {result.names[int(b.cls[0])] for b in result.boxes}
        classes_perigosas = {c for c in classes_detectadas if c not in CLASSES_SEGURO}

        if classes_perigosas:
            assunto = "🚨 Alerta de Segurança - Detecção Irregular"
            corpo = f"""
            <h2>⚠️ Alerta de Segurança Detectado</h2>
            <p>Classes detectadas sem EPI: <b>{', '.join(classes_perigosas)}</b></p>
            <p>Data: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</p>
            <p>Verifique a imagem em anexo.</p>
            """

            destinatario = os.getenv("EMAIL_ALERT_RECEIVER", "seuemail@empresa.com")
            SMTP_SERVER = os.getenv("SMTP_SERVER")
            SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
            EMAIL_USER = os.getenv("EMAIL_USER")
            EMAIL_PASS = os.getenv("EMAIL_PASS")

            if not all([SMTP_SERVER, EMAIL_USER, EMAIL_PASS]):
                print("❌ Variáveis SMTP ausentes no .env — verifique SMTP_SERVER, EMAIL_USER e EMAIL_PASS")
                return

            if not os.path.exists(image_path):
                print(f"⚠️ Arquivo de imagem não encontrado: {image_path}")
                return

            # 🧩 Lê e descriptografa a imagem automaticamente
            with open(image_path, "rb") as f:
                encrypted_data = f.read()
            try:
                img_data = fernet.decrypt(encrypted_data)
            except Exception:
                print("⚠️ Imagem não estava criptografada, enviando como está.")
                img_data = encrypted_data

            # Monta o e-mail
            msg = MIMEMultipart()
            msg["From"] = EMAIL_USER
            msg["To"] = destinatario
            msg["Date"] = formatdate(localtime=True)
            msg["Subject"] = assunto
            msg.attach(MIMEText(corpo, "html"))

            # Detecta tipo MIME da imagem
            mime_type, _ = mimetypes.guess_type(image_path)
            if mime_type is None:
                mime_type = "image/jpeg"
            main_type, sub_type = mime_type.split("/", 1)

            image = MIMEImage(img_data, _subtype=sub_type, name=os.path.basename(image_path))
            msg.attach(image)

            print(f"📡 Enviando e-mail via {SMTP_SERVER}:{SMTP_PORT} de {EMAIL_USER} para {destinatario}")

            smtp = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
            smtp.starttls()
            smtp.login(EMAIL_USER, EMAIL_PASS)
            smtp.send_message(msg)
            smtp.quit()

            print(f"✅ E-mail enviado com sucesso para {destinatario}")
            log_operation(0, f"E-mail de alerta enviado ({', '.join(classes_perigosas)}) para {destinatario}")

        else:
            print("✅ Nenhum alerta necessário — todos os EPIs foram detectados.")

    except Exception:
        print("❌ Erro ao verificar e enviar alerta:")
        traceback.print_exc()