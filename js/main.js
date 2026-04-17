import { state } from "./state.js";
import { getEls } from "./dom.js";
import { safeItem } from "./utils.js";
import {
  initDashboardSelectors, fillMonthYearSelectors, renderAllFromRaw,
  resetGallery, loadJsonFromFileInput
} from "./dashboard.js";
import {
  testarConexao, salvarAcao, limparFormulario, carregarAcoes,
  aplicarFiltroTabela, limparFiltros, getApiBase
} from "./atendimento.js";
import { exportPDF, exportPPTX } from "./export.js";

const els = getEls();

function setPersistedValue(key, value){
  const serialized = JSON.stringify(value);
  try{ localStorage.setItem(key, serialized); return true; }catch{}
  try{ sessionStorage.setItem(key, serialized); return true; }catch{}
  return false;
}

function getPersistedValue(key){
  try{
    const raw = localStorage.getItem(key) ?? sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function buildPersistedState(){
  return {
    rawData: state.rawData || null,
    rawJsonText: state.rawData ? JSON.stringify(state.rawData) : "",
    fileName: els.fileName?.textContent || "Arquivo",
    filters: {
      mes: els.mesSelect?.value || "all",
      ano: els.anoSelect?.value || "all",
      idLocalidade: els.idLocalidadeSearch?.value || "",
      ticket: els.ticketSearch?.value || ""
    },
    ui: {
      activePage: getComputedStyle(els.novoAtendimentoPage).display !== "none" ? "novoAtendimento" : "dashboard",
      apiBase: getApiBase(els) || "COLE_AQUI_A_URL_DO_SEU_WEBAPP"
    }
  };
}

function saveDashboardState(){
  setPersistedValue(state.STORAGE_KEY, buildPersistedState());
}

function abrirNovoAtendimento(scroll = true){
  els.dashboardPage.style.display = "none";
  els.novoAtendimentoPage.style.display = "block";

  if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
  saveDashboardState();
  testarConexao(els).catch(()=>{});
  carregarAcoes(els).catch(()=>{});
}

function voltarDashboard(scroll = true){
  els.novoAtendimentoPage.style.display = "none";
  els.dashboardPage.style.display = "block";

  if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
  saveDashboardState();

  if (history.replaceState){
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}

function restoreDashboardState(){
  try{
    const saved = getPersistedValue(state.STORAGE_KEY);
    if (!saved || typeof saved !== "object") return false;

    if (saved.ui?.apiBase) els.api_base.value = saved.ui.apiBase;
    if (saved.filters){
      els.idLocalidadeSearch.value = saved.filters.idLocalidade || "";
      els.ticketSearch.value = saved.filters.ticket || "";
    }

    const restoredRaw = (saved.rawData && Array.isArray(saved.rawData.itens))
      ? saved.rawData
      : (() => {
          try{
            const parsed = saved.rawJsonText ? JSON.parse(saved.rawJsonText) : null;
            return parsed && Array.isArray(parsed.itens) ? parsed : null;
          } catch {
            return null;
          }
        })();

    if (restoredRaw){
      state.rawData = restoredRaw;
      els.fileName.textContent = saved.fileName || "Arquivo restaurado";
      fillMonthYearSelectors(els, state.rawData.itens.map(safeItem));

      if (saved.filters){
        if (Array.from(els.anoSelect.options).some(o => o.value === String(saved.filters.ano || "all"))){
          els.anoSelect.value = String(saved.filters.ano || "all");
        }
        if (Array.from(els.mesSelect.options).some(o => o.value === String(saved.filters.mes || "all"))){
          els.mesSelect.value = String(saved.filters.mes || "all");
        }
      }

      renderAllFromRaw(els);
    }

    if (saved.ui?.activePage === "novoAtendimento") abrirNovoAtendimento(false);
    else voltarDashboard(false);

    return true;
  } catch {
    return false;
  }
}

function debounce(fn, delay = 140){
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

function bindLogoFallback(){
  els.yssyLogo?.addEventListener("error", () => {
    els.yssyLogo.style.display = "none";
    els.yssyFallback.style.display = "block";
  });
}

function bindDashboardEvents(){
  const debouncedRender = debounce(() => {
    state.selectedIdx = null;
    renderAllFromRaw(els);
    saveDashboardState();
  });

  els.idLocalidadeSearch.addEventListener("input", debouncedRender);
  els.ticketSearch.addEventListener("input", debouncedRender);

  els.mesSelect.addEventListener("change", () => {
    state.selectedIdx = null;
    renderAllFromRaw(els);
    resetGallery(els);
    els.descAtendimento.textContent = "—";
    saveDashboardState();
  });

  els.anoSelect.addEventListener("change", () => {
    state.selectedIdx = null;
    renderAllFromRaw(els);
    resetGallery(els);
    els.descAtendimento.textContent = "—";
    saveDashboardState();
  });

  els.btnClearSearch.addEventListener("click", () => {
    els.idLocalidadeSearch.value = "";
    els.ticketSearch.value = "";
    els.mesSelect.value = "all";
    els.anoSelect.value = "all";
    state.selectedIdx = null;
    renderAllFromRaw(els);
    resetGallery(els);
    els.descAtendimento.textContent = "—";
    saveDashboardState();
    els.ticketSearch.focus();
  });

  els.jsonFile.addEventListener("change", () => {
    const f = els.jsonFile.files?.[0];
    if (!f) return;
    loadJsonFromFileInput(els, f).then(saveDashboardState);
  });

  els.btnExportPDF.addEventListener("click", () => exportPDF(els));
  els.btnExportPPTX.addEventListener("click", () => exportPPTX(els));
  els.btnAcoes.addEventListener("click", () => abrirNovoAtendimento());

  window.addEventListener("keydown", e => {
    const isRefresh = e.key === "F5" || (e.ctrlKey && e.key.toLowerCase() === "r");
    if (isRefresh) saveDashboardState();
  });

  window.addEventListener("beforeunload", saveDashboardState);
}

function bindAtendimentoEvents(){
  els.btnVoltarDashboard.addEventListener("click", () => voltarDashboard());
  els.btnAtualizarLista.addEventListener("click", () => carregarAcoes(els));
  els.btnTestarConexao.addEventListener("click", () => testarConexao(els));
  els.btnLimparFormulario.addEventListener("click", () => limparFormulario(els));
  els.btnLimparFiltrosTabela.addEventListener("click", () => limparFiltros(els));

  els.formAcao.addEventListener("submit", e => salvarAcao(els, e));
  els.filtroBusca.addEventListener("input", () => aplicarFiltroTabela(els));
  els.filtroAno.addEventListener("input", () => aplicarFiltroTabela(els));
  els.filtroMes.addEventListener("input", () => aplicarFiltroTabela(els));
}

function init(){
  bindLogoFallback();
  initDashboardSelectors(els);
  bindDashboardEvents();
  bindAtendimentoEvents();

  const restored = restoreDashboardState();
  if (!restored && !state.rawData){
    voltarDashboard(false);
  }

  resetGallery(els);
  els.descAtendimento.textContent = "—";
}

init();