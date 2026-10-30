import { useState } from "react";
import { useApp } from "../store.jsx";
import { TopBar, ConfirmButton, DateInput } from "../components/ui.jsx";
import { fmt, fmtNum, parseMoney, today } from "../lib/format.js";
import { ME, CLOSED_MSG, sumShares, nameOf, isClosed } from "../lib/ledger.js";

function initForm(e) {
  if (!e) return { date: today(), title: "", payerId: ME, parts: [ME], mode: "equal", amountStr: "", custom: {} };
  return { date: e.date, title: e.title, payerId: e.payerId, parts: Object.keys(e.shares || {}), mode: e.mode || "equal",
    amountStr: e.mode === "custom" ? "" : fmtNum(sumShares(e)),
    custom: Object.fromEntries(Object.entries(e.shares || {}).map(([k, v]) => [k, fmtNum(v)])) };
}

function computeShares(f) {
  const shares = {};
  if (f.mode === "equal") {
    const t = parseMoney(f.amountStr), n = f.parts.length;
    if (n && t) f.parts.forEach((id) => (shares[id] = Math.round(t / n)));
  } else f.parts.forEach((id) => { const v = parseMoney(f.custom[id]); if (v) shares[id] = v; });
  return shares;
}

export default function ExpenseForm() {
  const { data, write, toast, go, p } = useApp();
  const original = p.id ? data.expenses.find((x) => x.id === p.id) : null;
  const [f, setF] = useState(() => initForm(original));
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const back = { view: p.from || "sheet", p: { mid: p.mid, pm: p.pm } };

  const people = [ME, ...data.members.filter((m) => !m.hidden || f.parts.includes(m.id) || f.payerId === m.id).map((m) => m.id)];
  const label = (id) => (id === ME ? nameOf(data, ME) : nameOf(data, id));
  const toggle = (id) => set({ parts: f.parts.includes(id) ? f.parts.filter((x) => x !== id) : [...f.parts, id] });
  const shares = computeShares(f);
  const ids = Object.keys(shares);
  const total = ids.reduce((a, id) => a + shares[id], 0);

  function switchMode(mode) {
    if (mode === f.mode) return;
    if (mode === "custom") set({ mode, custom: Object.fromEntries(Object.entries(shares).map(([k, v]) => [k, fmtNum(v)])) });
    else set({ mode, amountStr: fmtNum(total) });
  }

  async function save() {
    if (!f.title.trim()) return toast("Nhập nội dung khoản chi");
    if (!ids.length) return toast("Nhập số tiền và chọn người tham gia");
    if (!f.date) return toast("Chọn ngày");
    if (isClosed(data, f.date.slice(0, 7)) || (original && isClosed(data, original.date.slice(0, 7)))) return toast(CLOSED_MSG);
    const body = { date: f.date, title: f.title.trim(), payerId: f.payerId, mode: f.mode, shares, total,
      createdAt: original?.createdAt || Date.now(), updatedAt: Date.now() };
    const ok = await write((db) => (original ? db.doc("expenses/" + original.id).set(body) : db.collection("expenses").add(body)),
      original ? "Đã lưu thay đổi" : "Đã thêm khoản chi");
    if (ok) go(back.view, back.p);
  }
  async function remove() {
    if (isClosed(data, original.date.slice(0, 7))) return toast(CLOSED_MSG);
    if (await write((db) => db.doc("expenses/" + original.id).delete(), "Đã xóa khoản chi")) go(back.view, back.p);
  }

  return <>
    <TopBar title={original ? "Sửa khoản chi" : "Thêm khoản chi"} back={back} />
    <div className="card">
      <div className="field"><label htmlFor="f-title">Nội dung</label>
        <input className="input" id="f-title" value={f.title} placeholder="Ví dụ: Bún đậu, Phê La" onChange={(e) => set({ title: e.target.value })} /></div>
      <div className="grid2">
        <div className="field"><label htmlFor="f-date">Ngày</label>
          <DateInput className="input" id="f-date" value={f.date} onChange={(e) => set({ date: e.target.value })} /></div>
        <div className="field"><label htmlFor="f-payer">Ai trả tiền</label>
          <select className="input" id="f-payer" value={f.payerId} onChange={(e) => set({ payerId: e.target.value })}>
            {people.map((id) => <option key={id} value={id}>{id === ME ? label(id) + " (bạn)" : label(id)}</option>)}
          </select></div>
      </div>
      <div className="field"><span className="flabel">Ai tham gia</span>
        <div className="chips">{people.map((id) => (
          <button key={id} className={"chip" + (f.parts.includes(id) ? " on" : "")} onClick={() => toggle(id)}>{label(id)}</button>
        ))}</div>
        <div className="btns" style={{ marginTop: 6 }}>
          <button className="btn" style={{ flex: "none", padding: "4px 10px", fontSize: 13 }} onClick={() => set({ parts: [ME, ...data.members.filter((m) => !m.hidden).map((m) => m.id)] })}>Chọn tất cả</button>
          <button className="btn" style={{ flex: "none", padding: "4px 10px", fontSize: 13 }} onClick={() => set({ parts: [] })}>Bỏ chọn</button>
        </div>
      </div>
      <div className="field"><span className="flabel">Cách chia</span>
        <div className="seg">
          <button className={f.mode === "equal" ? "on" : ""} onClick={() => switchMode("equal")}>Chia đều</button>
          <button className={f.mode === "custom" ? "on" : ""} onClick={() => switchMode("custom")}>Nhập từng người</button>
        </div></div>
      {f.mode === "equal" ? (
        <div className="field"><label htmlFor="f-amount">Tổng tiền</label>
          <input className="input big num" id="f-amount" inputMode="decimal" placeholder="0" value={f.amountStr} onChange={(e) => set({ amountStr: e.target.value })} />
          <span className="hint">Gõ được 365k, 1.2tr hoặc 365000.</span></div>
      ) : (
        <div className="field"><span className="flabel">Số tiền từng người</span>
          {f.parts.length ? f.parts.map((id) => (
            <div key={id} className="share-row"><span className="n">{label(id)}</span>
              <input className="input num" inputMode="decimal" placeholder="0" value={f.custom[id] || ""}
                onChange={(e) => set({ custom: { ...f.custom, [id]: e.target.value } })} /></div>
          )) : <span className="hint">Chọn người tham gia trước.</span>}
        </div>
      )}
      {!ids.length ? <p className="hint">Nhập số tiền và chọn người tham gia để xem mỗi người phải trả bao nhiêu.</p> : <>
        {f.mode === "equal" && <p className="hint">Mỗi người {fmt(shares[ids[0]])} × {ids.length} người</p>}
        <div className="preview"><span>Tổng</span><span className="num">{fmt(total)}</span></div>
        {f.payerId !== ME && <p className="hint" style={{ marginTop: 6 }}>{label(f.payerId)} trả hộ, nên sẽ được trừ {fmt(total - (shares[f.payerId] || 0))}{shares[ME] ? " (gồm phần của bạn)" : ""}.</p>}
      </>}
    </div>
    <div className="btns" style={{ marginTop: 12 }}><button className="btn primary block" onClick={save}>{original ? "Lưu thay đổi" : "Lưu khoản chi"}</button></div>
    {original && <div className="btns" style={{ marginTop: 8 }}>
      <ConfirmButton className="btn danger block" label="Xóa khoản chi này" confirmLabel="Xác nhận xóa" onConfirm={remove} />
    </div>}
  </>;
}
