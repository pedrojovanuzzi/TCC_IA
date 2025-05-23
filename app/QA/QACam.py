import os
import sys

from fastapi import HTTPException


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.database import get_connection
from app.routers.files import decrypt_image


def list_all():
    conn = get_connection(); c = conn.cursor()
    c.execute("SELECT id,name,ip FROM cameras")
    rows = c.fetchall(); conn.close()
    print(rows)
    return [{"id": r[0], "name": r[1], "ip": r[2]} for r in rows]

def get_by_id(camera_id: int):
    conn = get_connection(); c = conn.cursor()
    c.execute("SELECT id,name,ip FROM cameras WHERE id=%s", (camera_id,))
    row = c.fetchone(); conn.close()
    print(row)
    if not row: raise HTTPException(404, "Câmera não encontrada")
    return {"id": row[0], "name": row[1], "ip": row[2]}

if __name__ == "__main__":
    get_by_id(3)