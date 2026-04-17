from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import sqlite3
from datetime import datetime

app = FastAPI(title="API de Ações em Campo")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_NAME = "acoes.db"

def get_conn():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS acoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ano INTEGER NOT NULL,
            mes INTEGER NOT NULL,
            numero_ticket TEXT,
            id_localidade TEXT,
            localidade TEXT,
            tempo_gasto_horas REAL DEFAULT 0,
            equipamentos_trocados INTEGER DEFAULT 0,
            equipamentos_configurados INTEGER DEFAULT 0,
            pontos_de_rede INTEGER DEFAULT 0,
            foto_antes_url TEXT,
            foto_depois_url TEXT,
            descricao_atendimento TEXT,
            data_criacao TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

init_db()

class AcaoCreate(BaseModel):
    ano: int
    mes: int
    numero_ticket: Optional[str] = None
    id_localidade: Optional[str] = None
    localidade: Optional[str] = None
    tempo_gasto_horas: Optional[float] = 0
    equipamentos_trocados: Optional[int] = 0
    equipamentos_configurados: Optional[int] = 0
    pontos_de_rede: Optional[int] = 0
    foto_antes_url: Optional[str] = None
    foto_depois_url: Optional[str] = None
    descricao_atendimento: Optional[str] = None

@app.get("/")
def root():
    return {"status": "ok", "message": "API online"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/acoes")
def listar_acoes():
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM acoes ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.post("/acoes")
def criar_acao(acao: AcaoCreate):
    if acao.ano < 2020 or acao.ano > 2100:
        raise HTTPException(status_code=400, detail="Ano inválido.")

    if acao.mes < 1 or acao.mes > 12:
        raise HTTPException(status_code=400, detail="Mês inválido.")

    conn = get_conn()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO acoes (
            ano,
            mes,
            numero_ticket,
            id_localidade,
            localidade,
            tempo_gasto_horas,
            equipamentos_trocados,
            equipamentos_configurados,
            pontos_de_rede,
            foto_antes_url,
            foto_depois_url,
            descricao_atendimento,
            data_criacao
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        acao.ano,
        acao.mes,
        acao.numero_ticket,
        acao.id_localidade,
        acao.localidade,
        acao.tempo_gasto_horas or 0,
        acao.equipamentos_trocados or 0,
        acao.equipamentos_configurados or 0,
        acao.pontos_de_rede or 0,
        acao.foto_antes_url,
        acao.foto_depois_url,
        acao.descricao_atendimento,
        datetime.now().isoformat()
    ))

    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    return {"status": "ok", "id": new_id}

@app.delete("/acoes/{acao_id}")
def excluir_acao(acao_id: int):
    conn = get_conn()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM acoes WHERE id = ?", (acao_id,))
    conn.commit()
    apagados = cursor.rowcount
    conn.close()

    if apagados == 0:
        raise HTTPException(status_code=404, detail="Registro não encontrado.")

    return {"status": "ok", "id": acao_id}