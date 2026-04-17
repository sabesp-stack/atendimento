import { fmtHours } from "./utils.js";

function roundRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function drawBarChart(canvas, labels, values, opts = {}){
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 600;
  const cssH = canvas.clientHeight || 260;

  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const padL = 10, padR = 10, padT = 10, padB = 28;
  const w = cssW - padL - padR;
  const h = cssH - padT - padB;
  const maxV = Math.max(...values, 1);
  const n = Math.max(labels.length, 1);
  const gap = 8;
  const barW = Math.max(10, Math.floor((w - gap * (n - 1)) / n));

  ctx.strokeStyle = "rgba(148,163,184,.14)";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 3; i++) {
    const y = padT + h * (i / 4);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + w, y);
    ctx.stroke();
  }

  const darkText = opts.valueColor || getComputedStyle(document.documentElement).getPropertyValue("--labelDark").trim() || "rgba(8, 12, 22, .92)";
  const topStop = isA => isA ? "rgba(196,247,44,.95)" : "rgba(91,129,252,.95)";
  const midStop = isA => isA ? "rgba(196,247,44,.70)" : "rgba(91,129,252,.70)";
  const botStop = isA => isA ? "rgba(196,247,44,.28)" : "rgba(91,129,252,.28)";

  for (let i = 0; i < n; i++){
    const v = values[i] || 0;
    const barH = (v / maxV) * h;
    const x = padL + i * (barW + gap);
    const y = padT + (h - barH);
    const isA = i % 2 === 0;

    const g = ctx.createLinearGradient(x, y, x, padT + h);
    g.addColorStop(0, topStop(isA));
    g.addColorStop(0.55, midStop(isA));
    g.addColorStop(1, botStop(isA));

    ctx.fillStyle = g;
    roundRect(ctx, x, y, barW, barH, 8);
    ctx.fill();

    const vt = opts.valueFormatter ? opts.valueFormatter(v) : String(v);
    const meta = (opts.metaLabels && opts.metaLabels[i]) ? String(opts.metaLabels[i]) : "";
    const meta2 = (opts.metaLabels2 && opts.metaLabels2[i]) ? String(opts.metaLabels2[i]) : "";

    ctx.fillStyle = darkText;
    ctx.font = "11px ui-sans-serif, system-ui";
    const line1Y = Math.max(padT + 12, y + 14);
    if (meta) ctx.fillText(meta, x + 8, line1Y);

    const line2Y = line1Y + 14;
    if (meta2) ctx.fillText(meta2, x + 8, line2Y);

    const line3Y = line2Y + 14;
    if (vt) ctx.fillText(vt, x + 8, line3Y);

    const lab = labels[i] || "";
    const short = lab.length > 14 ? lab.slice(0, 14) + "…" : lab;
    ctx.fillStyle = "rgba(167,176,199,.92)";
    ctx.fillText(short, x, padT + h + 18);
  }
}

export function fallbackNoData(canvas){
  drawBarChart(canvas, ["Sem dados"], [0], {
    valueFormatter: () => "",
    metaLabels: [""],
    metaLabels2: [""]
  });
}

export function fmtChartHours(v){
  return `${fmtHours(v)} h`;
}