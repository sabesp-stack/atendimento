import { state } from "./state.js";
import { escapeHtml } from "./utils.js";

export function getApiBase(els){
  return els.api_base.value.trim().replace(/\/+$/, "");
}

export function mostrarStatus(el, mensagem, tipo = "info"){
  el.className = `status show ${tipo}`;
  el.textContent = mensagem;
}

export function esconderStatus(el){
  el.className = "status";
  el.textContent = "";
}

export async function testarConexao(els){
  esconderStatus(els.statusApi);
  const API_BASE = getApiBase(els);

  if (!API_BASE) {
    mostrarStatus(els.statusApi, "Informe a URL do Web App do Google Sheets.", "error");
    return;
  }

  try {
    const resp = await fetch(API_BASE, { method: "GET" });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    const data = await resp.json();

    if (Array.isArray(data) || data.ok === true) {
      mostrarStatus(els.statusApi, "Conexão com Google Sheets realizada com sucesso.", "ok");
    } else {
      mostrarStatus(els.statusApi, "Web App respondeu, mas retornou erro.", "error");
    }
  } catch (error) {
    console.error("Erro ao testar conexão:", error);
    mostrarStatus(
      els.statusApi,
      "Não foi possível conectar ao Google Sheets. Verifique a URL do Web App e a implantação.",
      "error"
    );
  }
}

export function obterPayloadFormulario(els){
  return {
    ano: Number(els.ano.value || 0),
    mes: Number(els.mes.value || 0),
    dia: Number(els.dia.value || 0),
    numero_ticket: els.numero_ticket.value.trim(),
    id_localidade: els.id_localidade.value.trim(),
    localidade: els.localidade.value.trim(),
    tempo_gasto_horas: Number(els.tempo_gasto_horas.value || 0),
    equipamentos_trocados: Number(els.equipamentos_trocados.value || 0),
    equipamentos_configurados: Number(els.equipamentos_configurados.value || 0),
    pontos_de_rede: Number(els.pontos_de_rede.value || 0),
    foto_antes_url: els.foto_antes_url.value.trim(),
    foto_depois_url: els.foto_depois_url.value.trim(),
    descricao_atendimento: els.descricao_atendimento.value.trim()
  };
}

export function validarPayload(payload){
  if (!payload.ano || payload.ano < 2020) return "Informe um ano válido.";
  if (!payload.mes || payload.mes < 1 || payload.mes > 12) return "Informe um mês válido.";
  if (!payload.dia || payload.dia < 1 || payload.dia > 31) return "Informe um dia válido.";
  if (!payload.numero_ticket && !payload.localidade && !payload.descricao_atendimento) {
    return "Preencha ao menos Nº Ticket, Localidade ou Descrição.";
  }
  return null;
}

