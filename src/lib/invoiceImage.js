// Vẽ hóa đơn ra ảnh PNG bằng canvas (không chụp DOM) để ảnh giống nhau trên mọi máy và luôn nền trắng.
// Bố cục bám theo .invoice trong styles.css; đơn vị là px logic, nhân SCALE khi vẽ cho ảnh nét.
const W = 400, PAD = 22, SCALE = 3;
const INK = "#1C2420", MUTED = "#66706A", LINE = "#D6D9CF", OWE = "#B3432B";
const DISPLAY = '"Bricolage Grotesque","Be Vietnam Pro",system-ui,sans-serif';
const BODY = '"Be Vietnam Pro",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';

function wrap(ctx, text, maxW) {
  const lines = [];
  let line = "";
  for (const word of String(text).split(/\s+/)) {
    const next = line ? line + " " + word : word;
    if (line && ctx.measureText(next).width > maxW) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

const loadImage = (src) => new Promise((resolve) => {
  if (!src) return resolve(null);
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = src;
});

// inv: { owner, date, to, label, items: [{date, title, note, amount}], totalLabel, total, qrSrc, qrLines: [string] }
export async function invoiceToPng(inv) {
  await document.fonts?.ready;
  const qr = await loadImage(inv.qrSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const font = (size, weight = 400, fam = BODY) => { ctx.font = `${weight} ${size}px ${fam}`; };

  // Lượt 1 tính chiều cao, lượt 2 vẽ thật
  const pass = (draw) => {
    let y = PAD;
    const text = (s, x, yy, align = "left") => { if (draw) { ctx.textAlign = align; ctx.fillText(s, x, yy); } };
    const rule = (yy, width, color, dash) => {
      if (!draw) return;
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash || []);
      ctx.beginPath(); ctx.moveTo(PAD, yy); ctx.lineTo(W - PAD, yy); ctx.stroke(); ctx.setLineDash([]);
    };
    if (draw) { ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, W, canvas.height / SCALE); }
    ctx.textBaseline = "alphabetic";

    font(24, 700, DISPLAY); ctx.fillStyle = INK; text("Hóa đơn", PAD, y + 22);
    font(12); ctx.fillStyle = MUTED; text(inv.owner, W - PAD, y + 8, "right"); text(inv.date, W - PAD, y + 24, "right");
    y += 36; rule(y, 2, INK); y += 20;

    font(13); ctx.fillStyle = MUTED; text((inv.label ? inv.label + " · " : "") + "Gửi", PAD, y);
    y += 22; font(19, 700); ctx.fillStyle = INK; text(inv.to, PAD, y); y += 14;

    const dateW = 92, amtW = 96, titleX = PAD + dateW, titleW = W - PAD - amtW - titleX - 8;
    if (!inv.items.length) { y += 22; font(14); ctx.fillStyle = MUTED; text("Không có khoản nào chưa thanh toán.", PAD, y); y += 10; }
    for (const it of inv.items) {
      y += 21;
      font(14); const titleLines = wrap(ctx, it.title, titleW);
      font(12); const noteLines = it.note ? wrap(ctx, it.note, titleW) : [];
      font(13); ctx.fillStyle = MUTED; text(it.date, PAD, y);
      font(14); ctx.fillStyle = INK; text(it.amount, W - PAD, y, "right");
      titleLines.forEach((l, i) => text(l, titleX, y + i * 19));
      let yy = y + (titleLines.length - 1) * 19;
      font(12); ctx.fillStyle = MUTED; noteLines.forEach((l) => { yy += 16; text(l, titleX, yy); });
      y = yy + 11; rule(y, 1, LINE, [4, 3]);
    }

    y += 34; font(14); ctx.fillStyle = INK; text(inv.totalLabel, PAD, y);
    font(28, 700, DISPLAY); ctx.fillStyle = OWE; text(inv.total, W - PAD, y, "right");

    if (qr) {
      y += 20; rule(y, 2, INK); y += 16;
      const box = 220, ratio = qr.naturalHeight / qr.naturalWidth || 1;
      const w = ratio > 1 ? box / ratio : box, h = ratio > 1 ? box : box * ratio;
      if (draw) ctx.drawImage(qr, (W - w) / 2, y, w, h);
      y += h + 6;
      font(13); ctx.fillStyle = MUTED;
      for (const l of inv.qrLines) { y += 18; text(l, W / 2, y, "center"); }
    }
    return y + PAD;
  };

  const h = Math.ceil(pass(false));
  canvas.width = W * SCALE; canvas.height = h * SCALE;
  ctx.scale(SCALE, SCALE);
  pass(true);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/png"));
}
