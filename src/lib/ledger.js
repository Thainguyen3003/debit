// Cách tính nợ: mọi số dư đều so với bạn. Dương = họ nợ bạn, âm = bạn nợ họ.
// Mỗi khoản chi: số dư[m] += phần của m − (nếu m là người trả thì tổng tiền).
// Mỗi lần trả tiền: số dư[m] −= amount (amount dương = họ trả bạn, âm = bạn trả họ).
import { today, monthLabel } from "./format.js";

export const ME = "me";
export const CLOSED_MSG = "Tháng này đã chốt sổ. Bấm Mở khóa trong Bảng nếu cần sửa.";

export const sumShares = (e) => Object.values(e.shares || {}).reduce((a, b) => a + (+b || 0), 0);
export const deltaFor = (e, m) => (e.shares?.[m] || 0) - (e.payerId === m ? sumShares(e) : 0);
export const sortKey = (x) => (x.date || "") + String(x.createdAt || 0).padStart(15, "0");
export const byTime = (a, b) => (sortKey(a) < sortKey(b) ? -1 : 1);

export function nameOf(data, id) {
  if (id === ME) return data.settings.myName || "Tôi";
  const m = data.members.find((x) => x.id === id);
  return m ? m.name : "(đã xóa)";
}

export function balances(data) {
  const b = {};
  data.members.forEach((m) => (b[m.id] = 0));
  for (const e of data.expenses) {
    const ids = new Set(Object.keys(e.shares || {}));
    if (e.payerId) ids.add(e.payerId);
    for (const id of ids) if (id !== ME) b[id] = (b[id] || 0) + deltaFor(e, id);
  }
  for (const p of data.payments) b[p.memberId] = (b[p.memberId] || 0) - (+p.amount || 0);
  return b;
}

// Toàn bộ lịch sử của một người theo thời gian, kèm số dư chạy và cờ "đã trả" từng khoản
export function timeline(data, mid) {
  const ev = [];
  for (const e of data.expenses) {
    if (!(e.shares && mid in e.shares) && e.payerId !== mid) continue;
    const sub = e.payerId === mid ? "Bạn ấy trả hộ " + sumShares(e).toLocaleString("vi-VN") + " đ"
      : e.payerId === ME ? "" : nameOf(data, e.payerId) + " trả trước, vẫn tính vào nợ với bạn";
    ev.push({ kind: "exp", id: e.id, date: e.date, createdAt: e.createdAt, title: e.title, sub, payerId: e.payerId, delta: deltaFor(e, mid) });
  }
  for (const p of data.payments) {
    if (p.memberId !== mid) continue;
    ev.push({ kind: "pay", id: p.id, date: p.date, createdAt: p.createdAt,
      title: p.note || (p.amount >= 0 ? "Đã trả tiền" : "Bạn trả lại"), sub: "", delta: -(+p.amount || 0) });
  }
  ev.sort(byTime);
  let run = 0, lastZero = -1;
  ev.forEach((x, i) => { run += x.delta; x.run = run; if (Math.abs(run) < 1) lastZero = i; });
  // Gạch ngang như bảng tính: tiền đã trả được trừ dần vào các khoản cũ nhất trước
  const credit = ev.reduce((a, x) => (x.delta < 0 ? a - x.delta : a), 0);
  let cum = 0;
  ev.forEach((x) => { if (x.delta > 0) { cum += x.delta; x.paid = cum <= credit + 0.5; } });
  return { ev, lastZero, balance: run, credit };
}

// Hóa đơn: theo một tháng (có dòng Nợ cũ), hoặc mọi khoản kể từ lần tất toán gần nhất
export function invoiceData(data, mid, pm) {
  const { ev, lastZero, balance } = timeline(data, mid);
  if (!pm) return { items: ev.slice(lastZero + 1), balance, label: "" };
  let carry = 0;
  const items = [];
  for (const x of ev) {
    if (x.date < pm + "-01") carry += x.delta;
    else if (x.date.startsWith(pm)) items.push(x);
  }
  if (Math.abs(carry) >= 1) items.unshift({ date: "", title: "Nợ cũ", delta: carry });
  return { items, balance: items.reduce((a, x) => a + x.delta, 0), label: monthLabel(pm) };
}

export const isClosed = (data, ym) => data.months.some((x) => x.id === ym && x.closed);

export function sheetMonths(data) {
  const s = new Set([today().slice(0, 7)]);
  data.expenses.forEach((e) => e.date && s.add(e.date.slice(0, 7)));
  data.payments.forEach((p) => p.date && s.add(p.date.slice(0, 7)));
  data.months.forEach((x) => s.add(x.id));
  return [...s].sort();
}