export async function salvarAcao(els, event){
  if (event) event.preventDefault();
  esconderStatus(els.statusForm);

  const API_BASE = getApiBase(els);
  const payload = obterPayloadFormulario(els);
  const erroValidacao = validarPayload(payload);

  if (erroValidacao) {
    mostrarStatus(els.statusForm, erroValidacao, "error");
    return;
  }

  if (!API_BASE) {
    mostrarStatus(els.statusForm, "Informe a URL do Web App do Google Sheets.", "error");
    return;
  }

  try {
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const texto = await response.text();
      throw new Error(texto || `Erro HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Falha ao salvar no Google Sheets.");
    }

    mostrarStatus(els.statusForm, "Atendimento cadastrado com sucesso no Google Sheets.", "ok");
    limparFormulario(els, false);
    await carregarAcoes(els);
  } catch (error) {
    console.error("Erro ao salvar:", error);
    mostrarStatus(
      els.statusForm,
      "Erro ao salvar no Google Sheets. Verifique a URL do Web App, a implantação e as permissões.",
      "error"
    );
  }
}

export function limparFormulario(els, limparStatus = true){
  els.formAcao.reset();
  els.ano.value = "2026";
  els.dia.value = "1";
  if (limparStatus) esconderStatus(els.statusForm);
}

export async function carregarAcoes(els){
  esconderStatus(els.statusTabela);
  const API_BASE = getApiBase(els);

  els.tbodyAcoes.innerHTML = `
    <tr>
      <td colspan="13" class="muted">Carregando registros...</td>
    </tr>
  `;

  if (!API_BASE) {
    els.tbodyAcoes.innerHTML = `
      <tr>
        <td colspan="13" class="muted">Informe a URL do Web App para carregar os registros.</td>
      </tr>
    `;
    return;
  }

  try {
    const response = await fetch(API_BASE, { method: "GET" });

    if (!response.ok) {
      const texto = await response.text();
      throw new Error(texto || `HTTP ${response.status}`);
    }

    const lista = await response.json();

    if (!Array.isArray(lista)) {
      throw new Error("Resposta inválida ao carregar registros.");
    }

    state.acoesCache = lista;
    renderizarTabela(els, state.acoesCache);
    mostrarStatus(els.statusTabela, `${state.acoesCache.length} registro(s) carregado(s).`, "info");
  } catch (error) {
    console.error("Erro ao carregar ações:", error);
    state.acoesCache = [];
    els.tbodyAcoes.innerHTML = `
      <tr>
        <td colspan="13" class="muted">Erro ao carregar registros.</td>
      </tr>
    `;
    mostrarStatus(els.statusTabela, "Erro ao carregar registros do Google Sheets.", "error");
  }
}

export function renderizarTabela(els, lista){
  if (!lista.length) {
    els.tbodyAcoes.innerHTML = `
      <tr>
        <td colspan="13" class="muted">Nenhum registro encontrado.</td>
      </tr>
    `;
    return;
  }

  els.tbodyAcoes.innerHTML = lista.map(item => {
    const fotoAntesValor = String(item["Foto Antes (caminho/URL)"] || "").trim();
    const fotoDepoisValor = String(item["Foto Depois (caminho/URL)"] || "").trim();

    const fotoAntes = fotoAntesValor
      ? `<a href="${escapeHtml(fotoAntesValor)}" target="_blank" rel="noopener noreferrer">Abrir</a>`
      : `<span class="muted">-</span>`;

    const fotoDepois = fotoDepoisValor
      ? `<a href="${escapeHtml(fotoDepoisValor)}" target="_blank" rel="noopener noreferrer">Abrir</a>`
      : `<span class="muted">-</span>`;

    return `
      <tr>
        <td>${escapeHtml(item["Ano"] ?? "")}</td>
        <td>${escapeHtml(item["Mês (1-12)"] ?? "")}</td>
        <td>${escapeHtml(item["Dia"] ?? "")}</td>
        <td>${escapeHtml(item["Nº Ticket"] ?? "")}</td>
        <td>${escapeHtml(item["Id Localidade"] ?? "")}</td>
        <td>${escapeHtml(item["Localidade"] ?? "")}</td>
        <td>${escapeHtml(item["Tempo (Horas)"] ?? "")}</td>
        <td>${escapeHtml(item["Qtde Equip. Trocados"] ?? "")}</td>
        <td>${escapeHtml(item["Qtde Equip. Configurados"] ?? "")}</td>
        <td>${escapeHtml(item["Pontos de Rede"] ?? "")}</td>
        <td>${fotoAntes}</td>
        <td>${fotoDepois}</td>
        <td>${escapeHtml(item["Descrição Atendimento"] ?? "")}</td>
      </tr>
    `;
  }).join("");
}

export function aplicarFiltroTabela(els){
  const busca = els.filtroBusca.value.trim().toLowerCase();
  const ano = els.filtroAno.value.trim();
  const mes = els.filtroMes.value.trim();

  const filtrada = state.acoesCache.filter(item => {
    const texto = [
      item["Nº Ticket"],
      item["Id Localidade"],
      item["Localidade"],
      item["Descrição Atendimento"]
    ].join(" ").toLowerCase();

    const okBusca = !busca || texto.includes(busca);
    const okAno = !ano || String(item["Ano"]) === String(ano);
    const okMes = !mes || String(item["Mês (1-12)"]) === String(mes);

    return okBusca && okAno && okMes;
  });

  renderizarTabela(els, filtrada);
  mostrarStatus(els.statusTabela, `${filtrada.length} registro(s) exibido(s) após filtro.`, "info");
}

export function limparFiltros(els){
  els.filtroBusca.value = "";
  els.filtroAno.value = "";
  els.filtroMes.value = "";
  renderizarTabela(els, state.acoesCache);
  mostrarStatus(els.statusTabela, `${state.acoesCache.length} registro(s) exibido(s).`, "info");
}