# -*- coding: utf-8 -*-
"""
Gera 1 JSON consolidado por ANO (sem separação por mês) a partir da planilha
KPIs_Atendimentos.xlsx na aba "Dados", lendo e gravando arquivos em:

  C:\KPIs_Atendimentos

Saída:
- KPIs_2025.json
- KPIs_2026.json
- ...

Conteúdo (por ano):
- ano_referencia
- tickets_atendidos_ano
- localidades_atendidas (distinct no ano)
- total_equipamentos_trocados (soma no ano)
- total_equipamentos_configurados (soma no ano)
- total_pontos_rede (soma no ano)
- itens (todas as linhas do ano, com "ano" e "mes" no início do item)

✔ Caminho fixo e simples
✔ Blindado contra arquivo aberto (Excel/lock) usando cópia temporária
✔ Aceita variações nos nomes das colunas (ex.: "Mês (1-12)")
✔ Gera um arquivo por ANO encontrado na planilha

Requisitos:
  pip install pandas openpyxl
"""

import json
import math
import re
import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd

# =============================
# CONFIGURAÇÃO FIXA
# =============================
BASE_DIR = Path(r"C:\KPIs_Atendimentos")
EXCEL_NAME = "KPIs_Atendimentos.xlsx"
SHEET_NAME = "Dados"

# Colunas lógicas + aliases aceitos
COLUMN_ALIASES = {
    "Ano": ["Ano"],
    "Mes": ["Mês", "Mes", "Mês (1-12)", "Mes (1-12)"],
    "Ticket": ["Nº Ticket", "No Ticket", "Número Ticket", "Numero Ticket"],
    "IdLocalidade": ["Id Localidade", "ID Localidade", "IdLocalidade"],
    "Localidade": ["Localidade"],
    "TempoHoras": ["Tempo (Horas)", "Tempo", "Horas", "Tempo Horas"],
    "EqTrocados": ["Qtde Equip. Trocados", "Qtd Equip. Trocados", "Equip. Trocados"],
    "EqConfigurados": ["Qtde Equip. Configurados", "Qtd Equip. Configurados", "Equip. Configurados"],
    "PontosRede": ["Pontos de Rede", "Pontos Rede"],
    "FotoAntes": ["Foto Antes", "Foto Antes (caminho/URL)"],
    "FotoDepois": ["Foto Depois", "Foto Depois (caminho/URL)"],
    # ✅ NOVO: Descrição Atendimento (coluna L na sua planilha)
    "DescricaoAtendimento": ["Descrição Atendimento", "Descricao Atendimento", "Descrição do Atendimento", "Descricao do Atendimento"],
}

# Colunas opcionais (se não existirem, não quebra o script)
OPTIONAL_KEYS = {"FotoAntes", "FotoDepois", "DescricaoAtendimento"}


# =============================
# HELPERS
# =============================
def _norm_header(s: str) -> str:
    return re.sub(r"\s+", " ", str(s).strip())


def _find_column(df: pd.DataFrame, candidates: list) -> Optional[str]:
    norm_cols = {_norm_header(c): c for c in df.columns}
    for cand in candidates:
        k = _norm_header(cand)
        if k in norm_cols:
            return norm_cols[k]
    return None


def _norm_str(v: Any) -> Optional[str]:
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    s = str(v).strip()
    return s if s else None


def _to_int(v: Any) -> int:
    try:
        return int(float(str(v).replace(",", ".")))
    except Exception:
        return 0


def _to_float(v: Any) -> float:
    try:
        return float(str(v).replace(",", "."))
    except Exception:
        return 0.0


def _to_number_series(s: pd.Series) -> pd.Series:
    return pd.to_numeric(
        s.astype(str).str.strip().str.replace(",", ".", regex=False),
        errors="coerce"
    ).fillna(0)


def _clean_int(v: Any) -> Optional[int]:
    try:
        if v is None or (isinstance(v, float) and math.isnan(v)):
            return None
        return int(float(v))
    except Exception:
        return None


