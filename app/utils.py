from .database import get_connection

def log_operation(user_id: int, operacao: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("INSERT INTO register (`user`, operacao) VALUES (%s,%s)", (user_id,operacao))
    conn.commit()
    conn.close()
