import { state } from "./state.js";
import {
  fmtInt, minutesToHours, fmtHours, escapeHtml, normalizeImgSrc, displayNameFromPath,
  sum, uniqueCount, monthLabel, yearLabel, safeItem, validateData, extractHourLabel, ticketLabel
} from "./utils.js";
import { drawBarChart, fallbackNoData, fmtChartHours } from "./charts.js";

export function initDashboardSelectors(els){
  els.mesSelect.innerHTML = `
    <option value="all">Todos</option>
    <option value="01">Janeiro</option>
    <option value="02">Fevereiro</option>
    <option value="03">Março</option>
    <option value="04">Abril</option>
    <option value="05">Maio</option>
    <option value="06">Junho</option>
    <option value="07">Julho</option>
    <option value="08">Agosto</option>
    <option value="09">Setembro</option>
    <option value="10">Outubro</option>
    <option value="11">Novembro</option>
    <option value="12">Dezembro</option>
  `;

  els.anoSelect.innerHTML = `
    <option value="all">Todos</option>
    <option value="2025">2025</option>
    <option value="2026">2026</option>
    <option value="2027">2027</option>
    <option value="2028">2028</option>
    <option value="2029">2029</option>
    <option value="2030">2030</option>
    <option value="2031">2031</option>
    <option value="2032">2032</option>
    <option value="2033">2033</option>
    <option value="2034">2034</option>
    <option value="2035">2035</option>
    <option value="2036">2036</option>
    <option value="2037">2037</option>
    <option value="2038">2038</option>
    <option value="2039">2039</option>
    <option value="2040">2040</option>
  `;

  els.anoSelect.value = "all";
  els.mesSelect.value = "all";
  resetGallery(els);
  els.descAtendimento.textContent = "—";
}

export function fillMonthYearSelectors(els, items){
  const years = [...new Set(items.map(i => Number(i.ano)).filter(Boolean))].sort((a,b)=>a-b);
  els.anoSelect.innerHTML = `<option value="all">Todos</option>` + years.map(y => `<option value="${y}">${y}</option>`).join("");

  const monthsUsed = [...new Set(items.map(i => Number(i.mes)).filter(m => m >= 1 && m <= 12))].sort((a,b)=>a-b);
  const monthNames = {
    1:"Janeiro",2:"Fevereiro",3:"Março",4:"Abril",5:"Maio",6:"Junho",
    7:"Julho",8:"Agosto",9:"Setembro",10:"Outubro",11:"Novembro",12:"Dezembro"
  };
  els.mesSelect.innerHTML = `<option value="all">Todos</option>` + monthsUsed.map(m => `<option value="${String(m).padStart(2, "0")}">${monthNames[m]}</option>`).join("");
}

export function applyMonthYearFilter(els, items){
  const anoVal = String(els.anoSelect.value || "all");
  const mesVal = String(els.mesSelect.value || "all");

  let out = items;
  if (anoVal !== "all") out = out.filter(i => Number(i.ano) === Number(anoVal));
  if (mesVal !== "all") out = out.filter(i => Number(i.mes) === Number(mesVal));

  return out;
}

export function applySearchFilters(els, items){
  let out = items;

  const qId = String(els.idLocalidadeSearch.value || "").trim().toLowerCase();
  if (qId){
    out = out.filter(i => String(i.id_localidade || "").toLowerCase().includes(qId));
  }

  const qTicket = String(els.ticketSearch.value || "").trim().toLowerCase();
  if (qTicket){
    out = out.filter(i => String(i.numero_ticket || "").toLowerCase().includes(qTicket));
  }

  return out;
}

export function resetGallery(els){
  els.selectedInfo.textContent = "—";
  els.galleryHint.innerHTML = "As fotos serão exibidas <b>somente</b> ao filtrar por <b>Id Localidade</b> ou <b>Nº Ticket</b>.";
  els.beforeMeta.textContent = "—";
  els.afterMeta.textContent = "—";

  els.beforeImg.style.display = "none";
  els.afterImg.style.display = "none";
  els.beforeImg.removeAttribute("src");
  els.afterImg.removeAttribute("src");

  els.beforeBox.style.display = "flex";
  els.afterBox.style.display = "flex";
  els.beforeBox.innerHTML = "Nenhuma foto exibida.<br/>Digite um filtro (Id Localidade ou Nº Ticket).";
  els.afterBox.innerHTML = "Nenhuma foto exibida.<br/>Digite um filtro (Id Localidade ou Nº Ticket).";

  els.beforeLink.style.display = "none";
  els.afterLink.style.display = "none";
  els.beforeLink.textContent = "—";
  els.afterLink.textContent = "—";
  els.beforeLink.href = "#";
  els.afterLink.href = "#";
  els.beforeLink.removeAttribute("title");
  els.afterLink.removeAttribute("title");
}

