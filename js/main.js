const FILE_PREFIX = "Kpis_";

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

function setEmptyState() {
  els.kpiTickets.textContent = "—";
  els.kpiTicketsSub.textContent = "—";
  els.kpiLocais.textContent = "—";
  els.kpiEquip.textContent = "—";
  els.kpiEquipSub.textContent = "—";
  els.kpiEquipCfg.textContent = "—";
  els.kpiEquipCfgSub.textContent = "—";
  els.kpiTempoHoras.textContent = "—";
  els.kpiTempoHorasSub.textContent = "—";
  els.kpiMediaPontos.textContent = "—";
  els.kpiMediaPontosSub.textContent = "—";
  els.totalFiltro.textContent = "—";

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

  els.kpiTickets.textContent = fmtInt(totalTickets);
  els.kpiTicketsSub.textContent = totalTickets ? "Tickets no filtro atual" : "Sem dados no filtro";
  els.kpiLocais.textContent = fmtInt(totalLocais);
  els.kpiEquip.textContent = fmtInt(totalEquipTroc);
  els.kpiEquipSub.textContent = totalEquipTroc ? "Total de trocas no filtro" : "Sem trocas no filtro";
  els.kpiEquipCfg.textContent = fmtInt(totalEquipCfg);
  els.kpiEquipCfgSub.textContent = totalEquipCfg ? "Total de configurações no filtro" : "Sem configurações no filtro";
  els.kpiTempoHoras.textContent = fmtHours(totalHoras);
  els.kpiTempoHorasSub.textContent = totalHoras ? "Horas acumuladas no filtro" : "Sem horas no filtro";
  els.kpiMediaPontos.textContent = fmtInt(totalPontos);
  els.kpiMediaPontosSub.textContent = totalPontos ? "Total de pontos de rede no filtro" : "Sem pontos no filtro";
  els.totalFiltro.textContent = fmtInt(totalTickets);
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
    els.beforeImg.src = item.foto_antes_url;
    els.beforeImg.style.display = "block";
    els.beforeBox.style.display = "none";
    els.beforeLink.href = item.foto_antes_url;
    els.beforeLink.textContent = item.foto_antes_url;
    els.beforeLink.style.display = "inline-block";
  } else {
    els.beforeImg.style.display = "none";
    els.beforeBox.style.display = "flex";
    els.beforeLink.style.display = "none";
  }

  if (item.foto_depois_url) {
    els.afterImg.src = item.foto_depois_url;
    els.afterImg.style.display = "block";
    els.afterBox.style.display = "none";
    els.afterLink.href = item.foto_depois_url;
    els.afterLink.textContent = item.foto_depois_url;
    els.afterLink.style.display = "inline-block";
  } else {
    els.afterImg.style.display = "none";
    els.afterBox.style.display = "flex";
    els.afterLink.style.display = "none";
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

function drawBarChart(canvas, data, valueFormatter = (v) => String(v)) {
  if (!canvas) return;

  clearCanvas(canvas);

  const ctx = canvas.getContext("2d");
  const w = canvas.clientWidth || 600;
  const h = canvas.clientHeight || 260;

  ctx.clearRect(0, 0, w, h);

  if (!data.length) {
    ctx.fillStyle = "#A7B0C7";
    ctx.font = "12px Arial";
    ctx.fillText("Sem dados para exibir.", 16, 24);
    return;
  }

  const left = 180;
  const top = 16;
  const right = 18;
  const rowH = 22;
  const gap = 8;
  const chartW = Math.max(120, w - left - right);
  const maxVal = Math.max(...data.map(d => d.value), 1);

  ctx.font = "12px Arial";

  data.forEach((d, i) => {
    const y = top + i * (rowH + gap);

    ctx.fillStyle = "#A7B0C7";
    ctx.fillText(d.label.slice(0, 28), 10, y + 14);

    const bw = Math.max(2, (d.value / maxVal) * chartW);

    ctx.fillStyle = "rgba(47,124,255,.85)";
    ctx.fillRect(left, y, bw, rowH);

    ctx.fillStyle = "rgba(8,12,22,.92)";
    ctx.fillText(valueFormatter(d.value), left + 8, y + 14);
  });
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

async function handleJsonFile(file) {
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    const err = validateData(data);
    if (err) {
      showError(err);
      rawData = null;
      allItems = [];
      setEmptyState();
      return;
    }

    const fallback = parseMonthFromFilename(file.name);

    rawData = data;
    allItems = data.itens.map((it) => normalizeItem(it, fallback.ano, fallback.mes));

    if (els.fileName) {
      els.fileName.textContent = file.name;
    }

    initSelectPlaceholders();
    buildFilterOptions(allItems, file.name);
    renderAll();

    console.log("JSON carregado com sucesso:", {
      file: file.name,
      totalItens: allItems.length,
      anos: [...new Set(allItems.map(i => i.ano))],
      meses: [...new Set(allItems.map(i => i.mes))]
    });

  } catch (e) {
    console.error(e);
    showError("Falha ao ler o JSON. Verifique se o arquivo está válido.");
    rawData = null;
    allItems = [];
    setEmptyState();
  }
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

  els.btnAcoes?.addEventListener("click", () => {
    const dashboardPage = document.getElementById("dashboardPage");
    const novoAtendimentoPage = document.getElementById("novoAtendimentoPage");
    if (dashboardPage && novoAtendimentoPage) {
      dashboardPage.style.display = "none";
      novoAtendimentoPage.style.display = "block";
      window.scrollTo({ top: 0, behavior: "smooth" });
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
  setEmptyState();
}

document.addEventListener("DOMContentLoaded", init);