from fastapi import APIRouter, Depends, HTTPException, Body
from ..schemas import TokenRequest
from ..auth import criar_token, verificar_token
from ..database import get_connection
from ..utils import log_operation
import hashlib

router = APIRouter()

@router.post("/token")
def login(data: TokenRequest):
    h = hashlib.sha256(data.password.encode()).hexdigest()
    conn = get_connection(); c=conn.cursor()
    c.execute("SELECT id, nivel, login FROM users WHERE login=%s AND password=%s", (data.username, h))
    r = c.fetchone(); conn.close()
    if not r: raise HTTPException(401,"Login ou senha inválidos")
    return {"access_token": criar_token({"user_id":r[0],"nivel":r[1], "username": r[2]}),"token_type":"bearer"}

@router.get("/users")
def listar(token=Depends(verificar_token)):
    if token["nivel"]<3: raise HTTPException(403,"Permissão negada")
    conn = get_connection(); c=conn.cursor()
    c.execute("SELECT id,login,nivel FROM users WHERE login!='admin'")
    u=[{"id":i[0],"login":i[1],"nivel":i[2]} for i in c.fetchall()]
    conn.close()
    return u

@router.post("/users")
def criar(user: dict = Body(...), token=Depends(verificar_token)):
    if not user.get("login") or not user.get("password"): raise HTTPException(400,"Dados obrigatórios")
    if not isinstance(user.get("nivel",1),int) or not 1<=user["nivel"]<=3: raise HTTPException(400,"Nível inválido")
    h=hashlib.sha256(user["password"].encode()).hexdigest()
    conn = get_connection(); c=conn.cursor()
    c.execute("INSERT INTO users (login,password,nivel) VALUES (%s,%s,%s)",(user["login"],h,user["nivel"]))
    conn.commit(); conn.close()
    log_operation(token["user_id"],f"criou usuário '{user['login']}' nível {user['nivel']}")
    return {"success":True,"login":user["login"],"nivel":user["nivel"]}

@router.delete("/users/{user_id}")
def deletar(user_id: int, token=Depends(verificar_token)):
    conn=get_connection();c=conn.cursor()
    c.execute("SELECT login FROM users WHERE id=%s",(user_id,))
    r=c.fetchone()
    if not r: conn.close(); raise HTTPException(404,"Usuário não encontrado")
    login = r[0]
    c.execute("DELETE FROM users WHERE id=%s",(user_id,)); conn.commit(); conn.close()
    log_operation(token["user_id"],f"deletou usuário '{login}' (id={user_id})")
    return {"success":True}

@router.put("/users/{user_id}")
def atualizar(user_id: int, data: dict = Body(...), token=Depends(verificar_token)):
    u,p,n=[],[],[]
    if data.get("login"): u.append("login=%s"); p.append(data["login"])
    if data.get("password"): import hashlib; h=hashlib.sha256(data["password"].encode()).hexdigest();u.append("password=%s");p.append(h)
    if data.get("nivel") is not None: u.append("nivel=%s"); p.append(data["nivel"])
    if not u: raise HTTPException(400,"Nada para atualizar")
    p.append(user_id)
    conn=get_connection();c=conn.cursor()
    c.execute(f"UPDATE users SET {','.join(u)} WHERE id=%s",tuple(p))
    conn.commit(); conn.close()
    log_operation(token["user_id"],f"atualizou usuário id={user_id}")
    return {"success":True}
