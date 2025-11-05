from datetime import datetime  # usado para registrar data/hora nos e-mails e logs

from app.config import ENCRYPTION_KEY  # chave de criptografia carregada da configuração do app
from .database import get_connection  # função para abrir conexão com o banco
import smtplib  # cliente SMTP para envio de e-mails
from email.mime.multipart import MIMEMultipart  # e-mail multipart (corpo + anexos)
from email.mime.text import MIMEText  # parte de texto/HTML do e-mail
from email.mime.image import MIMEImage  # parte de imagem do e-mail (quando for imagem)
from email.utils import formatdate  # utilitário para formatar data do cabeçalho do e-mail
import os  # acesso a variáveis/paths do sistema
import traceback  # impressão do stack trace em exceções
from dotenv import load_dotenv  # carrega variáveis de ambiente do arquivo .env
import mimetypes  # detecta tipo MIME do anexo pelo nome do arquivo
from cryptography.fernet import Fernet  # criptografia simétrica (Fernet)
import threading  # executar envio de e-mail em background (thread)

load_dotenv()  # carrega variáveis do .env para o ambiente
FERNET_KEY = ENCRYPTION_KEY  # obtém a chave de criptografia definida na config
fernet = Fernet(FERNET_KEY)  # instancia o cifrador Fernet com a chave

def log_operation(user_id: int, operacao: str):  # registra uma operação no log/auditoria do sistema
    conn = get_connection()  # abre conexão com o banco
    c = conn.cursor()  # cria cursor
    c.execute(  # insere registro na tabela 'register' com usuário, operação e data atual
        "INSERT INTO register (`user`, operacao, date) VALUES (%s, %s, CURRENT_TIMESTAMP)",
        (user_id, operacao),
    )
    conn.commit()  # confirma transação
    conn.close()  # fecha conexão
    
    
def enviar_email_em_background(results, alert_path):  # dispara verificação/alerta de e-mail em uma thread separada
    """Executa o envio de e-mail em uma thread separada."""  # docstring explicativa
    def _thread_func():  # função interna executada na thread
        try:
            verificar_e_enviar_alerta(results, alert_path)  # chama rotina de verificação/envio
        except Exception as e:
            print("❌ Erro no envio de e-mail em background:", e)  # loga falha no envio em background
    threading.Thread(target=_thread_func, daemon=True).start()  # inicia thread daemon para não bloquear o processo

