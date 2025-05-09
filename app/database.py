import os
import mysql.connector

def get_connection():
    h,u,p,d = os.getenv("DB_HOST"),os.getenv("DB_USER"),os.getenv("DB_PASSWORD"),os.getenv("DB_NAME")
    if not all([h,u,p is not None,d]): raise Exception("Banco não configurado")
    return mysql.connector.connect(host=h,user=u,password=p,database=d)
