import { Fragment, useState } from "react";
import { useApp } from "../store.jsx";
import { TopBar, ConfirmButton, balClass, Empty } from "../components/ui.jsx";
import { fmt, fmtNum, parseMoney, today, dmy, monthLabel } from "../lib/format.js";
import { CLOSED_MSG, timeline, isClosed } from "../lib/ledger.js";

export default function PersonView() {
  const { data, write, toast, go, setP, p } = useApp();
  const mid = p.mid, pm = p.pm || "";
  const m = data.members.find((x) => x.id === mid);
  const { ev, lastZero, balance } = timeline(data, mid);
  const [dir, setDir] = useState(balance < 0 ? "out" : "in");
  const [amt, setAmt] = useState(Math.abs(balance) >= 1 ? fmtNum(Math.abs(balance)) : "");

  if (!m) return <><TopBar title="Không tìm thấy" back={{ view: "home" }} /><Empty title="">Người này không còn trong sổ.</Empty></>;

  const pms = [...new Set(ev.map((x) => x.date.slice(0, 7)))].sort();
  const todayClosed = () => isClosed(data, today().slice(0, 7));

  async function savePay() {
    const v = parseMoney(amt);
    if (!v) return toast("Nhập số tiền");
    if (todayClosed()) return toast(CLOSED_MSG);
    if (await write((db) => db.collection("payments").add({ memberId: mid, amount: dir === "in" ? v : -v, date: today(), note: "", createdAt: Date.now() }), "Đã ghi nhận trả tiền")) setAmt("");
  }
  function settle() {
    if (todayClosed()) return toast(CLOSED_MSG);
    write((db) => db.collection("payments").add({ memberId: mid, amount: Math.round(balance), date: today(), note: "Tất toán", createdAt: Date.now() }), "Đã tất toán");
  }
  function delPay(x) {
    if (isClosed(data, x.date.slice(0, 7))) return toast(CLOSED_MSG);
    write((db) => db.doc("payments/" + x.id).delete(), "Đã xóa");
  }

  let monthSum = null;
  if (pm) {
    const carry = ev.filter((x) => x.date < pm + "-01").reduce((s, x) => s + x.delta, 0);
    const inm = ev.filter((x) => x.date.startsWith(pm)).reduce((s, x) => s + x.delta, 0);
    monthSum = (
      <div className="msum">
        <div><span className="lbl">Nợ cũ đầu tháng</span><b className={"num " + balClass(carry)}>{fmt(Math.abs(carry))}</b></div>
        <div><span className="lbl">Phát sinh trong tháng</span><b className="num">{inm < 0 ? "−" : ""}{fmt(Math.abs(inm))}</b></div>
        <div><span className="lbl">Cuối tháng</span><b className={"num " + balClass(carry + inm)}>{fmt(Math.abs(carry + inm))}</b></div>
      </div>
    );
  }

  const rows = ev.map((x, i) => ({ x, i })).filter(({ x }) => !pm || x.date.startsWith(pm)).reverse();

  return <>
    <TopBar title={m.name} back={{ view: "home" }} />
    <div className="hero-bal">
      <div className="lbl">{Math.abs(balance) < 1 ? "Không còn nợ" : balance > 0 ? "Đang nợ bạn" : "Bạn đang nợ"}</div>
      <div className={"v num " + balClass(balance)}>{fmt(Math.abs(balance))}</div>
    </div>
    <div className="btns" style={{ marginBottom: 12 }}>
      <button className="btn primary" onClick={() => go("invoice", { mid, pm })}>{pm ? "Hóa đơn " + monthLabel(pm).toLowerCase() : "Xem hóa đơn"}</button>
      <ConfirmButton className="btn" label="Tất toán" confirmLabel={"Tất toán " + fmt(Math.abs(balance))} disabled={Math.abs(balance) < 1} onConfirm={settle} />
    </div>
    <div className="card">
      <div className="flabel" style={{ marginBottom: 8 }}>Ghi nhận trả tiền</div>
      <div className="seg" style={{ marginBottom: 10 }}>
        <button className={dir === "in" ? "on" : ""} onClick={() => setDir("in")}>{m.name} trả bạn</button>
        <button className={dir === "out" ? "on" : ""} onClick={() => setDir("out")}>Bạn trả {m.name}</button>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="input num" id="pay-amt" inputMode="decimal" placeholder="Số tiền, ví dụ 200k" value={amt}
          onChange={(e) => setAmt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && savePay()} />
        <button className="btn primary" onClick={savePay}>Lưu</button>
      </div>
      <div className="hint" style={{ marginTop: 6 }}>Gõ được 200k, 1.5tr hoặc 200000.</div>
    </div>

    <div className="months" style={{ marginTop: 16 }}>
      <button className={"chip" + (pm ? "" : " on")} onClick={() => setP({ pm: "" })}>Tất cả</button>
      {pms.map((x) => <button key={x} className={"chip" + (x === pm ? " on" : "")} onClick={() => setP({ pm: x })}>{monthLabel(x)}</button>)}
    </div>
    {monthSum}
    <div className="section-h"><span>Lịch sử với {m.name}{pm ? " · " + monthLabel(pm).toLowerCase() : ""}</span><span>Còn lại</span></div>
    {!rows.length ? <Empty title="">Chưa có khoản nào liên quan đến {m.name}{pm ? " trong tháng này" : ""}.</Empty> : (
      <div className="list">
        {rows.map(({ x, i }) => {
          const openExp = x.kind === "exp" ? () => (isClosed(data, x.date.slice(0, 7)) ? toast(CLOSED_MSG) : go("expense", { id: x.id, from: "person", mid, pm })) : undefined;
          return (
            <Fragment key={x.kind + x.id}>
              {i === lastZero && i < ev.length - 1 && <div className="divider">Đã tất toán đến đây</div>}
              <div className={"ev" + (i <= lastZero ? " settled" : "")} onClick={openExp} style={openExp ? { cursor: "pointer" } : undefined}>
                <span className="d">{dmy(x.date)}</span>
                <span className="t">{x.title}{x.sub && <><br /><span className="hint">{x.sub}</span></>}</span>
                <span className="r num">
                  <span className={x.delta > 0 ? "c-owe" : "c-credit"}>{x.delta > 0 ? "+" + fmt(x.delta) : "−" + fmt(-x.delta)}</span><br />
                  <span className="run">{fmt(x.run)}</span>
                  {x.kind === "pay" && <><br /><ConfirmButton label="Xóa" confirmLabel="Xác nhận xóa" style={{ padding: "2px 8px", fontSize: 12, marginTop: 4 }} onConfirm={() => delPay(x)} /></>}
                </span>
              </div>
            </Fragment>
          );
        })}
      </div>
    )}
  </>;
}