def verificar_e_enviar_alerta(result, media_path: str):  # verifica classes não seguras e envia e-mail com anexo (imagem/vídeo)
    """Verifica classes detectadas e envia alerta com imagem/vídeo descriptografado."""  # docstring
    try:
        CLASSES_SEGURO = {"helmet", "glove", "glasses", "belt", "boots"}  # conjunto de classes consideradas seguras (EPI)
        classes_detectadas = {result.names[int(b.cls[0])] for b in result.boxes}  # extrai nomes das classes detectadas no resultado
        classes_perigosas = {c for c in classes_detectadas if c not in CLASSES_SEGURO}  # filtra classes não seguras (risco)

        if not classes_perigosas:  # se não há classes perigosas
            print("✅ Nenhum alerta necessário — todos os EPIs foram detectados.")  # informa que não é preciso enviar alerta
            return  # encerra a função

        assunto = "🚨 Alerta de Segurança - Detecção Irregular"  # assunto do e-mail
        corpo = f"""  # corpo HTML do e-mail (template)
        <h2>⚠️ Alerta de Segurança Detectado</h2>
        <p>Classes detectadas sem EPI: <b>{', '.join(classes_perigosas)}</b></p>
        <p>Data: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}</p>
        <p>Verifique o anexo para mais detalhes.</p>
        """  # fim do corpo HTML

        # 🧩 Busca e-mail do banco de dados do cronjob
        conn = get_connection()  # abre conexão
        c = conn.cursor()  # cursor
        c.execute("SELECT email FROM cronjob LIMIT 1")  # obtém e-mail configurado no cronjob
        row = c.fetchone()  # lê resultado
        conn.close()  # fecha conexão

        if not row or not row[0]:  # se não há e-mail configurado
            print("⚠️ Nenhum e-mail configurado no cronjob. Alerta não enviado.")  # avisa ausência de e-mail
            return  # encerra sem enviar

        destinatario = row[0].strip()  # normaliza e-mail (trim)
        print(f"📨 E-mail do cronjob encontrado: {destinatario}")  # loga e-mail encontrado

        # 🔐 Credenciais SMTP (continuam vindas do .env)
        SMTP_SERVER = os.getenv("SMTP_SERVER")  # host SMTP
        SMTP_PORT = int(os.getenv("SMTP_PORT", 587))  # porta SMTP (padrão 587)
        EMAIL_USER = os.getenv("EMAIL_USER")  # usuário/conta de e-mail
        EMAIL_PASS = os.getenv("EMAIL_PASS")  # senha/app password do e-mail

        if not all([SMTP_SERVER, EMAIL_USER, EMAIL_PASS]):  # valida presença das credenciais mínimas
            print("❌ Variáveis SMTP ausentes no .env — verifique SMTP_SERVER, EMAIL_USER e EMAIL_PASS")  # loga problema nas variáveis
            return  # encerra sem enviar

        if not os.path.exists(media_path):  # verifica se o arquivo existe
            print(f"⚠️ Arquivo não encontrado: {media_path}")  # loga arquivo ausente
            return  # encerra

        # 🔓 Descriptografa (se necessário)
        with open(media_path, "rb") as f:  # abre o arquivo para leitura binária
            encrypted_data = f.read()  # lê bytes do arquivo
        try:
            media_data = fernet.decrypt(encrypted_data)  # tenta descriptografar conteúdo
        except Exception:
            print("⚠️ Arquivo não estava criptografado, enviando como está.")  # se falhar, assume que não estava cifrado
            media_data = encrypted_data  # usa dados originais

        # 🧱 Monta o e-mail
        msg = MIMEMultipart()  # cria e-mail multipart (cabeçalhos + partes)
        msg["From"] = EMAIL_USER  # remetente
        msg["To"] = destinatario  # destinatário
        msg["Date"] = formatdate(localtime=True)  # data formatada
        msg["Subject"] = assunto  # assunto
        msg.attach(MIMEText(corpo, "html"))  # anexa corpo HTML

        # 🧩 Detecta tipo MIME (imagem/vídeo)
        mime_type, _ = mimetypes.guess_type(media_path)  # detecta tipo pelo nome do arquivo
        if mime_type is None:  # fallback quando não reconhece
            mime_type = "application/octet-stream"  # tipo genérico binário
        main_type, sub_type = mime_type.split("/", 1)  # separa em tipo principal e subtipo

        filename = os.path.basename(media_path)  # nome do arquivo para cabeçalho de anexo

        # 🔁 Anexa arquivo corretamente
        if main_type == "image":  # se for imagem, usa MIMEImage
            from email.mime.image import MIMEImage  # import local (garante classe)
            part = MIMEImage(media_data, _subtype=sub_type, name=filename)  # cria parte de imagem
        else:  # para outros tipos (ex.: vídeo)
            from email.mime.base import MIMEBase  # classe base para binários
            from email import encoders  # utilitário para base64
            part = MIMEBase(main_type, sub_type)  # cria parte genérica
            part.set_payload(media_data)  # define payload com bytes
            encoders.encode_base64(part)  # codifica em base64
            part.add_header("Content-Disposition", f'attachment; filename="{filename}"')  # cabeçalho de anexo

        msg.attach(part)  # anexa a parte (imagem/vídeo) ao e-mail

        # 📤 Envia
        print(f"📡 Enviando alerta via {SMTP_SERVER}:{SMTP_PORT} para {destinatario} ({filename})")  # loga envio
        smtp = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)  # conecta ao servidor SMTP
        smtp.starttls()  # inicia TLS (criptografa a sessão)
        smtp.login(EMAIL_USER, EMAIL_PASS)  # autentica no servidor SMTP
        smtp.send_message(msg)  # envia a mensagem completa
        smtp.quit()  # encerra conexão SMTP

        print(f"✅ Alerta enviado com sucesso ({filename}) para {destinatario}")  # confirma envio
        log_operation(0, f"E-mail de alerta enviado ({', '.join(classes_perigosas)}) para {destinatario}")  # registra no log a operação de envio

    except Exception:  # captura falhas na verificação/envio
        print("❌ Erro ao verificar e enviar alerta:")  # loga erro
        traceback.print_exc()  # imprime stack trace para diagnóstico
