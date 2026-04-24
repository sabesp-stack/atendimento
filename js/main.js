const FILE_PREFIX = "Kpis_";
const STORAGE_JSON_KEY = "dashboard_sabesp_json_data";
const STORAGE_JSON_NAME_KEY = "dashboard_sabesp_json_name";

const els = {
  subtitle: document.getElementById("subtitle"),
  mesSelect: document.getElementById("mesSelect"),
  anoSelect: document.getElementById("anoSelect"),

  jsonFile: document.getElementById("jsonFile"),
  fileName: document.getElementById("fileName"),

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
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

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

function fmtInt(n) {
  return safeNumber(n, 0).toLocaleString("pt-BR");
}

function fmtHours(hours) {
  return safeNumber(hours, 0).toFixed(1).replace(".", ",");
}

function monthName(m) {
  return MESES[safeNumber(m, 0)] || `Mês ${m}`;
}

function parseMonthFromFilename(name) {
  const m = String(name || "").match(/Kpis_(\d{4})-(\d{2})/i);
  if (!m) return { ano: 0, mes: 0 };
  return {
    ano: Number(m[1]),
    mes: Number(m[2])
  };
}

function showError(msg = "") {
  if (!els.errorBox) return;
  els.errorBox.textContent = msg || "";
}

function saveJsonToStorage(fileName, jsonText) {
  try {
    localStorage.setItem(STORAGE_JSON_KEY, jsonText);
    localStorage.setItem(STORAGE_JSON_NAME_KEY, fileName || "Kpis_local.json");
  } catch (e) {
    console.warn("Não foi possível salvar o JSON no navegador.", e);
  }
}

function loadJsonFromStorage() {
  try {
    const jsonText = localStorage.getItem(STORAGE_JSON_KEY);
    const fileName = localStorage.getItem(STORAGE_JSON_NAME_KEY) || "Kpis_local.json";

    if (!jsonText) return null;

    return {
      fileName,
      jsonText
    };
  } catch (e) {
    console.warn("Não foi possível recuperar o JSON do navegador.", e);
    return null;
  }
}

function clearJsonFromStorage() {
  try {
    localStorage.removeItem(STORAGE_JSON_KEY);
    localStorage.removeItem(STORAGE_JSON_NAME_KEY);
  } catch (e) {
    console.warn("Não foi possível limpar o JSON salvo.", e);
  }
}

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
    els.tbody.innerHTML = `<tr><td colspan="7" class="muted">Carregue um JSON em “Carregar KPIs”.</td></tr>`;
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
  if (!data || typeof data !== "object") return "JSON inválido (objeto raiz).";
  if (!Array.isArray(data.itens)) return "JSON inválido: campo 'itens' precisa ser uma lista.";
  return null;
}

function normalizeItem(x, fallbackAno = 0, fallbackMes = 0) {
  const ano = safeNumber(
    x.ano ?? x.Ano ?? x.year ?? x.ano_referencia,
    fallbackAno
  );

  const mes = safeNumber(
    x.mes ?? x.Mes ?? x.month ?? x.mes_referencia,
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
    numero_ticket: safeText(x.numero_ticket ?? x.ticket ?? x["Nº Ticket"] ?? x["numero_ticket"]),
    id_localidade: safeText(x.id_localidade ?? x.idLocalidade ?? x["Id Localidade"] ?? x.id),
    localidade: safeText(x.localidade ?? x["Localidade"], "N/D"),
    tempo_gasto_horas: tempoHoras,
    equipamentos_trocados: safeNumber(
      x.equipamentos_trocados ?? x.qtde_equip_trocados ?? x["Qtde Equip. Trocados"],
      0
    ),
    equipamentos_configurados: safeNumber(
      x.equipamentos_configurados ?? x.qtde_equip_configurados ?? x["Qtde Equip. Configurados"],
      0
    ),
    pontos_de_rede: safeNumber(
      x.pontos_de_rede ?? x["Pontos de Rede"],
      0
    ),
    foto_antes_url: safeUrl(x.foto_antes_url ?? x["Foto Antes (caminho/URL)"] ?? x.foto_antes),
    foto_depois_url: safeUrl(x.foto_depois_url ?? x["Foto Depois (caminho/URL)"] ?? x.foto_depois),
    descricao_atendimento: safeText(
      x.descricao_atendimento ?? x.descricao ?? x.observacao ?? x["Descrição Atendimento"],
      ""
    ),
  };
}

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