function setLink(el, raw){
  const s = String(raw || "").trim();
  if (!s){
    el.style.display = "none";
    el.textContent = "—";
    el.href = "#";
    el.removeAttribute("title");
    return;
  }

  const href = normalizeImgSrc(s);
  el.style.display = "inline-block";
  el.textContent = displayNameFromPath(s);
  el.href = href;
  el.title = s;
}

export function showGalleryFor(els, item){
  const ticket = item.numero_ticket || "—";
  const idLoc = item.id_localidade || "—";
  const local = item.localidade || "—";
  els.selectedInfo.textContent = `${ticket} • ${idLoc} • ${local}`;
  els.galleryHint.textContent = "Exibindo fotos do registro do filtro.";

  const beforeRaw = String(item.foto_antes_url || "").trim();
  const afterRaw  = String(item.foto_depois_url || "").trim();

  setLink(els.beforeLink, beforeRaw);
  setLink(els.afterLink, afterRaw);

  els.beforeMeta.textContent = beforeRaw ? "foto_antes" : "Sem arquivo";
  els.afterMeta.textContent  = afterRaw ? "foto_depois" : "Sem arquivo";

  if (beforeRaw){
    const src = normalizeImgSrc(beforeRaw);
    els.beforeImg.onload = () => {
      els.beforeBox.style.display = "none";
      els.beforeImg.style.display = "block";
    };
    els.beforeImg.onerror = () => {
      els.beforeImg.style.display = "none";
      els.beforeBox.style.display = "flex";
      els.beforeBox.innerHTML = "Não foi possível carregar a foto <b>ANTES</b> (foto_antes_url).<br/>Verifique o caminho/URL no JSON.";
    };
    els.beforeImg.style.display = "none";
    els.beforeBox.style.display = "flex";
    els.beforeImg.src = src;
  } else {
    els.beforeImg.style.display = "none";
    els.beforeBox.style.display = "flex";
    els.beforeBox.innerHTML = "Sem foto <b>ANTES</b> (foto_antes_url) para este registro.";
  }

  if (afterRaw){
    const src = normalizeImgSrc(afterRaw);
    els.afterImg.onload = () => {
      els.afterBox.style.display = "none";
      els.afterImg.style.display = "block";
    };
    els.afterImg.onerror = () => {
      els.afterImg.style.display = "none";
      els.afterBox.style.display = "flex";
      els.afterBox.innerHTML = "Não foi possível carregar a foto <b>DEPOIS</b> (foto_depois_url).<br/>Verifique o caminho/URL no JSON.";
    };
    els.afterImg.style.display = "none";
    els.afterBox.style.display = "flex";
    els.afterImg.src = src;
  } else {
    els.afterImg.style.display = "none";
    els.afterBox.style.display = "flex";
    els.afterBox.innerHTML = "Sem foto <b>DEPOIS</b> (foto_depois_url) para este registro.";
  }
}

function pickDescricaoItem(els, filteredItems){
  if (!filteredItems?.length) return null;
  if (state.selectedIdx !== null && filteredItems[state.selectedIdx]) return filteredItems[state.selectedIdx];

  const qTicket = String(els.ticketSearch.value || "").trim().toLowerCase();
  if (qTicket){
    const match = filteredItems.find(i => String(i.numero_ticket || "").toLowerCase().includes(qTicket));
    if (match) return match;
  }

  const qId = String(els.idLocalidadeSearch.value || "").trim().toLowerCase();
  if (qId){
    const match = filteredItems.find(i => String(i.id_localidade || "").toLowerCase().includes(qId));
    if (match) return match;
  }

  return filteredItems[0];
}

