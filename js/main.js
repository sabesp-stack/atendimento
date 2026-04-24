const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzAu0TEQPL2TwAgyf2Hf-7cxhgqtRYGJNxaZTPKSCEgE8cIrLh_sgqt0nItZj9kz--nQQ/exec";

console.log("MAIN.JS CARREGADO - VERSAO FOTOS 2026-04-24");

const els = {
  subtitle: document.getElementById("subtitle"),
  mesSelect: document.getElementById("mesSelect"),
  anoSelect: document.getElementById("anoSelect"),

  idLocalidadeSearch: document.getElementById("idLocalidadeSearch"),
  ticketSearch: document.getElementById("ticketSearch"),
  btnClearSearch: document.getElementById("btnClearSearch"),

  btnExportPPTX: document.getElementById("btnExportPPTX"),
  btnExportPDF: document.getElementById("btnExportPDF"),
  btnAcoes: document.getElementById("btnAcoes"),
  btnLogout: document.getElementById("btnLogout"),
  errorBox: document.getElementById("errorBox"),

  kpiTickets: document.getElementById("kpiTickets"),
  kpiTicketsSub: document.getElementById("kpiTicketsSub"),
  kpiLocais: document.getElementById("kpiLocais"),
  kpiEquip: document.getElementById("kpiEquip"),
  kpiEquipSub: document.getElementById("kpiEquipSub"),
  kpiEquipCfg: document.getElementById("kpiEquipCfg"),
  kpiEquipCfgSub: document.getElementById("kpiEquipCfgSub"),
  kpiTempoHoras: document.getElementById("kpiTempoHoras"),
  kpiTempoHorasSub: document.getElementById("kpiTempoHorasSub"),
  kpiMediaPontos: document.getElementById("kpiMediaPontos"),
  kpiMediaPontosSub: document.getElementById("kpiMediaPontosSub"),

  tbody: document.getElementById("tbodyLocais"),
  totalFiltro: document.getElementById("totalFiltro"),

  cvTempo: document.getElementById("chartTempo"),
  cvTickets: document.getElementById("chartTickets"),
  cvEquip: document.getElementById("chartEquip"),

  selectedInfo: document.getElementById("selectedInfo"),
  galleryHint: document.getElementById("galleryHint"),
  beforeBox: document.getElementById("beforeBox"),
  afterBox: document.getElementById("afterBox"),
  beforeImg: document.getElementById("beforeImg"),
  afterImg: document.getElementById("afterImg"),
  beforeMeta: document.getElementById("beforeMeta"),
  afterMeta: document.getElementById("afterMeta"),
  beforeLink: document.getElementById("beforeLink"),
  afterLink: document.getElementById("afterLink"),

  descAtendimento: document.getElementById("descAtendimento"),
};

let rawData = null;
let allItems = [];
let filteredItems = [];
let selectedIdx = null;

const MESES = [
  "",
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];

/* =========================================================
   Helpers gerais
   ========================================================= */

function safeText(v, fallback = "") {
  return String(v ?? fallback).trim();
}