function buildFilterOptions(items, fileName = "") {
  const fallback = parseMonthFromFilename(fileName);

  if (els.anoSelect) {
    if (fallback.ano >= 2025 && fallback.ano <= 2035) {
      els.anoSelect.value = String(fallback.ano);
    } else {
      els.anoSelect.value = "all";
    }
  }

  if (els.mesSelect) {
    if (fallback.mes >= 1 && fallback.mes <= 12) {
      els.mesSelect.value = String(fallback.mes);
    } else {
      els.mesSelect.value = "all";
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

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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

function clearGallery() {
  if (els.selectedInfo) els.selectedInfo.textContent = "—";
  if (els.beforeMeta) els.beforeMeta.textContent = "—";
  if (els.afterMeta) els.afterMeta.textContent = "—";

  if (els.beforeImg) {
    els.beforeImg.style.display = "none";
    els.beforeImg.removeAttribute("src");
  }

  if (els.afterImg) {
    els.afterImg.style.display = "none";
    els.afterImg.removeAttribute("src");
  }

  if (els.beforeBox) els.beforeBox.style.display = "flex";
  if (els.afterBox) els.afterBox.style.display = "flex";

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
  if (els.selectedInfo) {
    els.selectedInfo.textContent = `${item.numero_ticket || "—"} / ${item.id_localidade || "—"}`;
  }

  if (els.beforeMeta) els.beforeMeta.textContent = item.id_localidade || "—";
  if (els.afterMeta) els.afterMeta.textContent = item.id_localidade || "—";

  if (item.foto_antes_url) {
    if (els.beforeImg) {
      els.beforeImg.src = item.foto_antes_url;
      els.beforeImg.style.display = "block";
    }
    if (els.beforeBox) els.beforeBox.style.display = "none";
    if (els.beforeLink) {
      els.beforeLink.href = item.foto_antes_url;
      els.beforeLink.textContent = item.foto_antes_url;
      els.beforeLink.style.display = "inline-block";
    }
  } else {
    if (els.beforeImg) els.beforeImg.style.display = "none";
    if (els.beforeBox) els.beforeBox.style.display = "flex";
    if (els.beforeLink) els.beforeLink.style.display = "none";
  }

  if (item.foto_depois_url) {
    if (els.afterImg) {
      els.afterImg.src = item.foto_depois_url;
      els.afterImg.style.display = "block";
    }
    if (els.afterBox) els.afterBox.style.display = "none";
    if (els.afterLink) {
      els.afterLink.href = item.foto_depois_url;
      els.afterLink.textContent = item.foto_depois_url;
      els.afterLink.style.display = "inline-block";
    }
  } else {
    if (els.afterImg) els.afterImg.style.display = "none";
    if (els.afterBox) els.afterBox.style.display = "flex";
    if (els.afterLink) els.afterLink.style.display = "none";
  }

  if (els.galleryHint) {
    els.galleryHint.innerHTML = `Fotos do item selecionado na tabela.`;
  }
}

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

function renderAll() {
  filteredItems = applyFilters(allItems);
  renderKPIs(filteredItems);
  renderTable(filteredItems);
  renderCharts(filteredItems);

  if (filteredItems.length) {
    selectItem(0);
  } else {
    selectedIdx = null;
    if (els.descAtendimento) els.descAtendimento.textContent = "—";
    clearGallery();
  }

  showError("");
}

function processJsonData(jsonText, fileName = "Kpis_local.json", saveToStorage = false) {
  try {
    const data = JSON.parse(jsonText);

    const err = validateData(data);
    if (err) {
      showError(err);
      rawData = null;
      allItems = [];
      setEmptyState();
      return;
    }

    const fallback = parseMonthFromFilename(fileName);

    rawData = data;
    allItems = data.itens.map((it) => normalizeItem(it, fallback.ano, fallback.mes));

    if (els.fileName) {
      els.fileName.textContent = fileName;
    }

    initSelectPlaceholders();
    buildFilterOptions(allItems, fileName);
    renderAll();

    if (saveToStorage) {
      saveJsonToStorage(fileName, jsonText);
    }

    console.log("JSON carregado com sucesso:", {
      file: fileName,
      totalItens: allItems.length,
      anos: [...new Set(allItems.map(i => i.ano))],
      meses: [...new Set(allItems.map(i => i.mes))]
    });

  } catch (e) {
    console.error(e);
    showError("Falha ao processar o JSON salvo/carregado.");
    rawData = null;
    allItems = [];
    setEmptyState();
  }
}

async function handleJsonFile(file) {
  if (!file) return;

  try {
    const text = await file.text();
    processJsonData(text, file.name, true);
  } catch (e) {
    console.error(e);
    showError("Falha ao ler o JSON. Verifique se o arquivo está válido.");
    rawData = null;
    allItems = [];
    setEmptyState();
  }
}

/* ===== Integração Google Sheets / Novo Atendimento ===== */

function getApiBase() {
  return "https://script.google.com/macros/s/AKfycbzAu0TEQPL2TwAgyf2Hf-7cxhgqtRYGJNxaZTPKSCEgE8cIrLh_sgqt0nItZj9kz--nQQ/exec";
}

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

function getFormPayload() {
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
    foto_antes_url: document.getElementById("foto_antes_url")?.value?.trim() || "",
    foto_depois_url: document.getElementById("foto_depois_url")?.value?.trim() || "",
    descricao_atendimento: document.getElementById("descricao_atendimento")?.value?.trim() || ""
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
    const resp = await fetch(`${apiBase}?action=ping`, { method: "GET" });
    const text = await resp.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Resposta bruta da API:", text);
      throw new Error("A API não retornou JSON válido.");
    }

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

  const params = new URLSearchParams({
    action: "add_atendimento",
    ...payload
  });

  const url = `${apiBase}?${params.toString()}`;

  const resp = await fetch(url, {
    method: "GET"
  });

  const text = await resp.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error("Resposta bruta da API:", text);
    throw new Error("A API não retornou JSON válido.");
  }

  return data;
}

async function listarAtendimentosGoogleSheets() {
  const apiBase = getApiBase();

  if (!apiBase) {
    throw new Error("URL do Apps Script não informada.");
  }

  const resp = await fetch(`${apiBase}?action=list_atendimentos`, {
    method: "GET"
  });

  const text = await resp.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.error("Resposta bruta da API:", text);
    throw new Error("A API não retornou JSON válido ao listar atendimentos.");
  }

  return data;
}