# =============================
# MAIN
# =============================
def main():
    if not BASE_DIR.exists():
        raise FileNotFoundError(f"Pasta não encontrada: {BASE_DIR}")

    excel_path = BASE_DIR / EXCEL_NAME
    if not excel_path.exists():
        raise FileNotFoundError(f"Planilha não encontrada: {excel_path}")

    # 🔐 Workaround para Excel/lock
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_excel = Path(tmpdir) / excel_path.name
        shutil.copy2(excel_path, tmp_excel)
        df = pd.read_excel(tmp_excel, sheet_name=SHEET_NAME, engine="openpyxl")

    # Resolve colunas reais
    resolved: Dict[str, Optional[str]] = {
        k: _find_column(df, v) for k, v in COLUMN_ALIASES.items()
    }

    missing = [k for k, c in resolved.items() if c is None and k not in OPTIONAL_KEYS]
    if missing:
        raise ValueError(
            "Colunas obrigatórias não encontradas:\n- "
            + "\n- ".join(missing)
            + "\n\nColunas existentes:\n- "
            + "\n- ".join(map(str, df.columns.tolist()))
        )

    col_ano = resolved["Ano"]
    col_mes = resolved["Mes"]
    col_ticket = resolved["Ticket"]
    col_idloc = resolved["IdLocalidade"]
    col_localidade = resolved["Localidade"]
    col_tempo = resolved["TempoHoras"]
    col_troc = resolved["EqTrocados"]
    col_conf = resolved["EqConfigurados"]
    col_pontos = resolved["PontosRede"]
    col_foto_antes = resolved.get("FotoAntes")
    col_foto_depois = resolved.get("FotoDepois")
    col_desc_atend = resolved.get("DescricaoAtendimento")  # ✅ novo

    # Tipos numéricos
    df[col_ano] = pd.to_numeric(df[col_ano], errors="coerce")
    df[col_mes] = pd.to_numeric(df[col_mes], errors="coerce")

    # Anos existentes
    anos = sorted([int(a) for a in df[col_ano].dropna().unique().tolist() if str(a) != "nan"])
    if not anos:
        print("⚠️ Nenhum ano válido encontrado.")
        return

    total_arquivos = 0

    for ano in anos:
        dff = df[df[col_ano] == ano]
        if dff.empty:
            continue

        # Localidades únicas no ANO
        localidades_unicas = (
            dff[col_localidade]
            .dropna()
            .astype(str)
            .str.strip()
            .loc[lambda s: s != ""]
            .unique()
        )

        payload = {
            "ano_referencia": int(ano),
            "tickets_atendidos_ano": int(len(dff)),
            "localidades_atendidas": int(len(localidades_unicas)),
            "total_equipamentos_trocados": int(_to_number_series(dff[col_troc]).sum()),
            "total_equipamentos_configurados": int(_to_number_series(dff[col_conf]).sum()),
            "total_pontos_rede": int(_to_number_series(dff[col_pontos]).sum()),
            "itens": [
                {
                    # Ordem solicitada:
                    "ano": _clean_int(r[col_ano]),
                    "mes": _clean_int(r[col_mes]),
                    "numero_ticket": _norm_str(r[col_ticket]) or "",
                    "id_localidade": _norm_str(r[col_idloc]) or "",
                    "localidade": _norm_str(r[col_localidade]) or "",
                    "tempo_gasto_horas": _to_float(r[col_tempo]),
                    "equipamentos_trocados": _to_int(r[col_troc]),
                    "equipamentos_configurados": _to_int(r[col_conf]),
                    "pontos_de_rede": _to_int(r[col_pontos]),
                    "foto_antes_url": _norm_str(r[col_foto_antes]) if col_foto_antes else None,
                    "foto_depois_url": _norm_str(r[col_foto_depois]) if col_foto_depois else None,
                    # ✅ NOVO (coluna L "Descrição Atendimento")
                    "descricao_atendimento": _norm_str(r[col_desc_atend]) if col_desc_atend else None,
                }
                for _, r in dff.iterrows()
            ],
        }

        out_json = BASE_DIR / f"KPIs_{ano}.json"
        with open(out_json, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

        total_arquivos += 1
        print(
            f"✅ {out_json.name} | tickets={payload['tickets_atendidos_ano']} "
            f"| localidades={payload['localidades_atendidas']} "
            f"| troc={payload['total_equipamentos_trocados']} "
            f"| conf={payload['total_equipamentos_configurados']} "
            f"| pontos={payload['total_pontos_rede']}"
        )

    print("\n🏁 Finalizado com sucesso!")
    print(f"📁 Pasta: {BASE_DIR}")
    print(f"📦 Arquivos gerados: {total_arquivos}")


if __name__ == "__main__":
    main()