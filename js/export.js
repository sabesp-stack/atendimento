import { state } from "./state.js";
import { sanitizeFilename, yearLabel, monthLabel } from "./utils.js";
import { applyMonthYearFilter, applySearchFilters } from "./dashboard.js";

function loadScript(src){
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve(src);
    s.onerror = () => reject(new Error("Falha ao carregar: " + src));
    document.head.appendChild(s);
  });
}

const PPTX_LOCAL = "./libs/pptxgen.bundle.min.js";
const PPTX_CDN = "https://unpkg.com/pptxgenjs@3.12.0/dist/pptxgen.bundle.js";

let pptxLibReadyPromise = null;

async function ensurePptx(){
  if (typeof window.PptxGenJS !== "undefined") return true;
  if (!pptxLibReadyPromise){
    pptxLibReadyPromise = (async () => {
      try{
        await loadScript(PPTX_LOCAL);
        if (typeof window.PptxGenJS !== "undefined") return true;
      } catch {}
      try{
        await loadScript(PPTX_CDN);
        return typeof window.PptxGenJS !== "undefined";
      } catch {
        return false;
      }
    })();
  }
  return pptxLibReadyPromise;
}

export function exportPDF(els){
  const prevTitle = document.title;
  const anoVal = String(els.anoSelect.value || "all");
  const mesVal = String(els.mesSelect.value || "all");
  const mesRef = `${yearLabel(anoVal)}-${monthLabel(mesVal)}`;
  const idPart = String(els.idLocalidadeSearch.value || "").trim() ? `id_${els.idLocalidadeSearch.value}` : "todosIds";
  const tPart = String(els.ticketSearch.value || "").trim() ? `ticket_${els.ticketSearch.value}` : "todosTickets";

  document.title = `KPIs_${mesRef}_${idPart}_${tPart}`.replace(/[\\/:*?"<>|]/g, "_");
  window.print();
  setTimeout(() => { document.title = prevTitle; }, 800);
}

function kpiTextValue(el){
  return (el?.textContent || "—").trim();
}

async function loadImageAsBase64_FileSafe(srcPath){
  const src = String(srcPath || "").trim();
  if (!src) return null;

  const resolved = (/^(https?:|data:|file:)/i.test(src))
    ? src
    : new URL(src, window.location.href).href;

  return new Promise(resolve => {
    const img = new Image();
    if (/^https?:/i.test(resolved)) img.crossOrigin = "anonymous";

    img.onload = () => {
      try{
        const c = document.createElement("canvas");
        c.width = img.naturalWidth || img.width || 1;
        c.height = img.naturalHeight || img.height || 1;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(c.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = resolved;
  });
}

export async function exportPPTX(els){
  const ok = await ensurePptx();
  if (!ok || typeof window.PptxGenJS === "undefined"){
    els.errorBox.textContent =
      "Exportar PPTX: não foi possível carregar a biblioteca. " +
      "Opção 1: coloque o arquivo em ./libs/pptxgen.bundle.min.js (offline). " +
      "Opção 2: libere internet para usar o fallback automático.";
    return;
  }

  const pptx = new window.PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "YSSY";
  pptx.company = "YSSY";
  pptx.subject = "KPIs de Atendimentos";
  pptx.title = "Dashboard de Indicadores de Atendimento";

  const anoVal = String(els.anoSelect.value || "all");
  const mesVal = String(els.mesSelect.value || "all");
  const mesRef = `${yearLabel(anoVal)}-${monthLabel(mesVal)}`;
  const now = new Date().toLocaleString("pt-BR");

  const qId = String(els.idLocalidadeSearch.value || "").trim();
  const qTicket = String(els.ticketSearch.value || "").trim();
  const scopeBits = [`Ano: ${yearLabel(anoVal)}`, `Mês: ${monthLabel(mesVal)}`];
  if (qId) scopeBits.push(`Id contém: ${qId}`);
  if (qTicket) scopeBits.push(`Ticket contém: ${qTicket}`);
  const scopeTxt = `Filtro: ${scopeBits.join(" • ")}`;

  const NAVY = "001B60";
  const BLUE = "5B81FC";
  const LIME = "C4F72C";
  const GRAY = "6B7280";
  const GRAY2 = "9CA3AF";
  const LINE = "E5E7EB";
  const WHITE = "FFFFFF";

  const logoBase64 = await loadImageAsBase64_FileSafe("./yssy_logo.png");

  const s = pptx.addSlide();
  s.background = { color: WHITE };
  s.addShape(pptx.ShapeType.rect, { x:0, y:0, w:13.333, h:0.78, fill:{ color:NAVY }, line:{ color:NAVY } });
  s.addText("Dashboard de Indicadores de Atendimento", {
    x:0.7, y:0.17, w:9.5, h:0.45, fontFace:"Calibri", fontSize:24, bold:true, color:WHITE
  });

  if (logoBase64) {
    s.addImage({ data: logoBase64, x:11.033, y:0.16, w:1.6, h:0.46 });
  } else {
    s.addText("YSSY", { x:11.9, y:0.2, w:1.4, h:0.35, fontFace:"Calibri", fontSize:16, bold:true, color:WHITE, align:"right" });
  }

  s.addText(`Ref: ${mesRef}`, { x:10.9, y:0.18, w:1.9, h:0.22, fontFace:"Calibri", fontSize:11, color:WHITE, bold:true, align:"right" });
  s.addText(`${now}`, { x:10.5, y:0.42, w:2.3, h:0.22, fontFace:"Calibri", fontSize:10, color:"D1D5DB", align:"right" });
  s.addText(scopeTxt, { x:0.7, y:0.95, w:12.0, h:0.3, fontFace:"Calibri", fontSize:12, color:GRAY });
  s.addShape(pptx.ShapeType.rect, { x:0.7, y:1.28, w:12.0, h:0.02, fill:{ color:LINE }, line:{ color:LINE } });

  const kpis = [
    { label:"Total de Tickets/Mês", value:kpiTextValue(els.kpiTickets), accent:LIME },
    { label:"Localidades Atendidas/Mês", value:kpiTextValue(els.kpiLocais), accent:BLUE },
    { label:"Equipamentos Trocados/Mês", value:kpiTextValue(els.kpiEquip), accent:LIME },
    { label:"Equipamentos Configurados/Mês", value:kpiTextValue(els.kpiEquipCfg), accent:BLUE },
    { label:"Tempo Gasto (Atividades)", value:kpiTextValue(els.kpiTempoHoras), accent:LIME },
    { label:"Total de Pontos de Rede/Mês", value:kpiTextValue(els.kpiMediaPontos), accent:BLUE },
  ];

  const startX = 0.7, startY = 1.55, gapX = 0.35, gapY = 0.35;
  const cardW = (12.0 - (2 * gapX)) / 3;
  const cardH = 2.25;

  kpis.forEach((k, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = startX + col * (cardW + gapX);
    const y = startY + row * (cardH + gapY);

    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w:cardW, h:cardH,
      fill:{ color:WHITE },
      line:{ color:LINE, width:1 },
      radius:0.22
    });

    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w:cardW, h:0.16,
      fill:{ color:k.accent },
      line:{ color:k.accent },
      radius:0.22
    });

    s.addText(k.label, {
      x:x+0.28, y:y+0.35, w:cardW-0.56, h:0.35,
      fontFace:"Calibri", fontSize:14, color:GRAY, bold:true
    });

    s.addText(k.value || "—", {
      x:x+0.28, y:y+0.78, w:cardW-0.56, h:0.85,
      fontFace:"Calibri", fontSize:36, color:NAVY, bold:true
    });

    s.addText("Indicador do filtro selecionado", {
      x:x+0.28, y:y+1.70, w:cardW-0.56, h:0.25,
      fontFace:"Calibri", fontSize:11, color:GRAY2
    });
  });

  s.addShape(pptx.ShapeType.rect, { x:0, y:7.25, w:13.333, h:0.25, fill:{ color:"F9FAFB" }, line:{ color:"F9FAFB" } });
  s.addText("YSSY • KPIs de Atendimentos", { x:0.7, y:7.28, w:12.0, h:0.2, fontFace:"Calibri", fontSize:10, color:GRAY2 });

  const idPart = qId ? `id_${qId}` : "todosIds";
  const tPart = qTicket ? `ticket_${qTicket}` : "todosTickets";
  const name = sanitizeFilename(`KPIs_${mesRef}_${idPart}_${tPart}`);
  await pptx.writeFile({ fileName: `${name}.pptx` });
}

export function getFilteredItemsForExport(els){
  if (!state.rawData) return [];
  const items = state.rawData.itens || [];
  return applySearchFilters(els, applyMonthYearFilter(els, items.map(i => i)));
}