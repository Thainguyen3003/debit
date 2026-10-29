import { useEffect, useState } from "react";
import { useApp } from "../store.jsx";

const Ico = ({ d }) => <svg className="ico" viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />;
const TABS = [
  { view: "sheet", label: "Bảng", icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>' },
  { view: "home", label: "Từng người", icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>', also: ["person", "invoice"] },
  { view: "members", label: "Thành viên", icon: '<circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5M15 14.8c2.6-.3 5 1.3 6 4.2"/>' },
];

const readMin = () => { try { return !!localStorage.getItem("navMin"); } catch { return false; } };

// Trên màn hình rộng là cột bên trái (thu gọn được), trên điện thoại là thanh dưới cùng
export default function Nav() {
  const { view, go } = useApp();
  const [min, setMin] = useState(readMin);
  useEffect(() => {
    document.body.classList.toggle("nav-min", min);
    try { localStorage.setItem("navMin", min ? "1" : ""); } catch {}
  }, [min]);
  const toggleLabel = min ? "Mở rộng menu" : "Thu gọn menu";

  return (
    <nav className="tabs" hidden={view === "expense"}>
      <div className="in">
        <div className="brand">
          <span className="brand-name">Sổ Ghi Nợ</span>
          <button className="collapse" aria-label={toggleLabel} title={toggleLabel} onClick={() => setMin(!min)}>
            <Ico d='<path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/>' />
          </button>
        </div>
        {TABS.map((t) => (
          <button key={t.view} title={t.label} className={"tab" + (view === t.view || t.also?.includes(view) ? " on" : "")} onClick={() => go(t.view)}>
            <Ico d={t.icon} /><span className="lbl">{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
