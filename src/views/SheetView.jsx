import { useRef, useState } from "react";
import { useApp } from "../store.jsx";
import { TopBar, ConfirmButton, Fab, Empty, DateInput } from "../components/ui.jsx";
import { fmt, fmtNum, money, parseMoney, today, dmy, monthLabel, wd, isWeekend, nextYm } from "../lib/format.js";
import { ME, CLOSED_MSG, sumShares, byTime, nameOf, timeline, isClosed, sheetMonths } from "../lib/ledger.js";

let rememberedMonth = ""; // giữ tháng đang xem khi chuyển qua lại giữa các màn

// Ô tiền giống bảng tính: gạch ngang = đã trả, xanh có dấu trừ = tiền đã trả hoặc trả hộ
const cls = (x) => (x.delta < 0 ? "neg" : x.paid ? "paid" : "due");

function DayCells({ date, show }) {
  if (!show) return <><td className="c-date" /><td /></>;
  return <><td className="c-date">{dmy(date)}</td><td><span className={"wday" + (isWeekend(date) ? " we" : "")}>{wd(date)}</span></td></>;
}

export default function SheetView() {
  const { data, write, toast, go } = useApp();
  const ms = sheetMonths(data);
  const [picked, setPicked] = useState(rememberedMonth);
  const ym = ms.includes(picked) ? picked : ms[ms.length - 1];
  const setMonth = (m) => { rememberedMonth = m; setPicked(m); };
  const start = ym + "-01", inM = (d) => (d || "").startsWith(ym), locked = isClosed(data, ym), idx = ms.indexOf(ym);

  const [edit, setEdit] = useState(null); // ô đang sửa: {eid, key, value}
  const editRef = useRef(null);
  const [draft, setDraft] = useState(null); // dòng trống để gõ khoản mới
  const titleRef = useRef(null);

  if (!data.members.length) {
    return <>
      <TopBar title="Sổ Ghi Nợ" />
      <Empty title="Chưa có ai trong sổ">Thêm những người hay ăn uống chung để bắt đầu.
        <div style={{ marginTop: 14 }}><button className="btn primary" onClick={() => go("members")}>Thêm thành viên</button></div></Empty>
    </>;
  }

  // Mỗi người: các dòng trong sổ, nợ cũ đầu tháng, nợ cũ đã trả hết chưa, số dư cuối tháng
  const info = {};
  for (const m of data.members) {
    const { ev, credit } = timeline(data, m.id);
    const byId = {};
    let carry = 0, before = 0, month = 0, inMonth = false;
    for (const x of ev) {
      byId[x.kind + x.id] = x;
      if (x.date < start) { carry += x.delta; if (x.delta > 0) before += x.delta; }
      else if (inM(x.date)) { month += x.delta; inMonth = true; }
    }
    info[m.id] = { byId, carry, carryPaid: before <= credit + 0.5, inMonth, end: carry + month };
  }
  const cols = data.members.filter((m) => !m.hidden || info[m.id].inMonth || Math.abs(info[m.id].carry) >= 1);
  const rows = [...data.expenses.filter((e) => inM(e.date)).map((e) => ({ ...e, kind: "exp" })),
    ...data.payments.filter((p) => inM(p.date)).map((p) => ({ ...p, kind: "pay" }))].sort(byTime);
  const exps = rows.filter((x) => x.kind === "exp");
  const spent = exps.reduce((a, e) => a + sumShares(e), 0);
  const mine = exps.reduce((a, e) => a + (e.shares?.[ME] || 0), 0);
  const active = cols.filter((m) => info[m.id].inMonth || Math.abs(info[m.id].carry) >= 1);
  const oweEnd = active.reduce((a, m) => a + Math.max(0, info[m.id].end), 0);
  const credEnd = active.reduce((a, m) => a + Math.max(0, -info[m.id].end), 0);
  const settled = active.filter((m) => Math.abs(info[m.id].end) < 1).length;
  const people = [ME, ...cols.map((m) => m.id)];

  const d = draft && draft.month === ym ? draft : { month: ym, date: inM(today()) ? today() : start, title: "", payerId: ME, vals: {} };
  const setD = (patch) => setDraft({ ...d, ...patch });

  // ---- sửa trực tiếp một ô ----
  function startCell(x, key) {
    if (locked) return toast(CLOSED_MSG);
    const e = { eid: x.id, key, value: key === "title" ? x.title : fmtNum(x.shares?.[key]) };
    editRef.current = e; setEdit(e);
  }
  async function commitCell(save) {
    const e = editRef.current;
    if (!e) return;
    editRef.current = null; setEdit(null);
    const exp = data.expenses.find((x) => x.id === e.eid);
    if (!save || !exp) return;
    const { id, ...body } = exp;
    const next = { ...body, shares: { ...(exp.shares || {}) }, updatedAt: Date.now() };
    if (e.key === "title") {
      const v = e.value.trim();
      if (!v || v === exp.title) return;
      next.title = v;
    } else {
      const v = parseMoney(e.value);
      if ((next.shares[e.key] || 0) === v) return;
      if (v) next.shares[e.key] = v; else delete next.shares[e.key];
      if (!Object.keys(next.shares).length) return toast("Khoản chi phải có ít nhất một người");
      next.mode = "custom"; next.total = sumShares(next);
    }
    await write((db) => db.doc("expenses/" + id).set(next), "Đã lưu");
  }
  const cellInput = (numeric) => (
    <input className={"cellin" + (numeric ? " num" : "")} autoFocus inputMode={numeric ? "decimal" : undefined}
      value={edit.value} onFocus={(ev) => ev.target.select()}
      onChange={(ev) => { editRef.current = { ...edit, value: ev.target.value }; setEdit(editRef.current); }}
      onKeyDown={(ev) => { if (ev.key === "Enter") commitCell(true); if (ev.key === "Escape") commitCell(false); }}
      onBlur={() => commitCell(true)} />
  );
  const isEditing = (id, key) => edit && edit.eid === id && edit.key === key;
  const moneyCell = (x, item, key) => {
    if (isEditing(x.id, key)) return <td key={key} className="editing" onClick={(e) => e.stopPropagation()}>{cellInput(true)}</td>;
    const onClick = locked ? undefined : (e) => { e.stopPropagation(); startCell(x, key); };
    const editable = locked ? {} : { "data-cell": "" };
    if (!item || !item.delta) return <td key={key} onClick={onClick} {...editable} />;
    return <td key={key} className={cls(item)} onClick={onClick} {...editable}>{money(item.delta)}</td>;
  };

  // ---- thêm dòng mới ----
  async function saveDraft() {
    const shares = {};
    for (const [k, v] of Object.entries(d.vals)) { const n = parseMoney(v); if (n) shares[k] = n; }
    if (!d.title.trim()) return toast("Gõ nội dung khoản chi");
    if (!Object.keys(shares).length) return toast("Gõ số tiền vào ô của ít nhất một người");
    if (!d.date) return toast("Chọn ngày");
    if (isClosed(data, d.date.slice(0, 7))) return toast(CLOSED_MSG);
    const ok = await write((db) => db.collection("expenses").add({ date: d.date, title: d.title.trim(), payerId: d.payerId, mode: "custom",
      shares, total: Object.values(shares).reduce((a, b) => a + b, 0), createdAt: Date.now(), updatedAt: Date.now() }), "Đã thêm dòng");
    if (ok) {
      const m = d.date.slice(0, 7);
      setMonth(m); setDraft({ ...d, month: m, title: "", vals: {} });
      titleRef.current?.focus();
    }
  }
  const draftKey = (ev) => { if (ev.key === "Enter") { ev.preventDefault(); saveDraft(); } };

  // ---- tháng ----
  async function newMonth() {
    const m = nextYm(ms[ms.length - 1]);
    if (await write((db) => db.doc("months/" + m).set({ closed: false, createdAt: Date.now() }), "Đã tạo " + monthLabel(m).toLowerCase())) setMonth(m);
  }
  const setClosed = (closed) => write((db) => db.doc("months/" + ym).set({ closed, [closed ? "closedAt" : "openedAt"]: Date.now() }),
    closed ? "Đã chốt sổ" : "Đã mở khóa");

  let prev = "";
  return <>
    <TopBar title="Sổ Ghi Nợ" />
    <div className="monthbar">
      <button className="back" aria-label="Tháng trước" disabled={idx <= 0} onClick={() => setMonth(ms[idx - 1])}>‹</button>
      <div className="months">{ms.map((m) => (
        <button key={m} className={"chip" + (m === ym ? " on" : "")} onClick={() => setMonth(m)}>{monthLabel(m)}{isClosed(data, m) ? " · đã chốt" : ""}</button>
      ))}</div>
      <button className="back" aria-label="Tháng sau" disabled={idx >= ms.length - 1} onClick={() => setMonth(ms[idx + 1])}>›</button>
      <button className="chip" onClick={newMonth}>+ Tháng mới</button>
    </div>

    <div className="msum">
      <div><span className="lbl">Tổng chi tháng</span><b className="num">{fmt(spent)}</b></div>
      <div><span className="lbl">Phần của {nameOf(data, ME)}</span><b className="num">{fmt(mine)}</b></div>
      <div><span className="lbl">Còn nợ bạn</span><b className="num c-owe">{fmt(oweEnd)}</b></div>
      <div><span className="lbl">Bạn còn nợ</span><b className="num c-credit">{fmt(credEnd)}</b></div>
      <div><span className="lbl">Đã tất toán</span><b className="num">{settled}/{active.length} người</b></div>
    </div>
    <div className="mstatus">
      {locked ? <>
        <span className="pill zero">Đã chốt sổ {monthLabel(ym).toLowerCase()}</span>
        <ConfirmButton className="btn" label="Mở khóa" confirmLabel="Mở khóa để sửa" onConfirm={() => setClosed(false)} />
      </> : <>
        <span className="hint">Xong tháng thì chốt sổ để khóa lại, tránh sửa nhầm. Số còn nợ vẫn chuyển sang Nợ cũ của tháng sau.</span>
        <ConfirmButton className="btn" label="Chốt sổ tháng này" confirmLabel={"Chốt sổ " + monthLabel(ym).toLowerCase()} onConfirm={() => setClosed(true)} />
      </>}
    </div>

    <div className={"sheet" + (locked ? " locked" : "")}>
      <table>
        <thead><tr>
          <th className="c-date">Ngày</th><th>Thứ</th><th>Nội dung</th><th>{nameOf(data, ME)}</th>
          {cols.map((m) => <th key={m.id}><button onClick={() => go("person", { mid: m.id, pm: ym })}>{m.name}</button></th>)}
        </tr></thead>
        <tbody>
          {cols.some((m) => Math.abs(info[m.id].carry) >= 1) && (
            <tr><td className="c-date" /><td /><td className="t red b">Nợ cũ</td><td />
              {cols.map((m) => {
                const c = info[m.id].carry;
                return Math.abs(c) < 1 ? <td key={m.id} /> : <td key={m.id} className={"b " + (c < 0 ? "neg" : info[m.id].carryPaid ? "paid" : "due")}>{money(c)}</td>;
              })}
            </tr>
          )}
          {rows.map((x) => {
            const show = x.date !== prev; prev = x.date;
            if (x.kind === "pay") return (
              <tr key={"p" + x.id} className="click" onClick={() => go("person", { mid: x.memberId, pm: ym })}>
                <DayCells date={x.date} show={show} />
                <td className="t"><i>{x.amount >= 0 ? nameOf(data, x.memberId) + " trả tiền" : "Bạn trả " + nameOf(data, x.memberId)}</i>{x.note && <span className="hint"> · {x.note}</span>}</td>
                <td />{cols.map((m) => { const it = info[m.id].byId["pay" + x.id]; return <td key={m.id} className={it ? cls(it) : ""}>{it ? money(it.delta) : ""}</td>; })}
              </tr>
            );
            return (
              <tr key={x.id} className="click" onClick={() => (locked ? toast(CLOSED_MSG) : go("expense", { id: x.id, from: "sheet" }))}>
                <DayCells date={x.date} show={show} />
                {isEditing(x.id, "title")
                  ? <td className="t editing" onClick={(e) => e.stopPropagation()}>{cellInput(false)}</td>
                  : <td className="t" {...(locked ? {} : { "data-cell": "" })} onClick={locked ? undefined : (e) => { e.stopPropagation(); startCell(x, "title"); }}>
                      {x.title}{x.payerId !== ME && <span className="hint"> · {nameOf(data, x.payerId)} trả</span>}</td>}
                {moneyCell(x, x.shares?.[ME] ? { delta: x.shares[ME] } : null, ME)}
                {cols.map((m) => moneyCell(x, info[m.id].byId["exp" + x.id], m.id))}
              </tr>
            );
          })}
          {!rows.length && locked && <tr><td className="c-date" /><td colSpan={3 + cols.length} className="t c-muted">Không có khoản chi nào trong {monthLabel(ym).toLowerCase()}.</td></tr>}
          {!locked && (
            <tr className="draft">
              <td className="c-date"><DateInput className="cellin" aria-label="Ngày" value={d.date} onChange={(e) => setD({ date: e.target.value })} /></td>
              <td>{d.date && <span className="wday">{wd(d.date)}</span>}</td>
              <td className="t">
                <input ref={titleRef} className="cellin" placeholder="Gõ khoản chi mới…" value={d.title} onChange={(e) => setD({ title: e.target.value })} onKeyDown={draftKey} />
                <select className="cellin small" aria-label="Ai trả" value={d.payerId} onChange={(e) => setD({ payerId: e.target.value })}>
                  {people.map((id) => <option key={id} value={id}>{id === ME ? "Bạn trả" : nameOf(data, id) + " trả"}</option>)}
                </select>
              </td>
              {people.map((id) => (
                <td key={id}><input className="cellin num" inputMode="decimal" placeholder="0" aria-label={"Phần của " + nameOf(data, id)}
                  value={d.vals[id] || ""} onChange={(e) => setD({ vals: { ...d.vals, [id]: e.target.value } })} onKeyDown={draftKey} /></td>
              ))}
            </tr>
          )}
          <tr className="sum"><td className="c-date" /><td /><td className="t red">Tổng</td><td>{mine ? money(mine) : ""}</td>
            {cols.map((m) => {
              const i = info[m.id], v = i.end;
              if (Math.abs(v) < 1) return <td key={m.id} className={i.inMonth || Math.abs(i.carry) >= 1 ? "done" : ""}>{i.inMonth || Math.abs(i.carry) >= 1 ? "Đã tất toán" : ""}</td>;
              return <td key={m.id} className={v > 0 ? "red" : "neg"}>{money(v)}</td>;
            })}
          </tr>
        </tbody>
      </table>
    </div>
    {locked
      ? <p className="hint" style={{ marginTop: 8 }}>Tháng đã chốt sổ nên không sửa được. Bấm Mở khóa ở trên nếu cần sửa.</p>
      : <>
        <div className="btns" style={{ marginTop: 10 }}><button className="btn primary" style={{ flex: "none" }} onClick={saveDraft}>Lưu dòng mới</button></div>
        <p className="hint" style={{ marginTop: 8 }}>Gõ khoản mới ở dòng xanh cuối bảng, số tiền gõ được 60k hoặc 60000, nhấn Enter để lưu. Bấm vào ô nội dung hoặc ô tiền để sửa ngay, Enter để lưu, Esc để hủy. Bấm ô Ngày để mở form sửa đầy đủ. Gạch ngang là đã trả.</p>
      </>}
    <Fab />
  </>;
}