function safeNumber(v, fallback = 0) {
  if (typeof v === "string") {
    const normalized = v.replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : fallback;
  }

  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeUrl(v) {
  return safeText(v, "");
}

/*
  Normaliza links do Google Drive para exibição em <img src="">.

  Suporta:
  - https://drive.google.com/thumbnail?id=ID&sz=w1600
  - https://drive.google.com/uc?export=view&id=ID
  - https://drive.google.com/file/d/ID/view
  - https://drive.google.com/open?id=ID
*/
function normalizeDriveImageUrl(url) {
  const value = safeText(url);

  if (!value) return "";

  if (!value.includes("drive.google.com")) {
    return value;
  }

  const idMatch =
    value.match(/[?&]id=([^&]+)/) ||
    value.match(/\/file\/d\/([^/]+)/) ||
    value.match(/\/d\/([^/]+)/);

  if (idMatch && idMatch[1]) {
    const fileId = decodeURIComponent(idMatch[1]);
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`;
  }

  return value;
}

function fmtInt(n) {
  return safeNumber(n, 0).toLocaleString("pt-BR");
}

function fmtHours(hours) {
  return safeNumber(hours, 0).toFixed(1).replace(".", ",");
}

function monthName(m) {
  return MESES[safeNumber(m, 0)] || `Mês ${m}`;
}

function showError(msg = "") {
  if (!els.errorBox) return;
  els.errorBox.textContent = msg || "";
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================================================
   Estado vazio / validação
   ========================================================= */

function setEmptyState() {
  if (els.kpiTickets) els.kpiTickets.textContent = "—";
  if (els.kpiTicketsSub) els.kpiTicketsSub.textContent = "—";
  if (els.kpiLocais) els.kpiLocais.textContent = "—";
  if (els.kpiEquip) els.kpiEquip.textContent = "—";
  if (els.kpiEquipSub) els.kpiEquipSub.textContent = "—";
  if (els.kpiEquipCfg) els.kpiEquipCfg.textContent = "—";
  if (els.kpiEquipCfgSub) els.kpiEquipCfgSub.textContent = "—";
  if (els.kpiTempoHoras) els.kpiTempoHoras.textContent = "—";
  if (els.kpiTempoHorasSub) els.kpiTempoHorasSub.textContent = "—";
  if (els.kpiMediaPontos) els.kpiMediaPontos.textContent = "—";
  if (els.kpiMediaPontosSub) els.kpiMediaPontosSub.textContent = "—";
  if (els.totalFiltro) els.totalFiltro.textContent = "—";

  if (els.tbody) {
    els.tbody.innerHTML = `<tr><td colspan="7" class="muted">Carregando dados do Google Sheets...</td></tr>`;
  }

  if (els.descAtendimento) {
    els.descAtendimento.textContent = "—";
  }

  clearGallery();
  clearCanvas(els.cvTempo);
  clearCanvas(els.cvTickets);
  clearCanvas(els.cvEquip);
}

function validateData(data) {
  if (!data || typeof data !== "object") {
    return "Dados inválidos: objeto raiz não encontrado.";
  }

  if (!Array.isArray(data.itens)) {
    return "Dados inválidos: campo 'itens' precisa ser uma lista.";
  }

  return null;
}

function normalizeItem(x, fallbackAno = 0, fallbackMes = 0) {
  const ano = safeNumber(
    x.ano ?? x.Ano ?? x.year ?? x.ano_referencia,
    fallbackAno
  );

  const mes = safeNumber(
    x.mes ?? x.Mes ?? x["Mês"] ?? x["Mês (1-12)"] ?? x.month ?? x.mes_referencia,
    fallbackMes
  );

  const tempoHoras = safeNumber(
    x.tempo_gasto_horas ??
    x["tempo_gasto_horas"] ??
    x["Tempo (Horas)"] ??
    x.tempo_horas ??
    x.horas ??
    x.tempo ??
    x["Tempo"] ??
    0,
    0
  );

  return {
    ano,
    mes,
    dia: safeNumber(x.dia ?? x.Dia, 0),

    numero_ticket: safeText(
      x.numero_ticket ??
      x.ticket ??
      x["Nº Ticket"] ??
      x["numero_ticket"]
    ),

    id_localidade: safeText(
      x.id_localidade ??
      x.idLocalidade ??
      x["Id Localidade"] ??
      x.id
    ),

    localidade: safeText(
      x.localidade ??
      x["Localidade"],
      "N/D"
    ),

    tempo_gasto_horas: tempoHoras,

    equipamentos_trocados: safeNumber(
      x.equipamentos_trocados ??
      x.qtde_equip_trocados ??
      x["Qtde Equip. Trocados"],
      0
    ),

    equipamentos_configurados: safeNumber(
      x.equipamentos_configurados ??
      x.qtde_equip_configurados ??
      x["Qtde Equip. Configurados"],
      0
    ),

    pontos_de_rede: safeNumber(
      x.pontos_de_rede ??
      x["Pontos de Rede"],
      0
    ),

    foto_antes_url: safeUrl(
      x.foto_antes_url ??
      x["Foto Antes (caminho/URL)"] ??
      x.foto_antes
    ),

    foto_depois_url: safeUrl(
      x.foto_depois_url ??
      x["Foto Depois (caminho/URL)"] ??
      x.foto_depois
    ),

    descricao_atendimento: safeText(
      x.descricao_atendimento ??
      x.descricao ??
      x.observacao ??
      x["Descrição Atendimento"],
      ""
    ),
  };
}

/* =========================================================
   Selects / filtros
   ========================================================= */

function initSelectPlaceholders() {
  if (els.mesSelect) {
    els.mesSelect.innerHTML = `
      <option value="all" selected>Todos</option>
      <option value="1">01 - Janeiro</option>
      <option value="2">02 - Fevereiro</option>
      <option value="3">03 - Março</option>
      <option value="4">04 - Abril</option>
      <option value="5">05 - Maio</option>
      <option value="6">06 - Junho</option>
      <option value="7">07 - Julho</option>
      <option value="8">08 - Agosto</option>
      <option value="9">09 - Setembro</option>
      <option value="10">10 - Outubro</option>
      <option value="11">11 - Novembro</option>
      <option value="12">12 - Dezembro</option>
    `;
  }

  if (els.anoSelect) {
    els.anoSelect.innerHTML = `<option value="all" selected>Todos</option>`;

    for (let ano = 2025; ano <= 2035; ano++) {
      const op = document.createElement("option");
      op.value = String(ano);
      op.textContent = String(ano);
      els.anoSelect.appendChild(op);
    }
  }
}

function applyFilters(items) {
  let out = [...items];

  const anoVal = String(els.anoSelect?.value || "all");
  const mesVal = String(els.mesSelect?.value || "all");
  const idQuery = safeText(els.idLocalidadeSearch?.value).toLowerCase();
  const ticketQuery = safeText(els.ticketSearch?.value).toLowerCase();

  if (anoVal !== "all") {
    out = out.filter((i) => Number(i.ano) === Number(anoVal));
  }

  if (mesVal !== "all") {
    out = out.filter((i) => Number(i.mes) === Number(mesVal));
  }

  if (idQuery) {
    out = out.filter((i) => safeText(i.id_localidade).toLowerCase().includes(idQuery));
  }

  if (ticketQuery) {
    out = out.filter((i) => safeText(i.numero_ticket).toLowerCase().includes(ticketQuery));
  }

  return out;
}

function clearFilters() {
  if (els.idLocalidadeSearch) els.idLocalidadeSearch.value = "";
  if (els.ticketSearch) els.ticketSearch.value = "";
  if (els.anoSelect) els.anoSelect.value = "all";
  if (els.mesSelect) els.mesSelect.value = "all";

  renderAll();
}

/* =========================================================
   KPIs
   ========================================================= */

function sum(items, key) {
  return items.reduce((acc, it) => acc + safeNumber(it[key], 0), 0);
}

function uniqueCount(items, key) {
  return new Set(items.map((i) => safeText(i[key])).filter(Boolean)).size;
}

function renderKPIs(items) {
  const totalTickets = items.length;
  const totalLocais = uniqueCount(items, "id_localidade");
  const totalEquipTroc = sum(items, "equipamentos_trocados");
  const totalEquipCfg = sum(items, "equipamentos_configurados");
  const totalHoras = sum(items, "tempo_gasto_horas");
  const totalPontos = sum(items, "pontos_de_rede");

  if (els.kpiTickets) els.kpiTickets.textContent = fmtInt(totalTickets);
  if (els.kpiTicketsSub) els.kpiTicketsSub.textContent = totalTickets ? "Tickets no filtro atual" : "Sem dados no filtro";

  if (els.kpiLocais) els.kpiLocais.textContent = fmtInt(totalLocais);

  if (els.kpiEquip) els.kpiEquip.textContent = fmtInt(totalEquipTroc);
  if (els.kpiEquipSub) els.kpiEquipSub.textContent = totalEquipTroc ? "Total de trocas no filtro" : "Sem trocas no filtro";

  if (els.kpiEquipCfg) els.kpiEquipCfg.textContent = fmtInt(totalEquipCfg);
  if (els.kpiEquipCfgSub) els.kpiEquipCfgSub.textContent = totalEquipCfg ? "Total de configurações no filtro" : "Sem configurações no filtro";

  if (els.kpiTempoHoras) els.kpiTempoHoras.textContent = fmtHours(totalHoras);
  if (els.kpiTempoHorasSub) els.kpiTempoHorasSub.textContent = totalHoras ? "Horas acumuladas no filtro" : "Sem horas no filtro";

  if (els.kpiMediaPontos) els.kpiMediaPontos.textContent = fmtInt(totalPontos);
  if (els.kpiMediaPontosSub) els.kpiMediaPontosSub.textContent = totalPontos ? "Total de pontos de rede no filtro" : "Sem pontos no filtro";

  if (els.totalFiltro) els.totalFiltro.textContent = fmtInt(totalTickets);
}

/* =========================================================
   Tabela do dashboard
   ========================================================= */

function renderTable(items) {
  if (!els.tbody) return;

  if (!items.length) {
    els.tbody.innerHTML = `<tr><td colspan="7" class="muted">Nenhum registro encontrado para o filtro atual.</td></tr>`;
    return;
  }

  els.tbody.innerHTML = items.map((it, idx) => `
    <tr data-idx="${idx}">
      <td>${escapeHtml(it.numero_ticket || "—")}</td>
      <td>${escapeHtml(it.id_localidade || "—")}</td>
      <td>${escapeHtml(it.localidade || "—")}</td>
      <td class="right">${fmtHours(it.tempo_gasto_horas)}</td>
      <td class="right">${fmtInt(it.equipamentos_trocados)}</td>
      <td class="right">${fmtInt(it.equipamentos_configurados)}</td>
      <td class="right">${fmtInt(it.pontos_de_rede)}</td>
    </tr>
  `).join("");

  [...els.tbody.querySelectorAll("tr[data-idx]")].forEach((tr) => {
    tr.addEventListener("click", () => {
      const idx = Number(tr.dataset.idx);
      selectItem(idx);
    });
  });
}

function selectItem(idx) {
  selectedIdx = idx;

  if (els.tbody) {
    [...els.tbody.querySelectorAll("tr[data-idx]")].forEach((tr) => {
      tr.classList.toggle("active", Number(tr.dataset.idx) === idx);
    });
  }

  const item = filteredItems[idx];

  if (!item) {
    if (els.descAtendimento) els.descAtendimento.textContent = "—";
    clearGallery();
    return;
  }

  if (els.descAtendimento) {
    els.descAtendimento.textContent = item.descricao_atendimento || "—";
  }

  renderGallery(item);
}

/* =========================================================
   Galeria de fotos
   ========================================================= */

function clearGallery() {
  if (els.selectedInfo) els.selectedInfo.textContent = "—";
  if (els.beforeMeta) els.beforeMeta.textContent = "—";
  if (els.afterMeta) els.afterMeta.textContent = "—";

  if (els.beforeImg) {
    els.beforeImg.style.display = "none";
    els.beforeImg.removeAttribute("src");
    els.beforeImg.onerror = null;
    els.beforeImg.onload = null;
  }

  if (els.afterImg) {
    els.afterImg.style.display = "none";
    els.afterImg.removeAttribute("src");
    els.afterImg.onerror = null;
    els.afterImg.onload = null;
  }

  if (els.beforeBox) {
    els.beforeBox.style.display = "flex";
    els.beforeBox.innerHTML = `Nenhuma foto exibida.<br/>Digite um filtro (Id Localidade ou Nº Ticket).`;
  }

  if (els.afterBox) {
    els.afterBox.style.display = "flex";
    els.afterBox.innerHTML = `Nenhuma foto exibida.<br/>Digite um filtro (Id Localidade ou Nº Ticket).`;
  }

  if (els.beforeLink) {
    els.beforeLink.style.display = "none";
    els.beforeLink.removeAttribute("href");
    els.beforeLink.textContent = "—";
  }

  if (els.afterLink) {
    els.afterLink.style.display = "none";
    els.afterLink.removeAttribute("href");
    els.afterLink.textContent = "—";
  }

  if (els.galleryHint) {
    els.galleryHint.innerHTML = `As fotos serão exibidas <b>somente</b> ao filtrar por <b>Id Localidade</b> ou <b>Nº Ticket</b>.`;
  }
}

function renderGallery(item) {
  const fotoAntesUrl = normalizeDriveImageUrl(item.foto_antes_url);
  const fotoDepoisUrl = normalizeDriveImageUrl(item.foto_depois_url);

  console.log("RenderGallery item:", item);
  console.log("Foto Antes URL original:", item.foto_antes_url);
  console.log("Foto Antes URL normalizada:", fotoAntesUrl);
  console.log("Foto Depois URL original:", item.foto_depois_url);
  console.log("Foto Depois URL normalizada:", fotoDepoisUrl);

  if (els.selectedInfo) {
    els.selectedInfo.textContent = `${item.numero_ticket || "—"} / ${item.id_localidade || "—"}`;
  }

  if (els.beforeMeta) els.beforeMeta.textContent = item.id_localidade || "—";
  if (els.afterMeta) els.afterMeta.textContent = item.id_localidade || "—";

  if (fotoAntesUrl) {
    if (els.beforeImg) {
      els.beforeImg.onerror = () => {
        console.error("Falha ao carregar Foto Antes:", fotoAntesUrl);

        els.beforeImg.style.display = "none";

        if (els.beforeBox) {
          els.beforeBox.style.display = "flex";
          els.beforeBox.innerHTML = `Não foi possível carregar a foto.<br/>Use o link abaixo para abrir no Drive.`;
        }
      };

      els.beforeImg.onload = () => {
        if (els.beforeBox) els.beforeBox.style.display = "none";
        els.beforeImg.style.display = "block";
      };

      els.beforeImg.src = fotoAntesUrl;
      els.beforeImg.style.display = "block";
    }

    if (els.beforeBox) els.beforeBox.style.display = "none";

    if (els.beforeLink) {
      els.beforeLink.href = fotoAntesUrl;
      els.beforeLink.textContent = fotoAntesUrl;
      els.beforeLink.style.display = "inline-block";
    }
  } else {
    if (els.beforeImg) els.beforeImg.style.display = "none";

    if (els.beforeBox) {
      els.beforeBox.style.display = "flex";
      els.beforeBox.innerHTML = `Nenhuma foto exibida.<br/>Sem link de Foto Antes na planilha.`;
    }

    if (els.beforeLink) els.beforeLink.style.display = "none";
  }

  if (fotoDepoisUrl) {
    if (els.afterImg) {
      els.afterImg.onerror = () => {
        console.error("Falha ao carregar Foto Depois:", fotoDepoisUrl);

        els.afterImg.style.display = "none";

        if (els.afterBox) {
          els.afterBox.style.display = "flex";
          els.afterBox.innerHTML = `Não foi possível carregar a foto.<br/>Use o link abaixo para abrir no Drive.`;
        }
      };

      els.afterImg.onload = () => {
        if (els.afterBox) els.afterBox.style.display = "none";
        els.afterImg.style.display = "block";
      };

      els.afterImg.src = fotoDepoisUrl;
      els.afterImg.style.display = "block";
    }

    if (els.afterBox) els.afterBox.style.display = "none";

    if (els.afterLink) {
      els.afterLink.href = fotoDepoisUrl;
      els.afterLink.textContent = fotoDepoisUrl;
      els.afterLink.style.display = "inline-block";
    }
  } else {
    if (els.afterImg) els.afterImg.style.display = "none";

    if (els.afterBox) {
      els.afterBox.style.display = "flex";
      els.afterBox.innerHTML = `Nenhuma foto exibida.<br/>Sem link de Foto Depois na planilha.`;
    }

    if (els.afterLink) els.afterLink.style.display = "none";
  }

  if (els.galleryHint) {
    els.galleryHint.innerHTML = `Fotos do item selecionado na tabela.`;
  }
}

/* =========================================================
   Gráficos
   ========================================================= */

function aggregateByLocalidade(items, field) {
  const map = new Map();

  items.forEach((it) => {
    const key = safeText(it.localidade || it.id_localidade || "N/D");

    if (!map.has(key)) {
      map.set(key, 0);
    }

    map.set(key, map.get(key) + safeNumber(it[field], 0));
  });

  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

function clearCanvas(canvas) {
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 600;
  const h = canvas.clientHeight || 260;

  canvas.width = Math.floor(w * ratio);
  canvas.height = Math.floor(h * ratio);

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, w, h);
}

function getCssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawBarChart(canvas, data, valueFormatter = (v) => String(v)) {
  if (!canvas) return;

  clearCanvas(canvas);

  const ctx = canvas.getContext("2d");
  const w = canvas.clientWidth || 600;
  const h = canvas.clientHeight || 260;

  ctx.clearRect(0, 0, w, h);

  const chartGridLine = getCssVar("--chart-grid-line", "rgba(148,163,184,.14)");
  const chartAxisLabel = getCssVar("--chart-axis-label", "rgba(167,176,199,.92)");
  const chartLabelDark = getCssVar("--chart-label-dark", "rgba(8, 12, 22, .92)");

  const limeTop = getCssVar("--chart-lime-top", "rgba(196,247,44,.95)");
  const limeMid = getCssVar("--chart-lime-mid", "rgba(196,247,44,.70)");
  const limeBottom = getCssVar("--chart-lime-bottom", "rgba(196,247,44,.28)");

  const blueTop = getCssVar("--chart-blue-top", "rgba(91,129,252,.95)");
  const blueMid = getCssVar("--chart-blue-mid", "rgba(91,129,252,.70)");
  const blueBottom = getCssVar("--chart-blue-bottom", "rgba(91,129,252,.28)");

  const emptyTextColor = getCssVar("--muted", "#A7B0C7");

  if (!data.length) {
    ctx.fillStyle = emptyTextColor;
    ctx.font = "12px ui-sans-serif, system-ui, Arial";
    ctx.fillText("Sem dados para exibir.", 16, 24);
    return;
  }

  const left = 180;
  const top = 16;
  const right = 18;
  const bottom = 10;
  const rowH = 22;
  const gap = 8;
  const chartW = Math.max(120, w - left - right);
  const maxVal = Math.max(...data.map(d => safeNumber(d.value, 0)), 1);

  ctx.save();

  ctx.strokeStyle = chartGridLine;
  ctx.lineWidth = 1;

  for (let i = 1; i <= 4; i++) {
    const x = left + chartW * (i / 4);
    ctx.beginPath();
    ctx.moveTo(x, top - 4);
    ctx.lineTo(x, Math.min(h - bottom, top + data.length * (rowH + gap)));
    ctx.stroke();
  }

  ctx.font = "12px ui-sans-serif, system-ui, Arial";

  data.forEach((d, i) => {
    const y = top + i * (rowH + gap);
    const value = safeNumber(d.value, 0);
    const label = safeText(d.label || "N/D");
    const shortLabel = label.length > 28 ? `${label.slice(0, 28)}…` : label;

    ctx.fillStyle = chartAxisLabel;
    ctx.fillText(shortLabel, 10, y + 14);

    const bw = Math.max(2, (value / maxVal) * chartW);
    const isLime = i % 2 === 0;

    const grad = ctx.createLinearGradient(left, y, left + bw, y);
    grad.addColorStop(0, isLime ? limeTop : blueTop);
    grad.addColorStop(0.55, isLime ? limeMid : blueMid);
    grad.addColorStop(1, isLime ? limeBottom : blueBottom);

    ctx.fillStyle = grad;
    roundRect(ctx, left, y, bw, rowH, 7);
    ctx.fill();

    ctx.fillStyle = chartLabelDark;
    ctx.font = "11px ui-sans-serif, system-ui, Arial";
    ctx.fillText(valueFormatter(value), left + 8, y + 14);

    ctx.font = "12px ui-sans-serif, system-ui, Arial";
  });

  ctx.restore();
}

function renderCharts(items) {
  const tempoData = aggregateByLocalidade(items, "tempo_gasto_horas");
  const cfgData = aggregateByLocalidade(items, "equipamentos_configurados");
  const trocData = aggregateByLocalidade(items, "equipamentos_trocados");

  drawBarChart(els.cvTempo, tempoData, (v) => `${fmtHours(v)} h`);
  drawBarChart(els.cvTickets, cfgData, (v) => fmtInt(v));
  drawBarChart(els.cvEquip, trocData, (v) => fmtInt(v));
}

/* =========================================================
   Render geral
   ========================================================= */

function renderAll() {
  filteredItems = applyFilters(allItems);

  renderKPIs(filteredItems);
  renderTable(filteredItems);
  renderCharts(filteredItems);

  if (filteredItems.length) {
    selectItem(0);
  } else {
    selectedIdx = null;

    if (els.descAtendimento) {
      els.descAtendimento.textContent = "—";
    }

    clearGallery();
  }

  showError("");
}

/* =========================================================
   Integração Google Sheets / Apps Script
   ========================================================= */

function getApiBase() {
  return GOOGLE_SCRIPT_URL;
}

async function requestJson(url, errorMessage = "A API não retornou JSON válido.") {
  const resp = await fetch(url, {
    method: "GET",
    cache: "no-store"
  });

  const text = await resp.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error("Resposta bruta da API:", text);
    throw new Error(errorMessage);
  }

  return data;
}

async function postJson(url, payload, errorMessage = "A API não retornou JSON válido.") {
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });

  const text = await resp.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error("Resposta bruta da API:", text);
    throw new Error(errorMessage);
  }

  return data;
}

async function listarAtendimentosGoogleSheets() {
  const apiBase = getApiBase();

  if (!apiBase) {
    throw new Error("URL do Apps Script não informada.");
  }

  const url = `${apiBase}?action=list_atendimentos`;
  return await requestJson(url, "A API não retornou JSON válido ao listar atendimentos.");
}

async function carregarDashboardGoogleSheets() {
  try {
    showError("Carregando dados do Google Sheets...");

    if (els.tbody) {
      els.tbody.innerHTML = `<tr><td colspan="7" class="muted">Carregando dados do Google Sheets...</td></tr>`;
    }

    const data = await listarAtendimentosGoogleSheets();

    if (!data.success) {
      throw new Error(data.message || "Falha ao carregar dados do Google Sheets.");
    }

    const err = validateData(data);

    if (err) {
      throw new Error(err);
    }

    rawData = data;
    allItems = (data.itens || []).map((it) => normalizeItem(it));
    filteredItems = [];
    selectedIdx = null;

    renderAll();

    console.log("Dados do Google Sheets carregados com sucesso:", {
      totalItens: allItems.length,
      anos: [...new Set(allItems.map(i => i.ano))],
      meses: [...new Set(allItems.map(i => i.mes))]
    });

  } catch (err) {
    console.error("Erro ao carregar dashboard via Google Sheets:", err);

    rawData = null;
    allItems = [];
    filteredItems = [];
    selectedIdx = null;

    setEmptyState();
    showError(`Erro ao carregar dados do Google Sheets. ${err?.message || ""}`);
  }
}

/* =========================================================
   Status da tela Novo Atendimento
   ========================================================= */

function showFormStatus(message, type = "info") {
  const el = document.getElementById("statusForm");
  if (!el) return;

  if (!message) {
    el.textContent = "";
    el.className = "status";
    return;
  }

  el.textContent = message;
  el.className = `status show ${type}`;
}

function showApiStatus(message, type = "info") {
  const el = document.getElementById("statusApi");
  if (!el) return;

  if (!message) {
    el.textContent = "";
    el.className = "status";
    return;
  }

  el.textContent = message;
  el.className = `status show ${type}`;
}

function showTableStatus(message, type = "info") {
  const el = document.getElementById("statusTabela");
  if (!el) return;

  if (!message) {
    el.textContent = "";
    el.className = "status";
    return;
  }

  el.textContent = message;
  el.className = `status show ${type}`;
}

/* =========================================================
   Upload de Fotos
   ========================================================= */

function fileToBase64Payload(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve({
        base64: "",
        nome: "",
        tipo: ""
      });
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : "";

      resolve({
        base64,
        nome: file.name || "foto.jpg",
        tipo: file.type || "image/jpeg"
      });
    };

    reader.onerror = () => {
      reject(new Error("Falha ao ler o arquivo de imagem."));
    };

    reader.readAsDataURL(file);
  });
}

function bindFotoUploadLabels() {
  const fotoAntesFile = document.getElementById("foto_antes_file");
  const fotoDepoisFile = document.getElementById("foto_depois_file");

  const fotoAntesFileName = document.getElementById("fotoAntesFileName");
  const fotoDepoisFileName = document.getElementById("fotoDepoisFileName");

  fotoAntesFile?.addEventListener("change", () => {
    const file = fotoAntesFile.files?.[0];

    if (fotoAntesFileName) {
      fotoAntesFileName.textContent = file ? file.name : "Nenhum arquivo selecionado";
    }

    console.log("Foto Antes selecionada:", file);
  });

  fotoDepoisFile?.addEventListener("change", () => {
    const file = fotoDepoisFile.files?.[0];

    if (fotoDepoisFileName) {
      fotoDepoisFileName.textContent = file ? file.name : "Nenhum arquivo selecionado";
    }

    console.log("Foto Depois selecionada:", file);
  });
}

/* =========================================================
   Formulário Novo Atendimento
   ========================================================= */

async function getFormPayload() {
  const fotoAntesFile = document.getElementById("foto_antes_file")?.files?.[0] || null;
  const fotoDepoisFile = document.getElementById("foto_depois_file")?.files?.[0] || null;

  const fotoAntesPayload = await fileToBase64Payload(fotoAntesFile);
  const fotoDepoisPayload = await fileToBase64Payload(fotoDepoisFile);

  console.log("Foto Antes File:", fotoAntesFile);
  console.log("Foto Depois File:", fotoDepoisFile);
  console.log("Foto Antes Base64 tamanho:", fotoAntesPayload.base64.length);
  console.log("Foto Depois Base64 tamanho:", fotoDepoisPayload.base64.length);

  return {
    ano: document.getElementById("ano")?.value?.trim() || "",
    mes: document.getElementById("mes")?.value?.trim() || "",
    dia: document.getElementById("dia")?.value?.trim() || "",
    numero_ticket: document.getElementById("numero_ticket")?.value?.trim() || "",
    id_localidade: document.getElementById("id_localidade")?.value?.trim() || "",
    localidade: document.getElementById("localidade")?.value?.trim() || "",
    tempo_gasto_horas: document.getElementById("tempo_gasto_horas")?.value?.trim() || "0",
    equipamentos_trocados: document.getElementById("equipamentos_trocados")?.value?.trim() || "0",
    equipamentos_configurados: document.getElementById("equipamentos_configurados")?.value?.trim() || "0",
    pontos_de_rede: document.getElementById("pontos_de_rede")?.value?.trim() || "0",
    descricao_atendimento: document.getElementById("descricao_atendimento")?.value?.trim() || "",

    foto_antes_base64: fotoAntesPayload.base64,
    foto_antes_nome: fotoAntesPayload.nome,
    foto_antes_tipo: fotoAntesPayload.tipo,

    foto_depois_base64: fotoDepoisPayload.base64,
    foto_depois_nome: fotoDepoisPayload.nome,
    foto_depois_tipo: fotoDepoisPayload.tipo
  };
}

function validateFormPayload(p) {
  if (!p.ano || !p.mes || !p.dia) return "Preencha Ano, Mês e Dia.";
  if (!p.numero_ticket) return "Preencha o Nº Ticket.";
  if (!p.id_localidade) return "Preencha o Id Localidade.";
  if (!p.localidade) return "Preencha a Localidade.";
  return "";
}

async function testarConexaoAppsScript() {
  const apiBase = getApiBase();

  if (!apiBase) {
    showApiStatus("Informe a URL do Google Apps Script.", "error");
    return;
  }

  showApiStatus("Testando conexão...", "info");

  try {
    const data = await requestJson(`${apiBase}?action=ping`);

    if (data.success) {
      showApiStatus("Conexão com API realizada com sucesso.", "ok");
    } else {
      showApiStatus(data.message || "Falha ao testar conexão.", "error");
    }
  } catch (err) {
    console.error("Erro detalhado ao testar conexão:", err);
    showApiStatus(`Não foi possível conectar à API. ${err?.message || ""}`, "error");
  }
}

async function salvarAtendimentoGoogleSheets(payload) {
  const apiBase = getApiBase();

  if (!apiBase) {
    throw new Error("URL do Apps Script não informada.");
  }

  const body = {
    action: "add_atendimento",
    ...payload
  };

  return await postJson(
    apiBase,
    body,
    "A API não retornou JSON válido ao salvar atendimento."
  );
}

function limparFormularioAtendimento() {
  document.getElementById("formAcao")?.reset();

  const ano = document.getElementById("ano");
  const dia = document.getElementById("dia");

  if (ano) ano.value = String(new Date().getFullYear());
  if (dia) dia.value = String(new Date().getDate());

  const fotoAntesFileName = document.getElementById("fotoAntesFileName");
  const fotoDepoisFileName = document.getElementById("fotoDepoisFileName");

  if (fotoAntesFileName) fotoAntesFileName.textContent = "Nenhum arquivo selecionado";
  if (fotoDepoisFileName) fotoDepoisFileName.textContent = "Nenhum arquivo selecionado";
}

/* =========================================================
   Tabela de registros cadastrados
   ========================================================= */

function normalizeAtendimentoItem(x) {
  return {
    ano: safeText(x.ano ?? x.Ano),
    mes: safeText(x.mes ?? x.Mês ?? x["Mês (1-12)"]),
    dia: safeText(x.dia ?? x.Dia),
    numero_ticket: safeText(x.numero_ticket ?? x.ticket ?? x["Nº Ticket"]),
    id_localidade: safeText(x.id_localidade ?? x["Id Localidade"]),
    localidade: safeText(x.localidade ?? x["Localidade"]),
    tempo_gasto_horas: safeText(x.tempo_gasto_horas ?? x["Tempo (Horas)"]),
    equipamentos_trocados: safeText(x.equipamentos_trocados ?? x["Qtde Equip. Trocados"]),
    equipamentos_configurados: safeText(x.equipamentos_configurados ?? x["Qtde Equip. Configurados"]),
    pontos_de_rede: safeText(x.pontos_de_rede ?? x["Pontos de Rede"]),
    foto_antes_url: safeText(x.foto_antes_url ?? x["Foto Antes (caminho/URL)"]),
    foto_depois_url: safeText(x.foto_depois_url ?? x["Foto Depois (caminho/URL)"]),
    descricao_atendimento: safeText(x.descricao_atendimento ?? x["Descrição Atendimento"]),
  };
}

function filtrarAtendimentosDoDia(lista) {
  const hoje = new Date();
  const anoHoje = String(hoje.getFullYear());
  const mesHoje = String(hoje.getMonth() + 1);
  const diaHoje = String(hoje.getDate());

  return (lista || []).filter((raw) => {
    const item = normalizeAtendimentoItem(raw);

    const anoItem = String(item.ano).trim();
    const mesItem = String(Number(item.mes));
    const diaItem = String(Number(item.dia));

    return anoItem === anoHoje && mesItem === mesHoje && diaItem === diaHoje;
  });
}

function renderTabelaAtendimentos(lista) {
  const tbody = document.getElementById("tbody_acoes");

  if (!tbody) return;

  const listaDoDia = filtrarAtendimentosDoDia(lista);

  if (!Array.isArray(listaDoDia) || !listaDoDia.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="13" class="muted">Nenhum registro encontrado para hoje.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = listaDoDia.map((raw) => {
    const item = normalizeAtendimentoItem(raw);

    const fotoAntesUrl = normalizeDriveImageUrl(item.foto_antes_url);
    const fotoDepoisUrl = normalizeDriveImageUrl(item.foto_depois_url);

    const fotoAntes = fotoAntesUrl
      ? `<a href="${escapeHtml(fotoAntesUrl)}" target="_blank" rel="noopener">Abrir</a>`
      : "—";

    const fotoDepois = fotoDepoisUrl
      ? `<a href="${escapeHtml(fotoDepoisUrl)}" target="_blank" rel="noopener">Abrir</a>`
      : "—";

    return `
      <tr>
        <td>${escapeHtml(item.ano)}</td>
        <td>${escapeHtml(item.mes)}</td>
        <td>${escapeHtml(item.dia)}</td>
        <td>${escapeHtml(item.numero_ticket)}</td>
        <td>${escapeHtml(item.id_localidade)}</td>
        <td>${escapeHtml(item.localidade)}</td>
        <td>${escapeHtml(item.tempo_gasto_horas)}</td>
        <td>${escapeHtml(item.equipamentos_trocados)}</td>
        <td>${escapeHtml(item.equipamentos_configurados)}</td>
        <td>${escapeHtml(item.pontos_de_rede)}</td>
        <td>${fotoAntes}</td>
        <td>${fotoDepois}</td>
        <td>${escapeHtml(item.descricao_atendimento)}</td>
      </tr>
    `;
  }).join("");
}

async function carregarListaAtendimentos() {
  try {
    showTableStatus("Carregando registros...", "info");

    const data = await listarAtendimentosGoogleSheets();

    if (data.success) {
      renderTabelaAtendimentos(data.itens || []);
      showTableStatus("Registros carregados com sucesso.", "ok");
    } else {
      showTableStatus(data.message || "Falha ao carregar registros.", "error");
    }
  } catch (err) {
    console.error(err);
    showTableStatus("Erro ao carregar registros da planilha.", "error");
  }
}

function bindFormAcao() {
  const form = document.getElementById("formAcao");
  const btnLimpar = document.getElementById("btnLimparFormulario");
  const btnTestarConexao = document.getElementById("btnTestarConexao");
  const btnAtualizarLista = document.getElementById("btnAtualizarLista");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    showFormStatus("Preparando dados e fotos...", "info");

    try {
      const payload = await getFormPayload();
      const validationError = validateFormPayload(payload);

      if (validationError) {
        showFormStatus(validationError, "error");
        return;
      }

      showFormStatus("Salvando atendimento e enviando fotos...", "info");

      const result = await salvarAtendimentoGoogleSheets(payload);

      console.log("Resultado Apps Script:", result);

      if (result.success) {
        if (result.warning) {
          showFormStatus(`${result.message} Detalhe: ${result.warning}`, "error");
        } else {
          showFormStatus("Atendimento salvo com sucesso na planilha.", "ok");
        }

        limparFormularioAtendimento();

        await carregarListaAtendimentos();
        await carregarDashboardGoogleSheets();
      } else {
        showFormStatus(result.message || "Falha ao salvar atendimento.", "error");
      }
    } catch (err) {
      console.error("Erro detalhado ao salvar atendimento:", err);
      showFormStatus(`Erro ao enviar dados para o Google Sheets. ${err?.message || ""}`, "error");
    }
  });

  btnLimpar?.addEventListener("click", () => {
    limparFormularioAtendimento();
    showFormStatus("", "info");
  });

  btnTestarConexao?.addEventListener("click", async () => {
    await testarConexaoAppsScript();
  });

  btnAtualizarLista?.addEventListener("click", async () => {
    await carregarListaAtendimentos();
  });
}

/* =========================================================
   Eventos gerais
   ========================================================= */

function bindEvents() {
  els.anoSelect?.addEventListener("change", renderAll);
  els.mesSelect?.addEventListener("change", renderAll);
  els.idLocalidadeSearch?.addEventListener("input", renderAll);
  els.ticketSearch?.addEventListener("input", renderAll);
  els.btnClearSearch?.addEventListener("click", clearFilters);

  els.btnExportPDF?.addEventListener("click", () => window.print());

  els.btnAcoes?.addEventListener("click", async () => {
    const dashboardPage = document.getElementById("dashboardPage");
    const novoAtendimentoPage = document.getElementById("novoAtendimentoPage");

    if (dashboardPage && novoAtendimentoPage) {
      dashboardPage.style.display = "none";
      novoAtendimentoPage.style.display = "block";
      window.scrollTo({ top: 0, behavior: "smooth" });

      await carregarListaAtendimentos();
    }
  });

  const btnVoltarDashboard = document.getElementById("btnVoltarDashboard");

  btnVoltarDashboard?.addEventListener("click", async () => {
    const dashboardPage = document.getElementById("dashboardPage");
    const novoAtendimentoPage = document.getElementById("novoAtendimentoPage");

    if (dashboardPage && novoAtendimentoPage) {
      dashboardPage.style.display = "block";
      novoAtendimentoPage.style.display = "none";
      window.scrollTo({ top: 0, behavior: "smooth" });

      await carregarDashboardGoogleSheets();
    }
  });

  window.addEventListener("resize", () => {
    if (filteredItems.length) {
      renderCharts(filteredItems);
    }
  });
}

/* =========================================================
   Inicialização
   ========================================================= */

function init() {
  initSelectPlaceholders();
  bindEvents();
  bindFormAcao();
  bindFotoUploadLabels();
  setEmptyState();

  carregarDashboardGoogleSheets();
}

document.addEventListener("DOMContentLoaded", init);