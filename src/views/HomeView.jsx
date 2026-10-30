import { useApp } from "../store.jsx";
import { TopBar, BalPill, balClass, Fab, Empty } from "../components/ui.jsx";
import { fmt, initials } from "../lib/format.js";
import { balances } from "../lib/ledger.js";

export default function HomeView() {
  const { data, go } = useApp();
  const b = balances(data);
  const owe = Object.values(b).filter((v) => v > 0).reduce((a, v) => a + v, 0);
  const cred = Object.values(b).filter((v) => v < 0).reduce((a, v) => a - v, 0);
  const ms = data.members.filter((m) => !m.hidden || Math.abs(b[m.id] || 0) >= 1)
    .sort((x, y) => (b[y.id] || 0) - (b[x.id] || 0) || x.name.localeCompare(y.name, "vi"));

  return <>
    <TopBar title="Từng người" />
    <div className="summary">
      <div className="sum owe"><div className="lbl">Người khác nợ bạn</div><div className="val num">{fmt(owe)}</div></div>
      <div className="sum credit"><div className="lbl">Bạn nợ người khác</div><div className="val num">{fmt(cred)}</div></div>
    </div>
    {!data.members.length ? (
      <Empty title="Chưa có ai trong sổ">Thêm những người hay ăn uống chung, rồi bắt đầu ghi khoản chi đầu tiên.
        <div style={{ marginTop: 14 }}><button className="btn primary" onClick={() => go("members")}>Thêm thành viên</button></div></Empty>
    ) : <>
      <div className="section-h"><span>Từng người</span><span>Số dư</span></div>
      <div className="list">
        {ms.map((m) => {
          const v = b[m.id] || 0;
          return (
            <button key={m.id} className="row" onClick={() => go("person", { mid: m.id })}>
              <span className="avatar">{initials(m.name)}</span>
              <span className="main"><span className="name">{m.name}</span><br /><BalPill v={v} /></span>
              <span className={"amt num " + balClass(v)}>{Math.abs(v) < 1 ? "0 đ" : fmt(Math.abs(v))}</span>
            </button>
          );
        })}
      </div>
      {!data.expenses.length && <p className="hint" style={{ textAlign: "center", marginTop: 14 }}>Chưa có khoản chi nào. Bấm “Thêm khoản chi” để ghi khoản đầu tiên.</p>}
    </>}
    <Fab />
  </>;
}