export function renderDescricaoAtendimentoFromItems(els, filteredItems){
  const active = String(els.idLocalidadeSearch.value || "").trim() || String(els.ticketSearch.value || "").trim();
  if (!active){
    els.descAtendimento.textContent = "—";
    return;
  }

  const it = pickDescricaoItem(els, filteredItems);
  if (!it){
    els.descAtendimento.textContent = "—";
    return;
  }

  const desc = String(it.descricao_atendimento || "").trim();
  els.descAtendimento.textContent = desc || "—";
}

export function renderTable(els, items){
  const sorted = [...items].sort((a,b)=> b.tempo_gasto_min - a.tempo_gasto_min);
  state.currentItems = sorted;

  if (!sorted.length){
    els.tbody.innerHTML = `<tr><td colspan="7" class="muted">Nenhum dado para o filtro selecionado.</td></tr>`;
    return;
  }

  els.tbody.innerHTML = sorted.map((it, idx) => `
    <tr data-idx="${idx}">
      <td>${escapeHtml(it.numero_ticket || "—")}</td>
      <td>${escapeHtml(it.id_localidade || "—")}</td>
      <td>${escapeHtml(it.localidade)}</td>
      <td class="right">${escapeHtml(fmtHours(minutesToHours(it.tempo_gasto_min)))} h</td>
      <td class="right">${escapeHtml(fmtInt(it.equipamentos_trocados))}</td>
      <td class="right">${escapeHtml(fmtInt(it.equipamentos_configurados))}</td>
      <td class="right">${escapeHtml(fmtInt(it.pontos_de_rede))}</td>
    </tr>
  `).join("");

  els.tbody.querySelectorAll("tr[data-idx]").forEach(tr => {
    tr.addEventListener("click", () => {
      els.tbody.querySelectorAll("tr").forEach(x => x.classList.remove("active"));
      tr.classList.add("active");

      const idx = Number(tr.getAttribute("data-idx"));
      state.selectedIdx = Number.isFinite(idx) ? idx : null;

      const it = state.currentItems[state.selectedIdx];
      if (it){
        showGalleryFor(els, it);
        renderDescricaoAtendimentoFromItems(els, state.currentItems);
      }
    });
  });
}

export function renderKPIsFromItems(els, filteredItems){
  const tickets = filteredItems.length;
  const localidades = uniqueCount(filteredItems, "id_localidade");
  const totalEquipTrocados = sum(filteredItems, "equipamentos_trocados");
  const totalEquipCfg = sum(filteredItems, "equipamentos_configurados");
  const totalPontosRede = sum(filteredItems, "pontos_de_rede");
  const tempoMinTotal = sum(filteredItems, "tempo_gasto_min");
  const tempoHoras = minutesToHours(tempoMinTotal);

  const mesVal = String(els.mesSelect.value || "all");
  const anoVal = String(els.anoSelect.value || "all");
  const qId = String(els.idLocalidadeSearch.value || "").trim();
  const qTicket = String(els.ticketSearch.value || "").trim();

  const scopeBits = [`Ano: ${yearLabel(anoVal)}`, `Mês: ${monthLabel(mesVal)}`];
  if (qId) scopeBits.push(`Id contém: ${qId}`);
  if (qTicket) scopeBits.push(`Ticket contém: ${qTicket}`);

  els.subtitle.textContent = `• Última atualização: ${new Date().toLocaleString("pt-BR")}`;
  els.kpiTickets.textContent = fmtInt(tickets);
  els.kpiTicketsSub.textContent = `Filtro: ${scopeBits.join(" • ")}`;
  els.kpiLocais.textContent = fmtInt(localidades);
  els.kpiEquip.textContent = fmtInt(totalEquipTrocados);
  els.kpiEquipSub.textContent = "Total no filtro";
  els.kpiEquipCfg.textContent = fmtInt(totalEquipCfg);
  els.kpiEquipCfgSub.textContent = "Total no filtro";
  els.kpiTempoHoras.textContent = `${fmtHours(tempoHoras)} h`;
  els.kpiTempoHorasSub.textContent = "Soma de horas no filtro";
  els.kpiMediaPontos.textContent = fmtInt(totalPontosRede);
  els.kpiMediaPontosSub.textContent = "Total no filtro";
  els.totalFiltro.textContent = `${fmtInt(filteredItems.length)} registro(s) • ${fmtHours(tempoHoras)} h • ${fmtInt(totalEquipTrocados)} trocados • ${fmtInt(totalEquipCfg)} configurados`;
}

