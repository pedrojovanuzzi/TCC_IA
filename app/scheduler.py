from apscheduler.schedulers.background import BackgroundScheduler  # scheduler em background para tarefas agendadas
from datetime import datetime, timedelta  # datas/horas e intervalo de tempo
from app.utils import log_operation  # função de auditoria/log
from database import get_connection  # abre conexão com o banco de dados
import traceback, os, re  # rastrear exceções, operações de SO e regex
  
  

scheduler = BackgroundScheduler(timezone="America/Sao_Paulo")  # instancia o agendador com fuso de São Paulo

def parse_time_string(time_str: str) -> timedelta:  # converte texto como '10D 2H 30M' em timedelta
    pattern = r'(\d+)\s*([DHMS])'  # captura pares número+unidade (D/H/M/S)
    matches = re.findall(pattern, time_str.upper())  # encontra todas as ocorrências no texto (maiúsculas)
    delta_kwargs = {'days': 0, 'hours': 0, 'minutes': 0, 'seconds': 0}  # acumula valores por unidade
    for value, unit in matches:  # percorre cada par encontrado
        value = int(value)  # transforma número capturado em inteiro
        if unit == 'D':  # dias
            delta_kwargs['days'] += value  # soma dias
        elif unit == 'H':  # horas
            delta_kwargs['hours'] += value  # soma horas
        elif unit == 'M':  # minutos
            delta_kwargs['minutes'] += value  # soma minutos
        elif unit == 'S':  # segundos
            delta_kwargs['seconds'] += value  # soma segundos
    return timedelta(**delta_kwargs)  # cria e retorna timedelta com os acumulados

def verificar_cronjob():  # verifica na base se há cronjob ativo para executar
    try:  # protege contra falhas no processo
        conn = get_connection()  # abre conexão com o banco
        c = conn.cursor()  # cria cursor
        c.execute("SELECT time, active, interval_text FROM cronjob LIMIT 1")  # busca única configuração de cron
        result = c.fetchone()  # lê a linha encontrada (ou None)
        conn.close()  # fecha conexão

        if not result:  # se não há configuração
            return  # sai sem fazer nada
        
        dt_exec, ativo, interval_text = result  # desempacota: quando executar, se está ativo, e texto do intervalo
        if not ativo or not interval_text:  # se inativo ou sem intervalo
            return  # não executa

        if datetime.now() >= dt_exec:  # chegou a hora de executar?
            print(f"🚀 Executando tarefa agendada em {datetime.now()}")  # log de execução
            executar_tarefa()  # roda a tarefa agendada
            reagendar_cronjob(interval_text)  # calcula e grava próxima execução

    except Exception:  # captura qualquer exceção
        print("❌ Erro ao verificar cronjob:")  # log de erro
        traceback.print_exc()  # imprime stack trace para diagnóstico

def executar_tarefa():  # tarefa: limpar diretório da galeria de imagens
    print("🧹 Limpando galeria agora...")  # log informativo
    try:  # protege limpeza contra erros de SO
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "tcc_frontend", "public", "imagens"))  # resolve caminho absoluto da pasta de imagens
        if not os.path.exists(base_dir):  # se a pasta não existe
            print("⚠️ Diretório de imagens não encontrado:", base_dir)  # avisa inexistência
            return  # encerra sem erro

        total_removidos = 0  # contador de arquivos removidos
        for root, dirs, files in os.walk(base_dir):  # percorre recursivamente a pasta
            for file in files:  # itera arquivos encontrados
                os.remove(os.path.join(root, file))  # remove arquivo
                total_removidos += 1  # incrementa contador

        print(f"✅ Limpeza concluída — {total_removidos} arquivo(s) removido(s).")  # log de sucesso
        log_operation(  # registra a operação de limpeza no log/auditoria
            user_id=0,  # 0 indica operação automática (cron)
            operacao=f"Limpeza automática da galeria ({total_removidos} arquivo[s] removido[s])"  # descrição da operação
        )
    except Exception:  # captura erros durante a limpeza
        traceback.print_exc()  # exibe stack trace

def reagendar_cronjob(interval_text: str):  # grava próximo horário de execução com base no intervalo definido
    try:  # protege operação de reagendamento
        delta = parse_time_string(interval_text)  # converte texto de intervalo em timedelta
        proxima_exec = datetime.now() + delta  # calcula próxima execução

        conn = get_connection()  # abre conexão
        c = conn.cursor()  # cursor
        c.execute(  # atualiza coluna 'time' para o próximo horário (linha id=1)
            "UPDATE cronjob SET time = %s WHERE id = 1",
            (proxima_exec.strftime("%Y-%m-%d %H:%M:%S"),)
        )
        conn.commit()  # confirma transação
        conn.close()  # fecha conexão

        print(f"🔁 Próxima execução reagendada para: {proxima_exec}")  # log do novo agendamento

    except Exception:  # falha no reagendamento
        print("❌ Erro ao reagendar cronjob:")  # log de erro
        traceback.print_exc()  # exibe stack trace

def iniciar_scheduler():  # inicializa o agendador em background
    scheduler.add_job(verificar_cronjob, "interval", seconds=10, id="cron_checker", replace_existing=True)  # agenda verificação a cada 10s
    scheduler.start()  # inicia o scheduler
    print("🕒 Scheduler iniciado — verificando cronjobs a cada 10 segundos.")  # log inicial
