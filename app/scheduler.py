from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta
from database import get_connection
import traceback, os, re

scheduler = BackgroundScheduler(timezone="America/Sao_Paulo")

def parse_time_string(time_str: str) -> timedelta:
    pattern = r'(\d+)\s*([DHMS])'
    matches = re.findall(pattern, time_str.upper())
    delta_kwargs = {'days': 0, 'hours': 0, 'minutes': 0, 'seconds': 0}
    for value, unit in matches:
        value = int(value)
        if unit == 'D':
            delta_kwargs['days'] += value
        elif unit == 'H':
            delta_kwargs['hours'] += value
        elif unit == 'M':
            delta_kwargs['minutes'] += value
        elif unit == 'S':
            delta_kwargs['seconds'] += value
    return timedelta(**delta_kwargs)

def verificar_cronjob():
    try:
        conn = get_connection()
        c = conn.cursor()
        c.execute("SELECT time, active, interval_text FROM cronjob LIMIT 1")
        result = c.fetchone()
        conn.close()

        if not result:
            return
        
        dt_exec, ativo, interval_text = result
        if not ativo or not interval_text:
            return

        if datetime.now() >= dt_exec:
            print(f"🚀 Executando tarefa agendada em {datetime.now()}")
            executar_tarefa()
            reagendar_cronjob(interval_text)

    except Exception:
        print("❌ Erro ao verificar cronjob:")
        traceback.print_exc()


def executar_tarefa():
    print("🧹 Limpando galeria agora...")
    try:
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "tcc_frontend", "public", "imagens"))
        if not os.path.exists(base_dir):
            print("⚠️ Diretório de imagens não encontrado:", base_dir)
            return

        total_removidos = 0
        for root, dirs, files in os.walk(base_dir):
            for file in files:
                os.remove(os.path.join(root, file))
                total_removidos += 1

        print(f"✅ Limpeza concluída — {total_removidos} arquivo(s) removido(s).")

    except Exception:
        traceback.print_exc()


def reagendar_cronjob(interval_text: str):
    try:
        delta = parse_time_string(interval_text)
        proxima_exec = datetime.now() + delta

        conn = get_connection()
        c = conn.cursor()
        c.execute(
            "UPDATE cronjob SET time = %s WHERE id = 1",
            (proxima_exec.strftime("%Y-%m-%d %H:%M:%S"),)
        )
        conn.commit()
        conn.close()

        print(f"🔁 Próxima execução reagendada para: {proxima_exec}")

    except Exception:
        print("❌ Erro ao reagendar cronjob:")
        traceback.print_exc()


def iniciar_scheduler():
    scheduler.add_job(verificar_cronjob, "interval", seconds=10, id="cron_checker", replace_existing=True)
    scheduler.start()
    print("🕒 Scheduler iniciado — verificando cronjobs a cada 10 segundos.")
