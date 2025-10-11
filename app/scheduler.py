from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
from database import get_connection
import traceback
import os
import shutil

# Instância global do agendador
scheduler = BackgroundScheduler(timezone="America/Sao_Paulo")

def verificar_cronjob():
    """Verifica no banco se há cron ativo e executa quando chegar a hora"""
    try:
        conn = get_connection()
        c = conn.cursor()
        c.execute("SELECT time, active FROM cronjob LIMIT 1")
        result = c.fetchone()
        conn.close()

        if not result:
            return
        
        dt_exec, ativo = result
        if not ativo:
            return

        if datetime.now() >= dt_exec:
            print(f"🚀 Executando tarefa agendada em {datetime.now()}")
            executar_tarefa()
            reagendar_cronjob(dt_exec)

    except Exception:
        print("❌ Erro ao verificar cronjob:")
        traceback.print_exc()


def executar_tarefa():
    """Ação que será executada pelo cronjob"""
    print("🧹 Limpando galeria agora...")

    try:
        # Caminho absoluto da pasta 'imagens'
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "tcc_frontend", "public", "imagens"))
        
        # Verifica se a pasta existe
        if not os.path.exists(base_dir):
            print("⚠️ Diretório de imagens não encontrado:", base_dir)
            return

        total_removidos = 0
        # Percorre cada subpasta (ex: img_catraca, img_real_time, etc.)
        for root, dirs, files in os.walk(base_dir):
            if files:
                removidos = 0
                for file in files:
                    file_path = os.path.join(root, file)
                    try:
                        os.remove(file_path)
                        removidos += 1
                    except Exception as e:
                        print(f"❌ Erro ao remover {file_path}: {e}")
                total_removidos += removidos
                print(f"🗑️ Pasta '{os.path.basename(root)}' — {removidos} arquivo(s) removido(s).")

        print(f"✅ Limpeza concluída — {total_removidos} arquivo(s) removido(s) no total.")

    except Exception:
        print("❌ Erro ao limpar galeria:")
        traceback.print_exc()



def reagendar_cronjob(dt_exec):
    """Reagenda o cronjob com base no tempo anterior"""
    try:
        conn = get_connection()
        c = conn.cursor()
        # Lê novamente o valor original salvo (ex: '10D 5H')
        c.execute("SELECT time, active FROM cronjob LIMIT 1")
        result = c.fetchone()
        conn.close()

        if not result or not result[1]:
            return

        # Calcula o próximo horário (mantém o mesmo intervalo)
        # Aqui lemos o último datetime salvo e somamos a diferença com o novo
        proximo_exec = dt_exec + (dt_exec - datetime.now())

        conn = get_connection()
        c = conn.cursor()
        c.execute(
            "UPDATE cronjob SET time = %s, active = 1",
            (proximo_exec.strftime("%Y-%m-%d %H:%M:%S"),)
        )
        conn.commit()
        conn.close()

        print(f"🔁 Próxima execução reagendada para: {proximo_exec}")

    except Exception:
        print("❌ Erro ao reagendar cronjob:")
        traceback.print_exc()


def iniciar_scheduler():
    """Inicia o scheduler em background"""
    try:
        scheduler.add_job(
            verificar_cronjob,
            "interval",
            seconds=10,
            id="cron_checker",
            replace_existing=True
        )
        scheduler.start()
        print("🕒 Scheduler iniciado — verificando cronjobs a cada 60 segundos.")
    except Exception:
        print("❌ Erro ao iniciar scheduler:")
        traceback.print_exc()
