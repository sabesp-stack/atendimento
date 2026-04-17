export function fmtInt(n){ return (n ?? 0).toLocaleString("pt-BR"); }
export function minutesToHours(min){ return Math.max(0, Number(min || 0)) / 60; }
export function fmtHours(hours){ return (Number(hours || 0)).toFixed(1).replace(".", ","); }
export function pad2(n){ return String(n).padStart(2, "0"); }

export function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

export function safeUrl(u){ return String(u ?? "").trim(); }

export function sanitizeFilename(name){
  return String(name || "KPIs")
    .replace(/[\\/:*?"<>|]/g,"_")
    .replace(/\s+/g," ")
    .trim();
}

export function extractHourLabel(raw){
  const s = String(raw || "").trim();
  if (!s) return "—";

  const mTimeOnly = s.match(/\b([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/);
  if (mTimeOnly) return `${mTimeOnly[1]}:${mTimeOnly[2]}`;

  const d = new Date(s.replace(" ", "T"));
  if (!Number.isNaN(d.getTime())) return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

  const mAny = s.match(/([01]\d|2[0-3]):([0-5]\d)/);
  if (mAny) return `${mAny[1]}:${mAny[2]}`;

  return "—";
}

export function ticketLabel(it){
  const t = String(it?.numero_ticket || "").trim();
  return t || "—";
}

export function normalizeImgSrc(pathOrUrl){
  const s = String(pathOrUrl || "").trim();
  if (!s) return "";
  if (/^(https?:|data:|file:)/i.test(s)) return s;

  try{
    return new URL(s, window.location.href).href;
  }catch{
    return encodeURI(s);
  }
}

export function displayNameFromPath(raw){
  const s = String(raw || "").trim();
  if (!s) return "";

  const clean = s.split("#")[0].split("?")[0];

  if (/^file:\/\//i.test(clean)){
    const noProto = clean.replace(/^file:\/\//i, "");
    const parts = noProto.split("/");
    return parts[parts.length - 1] || "foto";
  }

  if (/^[a-zA-Z]:\\/.test(clean)){
    const parts = clean.split("\\");
    return parts[parts.length - 1] || "foto";
  }

  const parts = clean.split("/");
  return parts[parts.length - 1] || "foto";
}

export function sum(items, key){
  return items.reduce((acc, it) => acc + (Number(it[key]) || 0), 0);
}

export function uniqueCount(items, key){
  const set = new Set(items.map(it => String(it[key] ?? "").trim()).filter(Boolean));
  return set.size;
}

export function monthLabel(val){
  const map = {
    "01":"Janeiro","02":"Fevereiro","03":"Março","04":"Abril","05":"Maio","06":"Junho",
    "07":"Julho","08":"Agosto","09":"Setembro","10":"Outubro","11":"Novembro","12":"Dezembro",
    "all":"Todos"
  };
  return map[String(val)] || String(val);
}

export function yearLabel(val){
  return String(val) === "all" ? "Todos" : String(val);
}

export function safeItem(x){
  const horas = Number(x.tempo_gasto_horas ?? x["Tempo (Horas)"] ?? 0);
  const minutos = Number(x.tempo_gasto_min ?? 0);
  const tempoMin = (horas > 0 && minutos === 0) ? Math.round(horas * 60) : minutos;

  const rawDateTime =
    x.data_hora ?? x.dataHora ?? x.datetime ?? x.data_time ??
    x.data_inicio ?? x.dataInicio ?? x.inicio ?? x.start ??
    x.abertura ?? x.criado_em ?? x.created_at ??
    x.hora ?? x.hr ?? "";

  const ano = Number(x.ano ?? x.Ano ?? x.year ?? x["Ano"] ?? 0);
  const mes = Number(x.mes ?? x.Mes ?? x.month ?? x["Mês (1-12)"] ?? 0);

  return {
    ano: Number.isFinite(ano) ? ano : 0,
    mes: Number.isFinite(mes) ? mes : 0,
    dia: Number(x.dia ?? x.Dia ?? x["Dia"] ?? 0),
    numero_ticket: String(x.numero_ticket ?? x.ticket ?? x["Nº Ticket"] ?? ""),
    id_localidade: String(x.id_localidade ?? x.idLocalidade ?? x.id ?? x["Id Localidade"] ?? ""),
    localidade: String(x.localidade ?? x["Localidade"] ?? "N/D"),
    tempo_gasto_min: Number.isFinite(tempoMin) ? tempoMin : 0,
    tempo_gasto_horas: horas,
    equipamentos_trocados: Number(x.equipamentos_trocados ?? x.qtde_equip_trocados ?? x["Qtde Equip. Trocados"] ?? 0),
    equipamentos_configurados: Number(x.equipamentos_configurados ?? x.qtde_equip_configurados ?? x["Qtde Equip. Configurados"] ?? 0),
    pontos_de_rede: Number(x.pontos_de_rede ?? x["Pontos de Rede"] ?? 0),
    foto_antes_url: safeUrl(x.foto_antes_url ?? x["Foto Antes (caminho/URL)"]),
    foto_depois_url: safeUrl(x.foto_depois_url ?? x["Foto Depois (caminho/URL)"]),
    descricao_atendimento: String(x.descricao_atendimento ?? x.descricao ?? x.observacao ?? x["Descrição Atendimento"] ?? "").trim(),
    _raw_datetime: String(rawDateTime ?? "").trim(),
  };
}

export function validateData(data){
  if (!data || typeof data !== "object") return "JSON inválido (objeto raiz).";
  if (!Array.isArray(data.itens)) return "JSON inválido: campo 'itens' precisa ser uma lista.";
  return null;
}