export function renderCharts(els, filteredItems){
  const dark = getComputedStyle(document.documentElement).getPropertyValue("--labelDark").trim() || "rgba(8, 12, 22, .92)";

  const topTempo = [...filteredItems].sort((a,b)=> (b.tempo_gasto_min || 0) - (a.tempo_gasto_min || 0)).slice(0,10);
  drawBarChart(
    els.cvTempo,
    topTempo.map(x => x.localidade),
    topTempo.map(x => Number(minutesToHours(x.tempo_gasto_min))),
    {
      valueFormatter: fmtChartHours,
      valueColor: dark,
      metaLabels: topTempo.map(ticketLabel),
      metaLabels2: topTempo.map(it => extractHourLabel(it._raw_datetime))
    }
  );

  const topCfg = [...filteredItems]
    .filter(i => Number(i.equipamentos_configurados || 0) > 0)
    .sort((a,b)=> Number(b.equipamentos_configurados || 0) - Number(a.equipamentos_configurados || 0))
    .slice(0,10);

  if (topCfg.length){
    drawBarChart(els.cvTickets, topCfg.map(x => x.localidade), topCfg.map(x => Number(x.equipamentos_configurados || 0)), {
      valueFormatter: v => String(v),
      valueColor: dark,
      metaLabels: topCfg.map(ticketLabel),
      metaLabels2: topCfg.map(it => extractHourLabel(it._raw_datetime))
    });
  } else {
    fallbackNoData(els.cvTickets);
  }

  const topTroc = [...filteredItems]
    .filter(i => Number(i.equipamentos_trocados || 0) > 0)
    .sort((a,b)=> Number(b.equipamentos_trocados || 0) - Number(a.equipamentos_trocados || 0))
    .slice(0,10);

  if (topTroc.length){
    drawBarChart(els.cvEquip, topTroc.map(x => x.localidade), topTroc.map(x => Number(x.equipamentos_trocados || 0)), {
      valueFormatter: v => String(v),
      valueColor: dark,
      metaLabels: topTroc.map(ticketLabel),
      metaLabels2: topTroc.map(it => extractHourLabel(it._raw_datetime))
    });
  } else {
    fallbackNoData(els.cvEquip);
  }
}

export function renderAllFromRaw(els){
  if (!state.rawData) return;

  const allItems = (state.rawData.itens || []).map(safeItem);
  const byYm = applyMonthYearFilter(els, allItems);
  const filtered = applySearchFilters(els, byYm);

  renderKPIsFromItems(els, filtered);
  renderTable(els, filtered);
  renderCharts(els, filtered);

  if (!els.idLocalidadeSearch.value.trim() && !els.ticketSearch.value.trim()){
    resetGallery(els);
  } else {
    const it = filtered[0];
    if (it) showGalleryFor(els, it);
    else resetGallery(els);
  }

  renderDescricaoAtendimentoFromItems(els, filtered);
}

export async function loadJsonFromFileInput(els, file){
  els.errorBox.textContent = "";
  els.tbody.innerHTML = `<tr><td colspan="7" class="muted">Lendo arquivo…</td></tr>`;
  resetGallery(els);
  state.selectedIdx = null;
  els.descAtendimento.textContent = "—";

  try{
    const text = await file.text();
    const data = JSON.parse(text);
    const err = validateData(data);
    if (err) throw new Error(err);

    state.rawData = data;
    fillMonthYearSelectors(els, state.rawData.itens.map(safeItem));

    const match = String(file.name || "").match(/(\d{4})-(\d{2})/);
    if (match){
      const year = match[1];
      const month = match[2];

      if (Array.from(els.anoSelect.options).some(o => o.value === year)) els.anoSelect.value = year;
      if (Array.from(els.mesSelect.options).some(o => o.value === month)) els.mesSelect.value = month;
    } else {
      els.anoSelect.value = "all";
      els.mesSelect.value = "all";
    }

    els.fileName.textContent = file.name;
    renderAllFromRaw(els);
  } catch (e){
    els.errorBox.textContent = `Falha ao ler JSON selecionado: ${String(e?.message || e)}`;
    els.subtitle.textContent = "Selecione um arquivo JSON válido.";
    els.tbody.innerHTML = `<tr><td colspan="7" class="error">Erro ao carregar dados.</td></tr>`;
    resetGallery(els);
    els.descAtendimento.textContent = "—";
  }
}