function limparFormularioAtendimento() {
  document.getElementById("formAcao")?.reset();

  const ano = document.getElementById("ano");
  const dia = document.getElementById("dia");

  if (ano) ano.value = "2026";
  if (dia) dia.value = "1";
}

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
        <td>${escapeHtml(item.foto_antes_url)}</td>
        <td>${escapeHtml(item.foto_depois_url)}</td>
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

    const payload = getFormPayload();
    const validationError = validateFormPayload(payload);

    if (validationError) {
      showFormStatus(validationError, "error");
      return;
    }

    showFormStatus("Salvando atendimento...", "info");

    try {
      const result = await salvarAtendimentoGoogleSheets(payload);

      if (result.success) {
        showFormStatus("Atendimento salvo com sucesso na planilha.", "ok");
        limparFormularioAtendimento();
        await carregarListaAtendimentos();
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

function clearFilters() {
  if (els.idLocalidadeSearch) els.idLocalidadeSearch.value = "";
  if (els.ticketSearch) els.ticketSearch.value = "";
  if (els.anoSelect) els.anoSelect.value = "all";
  if (els.mesSelect) els.mesSelect.value = "all";
  renderAll();
}

function bindEvents() {
  els.jsonFile?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    handleJsonFile(file);
  });

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
  btnVoltarDashboard?.addEventListener("click", () => {
    const dashboardPage = document.getElementById("dashboardPage");
    const novoAtendimentoPage = document.getElementById("novoAtendimentoPage");
    if (dashboardPage && novoAtendimentoPage) {
      dashboardPage.style.display = "block";
      novoAtendimentoPage.style.display = "none";
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  window.addEventListener("resize", () => {
    if (filteredItems.length) renderCharts(filteredItems);
  });
}

function init() {
  initSelectPlaceholders();
  bindEvents();
  bindFormAcao();
  setEmptyState();

  const saved = loadJsonFromStorage();
  if (saved && saved.jsonText) {
    processJsonData(saved.jsonText, saved.fileName, false);
  }
}

document.addEventListener("DOMContentLoaded", init);