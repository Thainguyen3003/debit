import { useState } from "react";
import { useApp } from "../store.jsx";

export function TopBar({ title, back }) {
  const { go } = useApp();
  return (
    <header className="top">
      {back && <button className="back" onClick={() => go(back.view, back.p)} aria-label="Quay lại">←</button>}
      <h1>{title}</h1>
    </header>
  );
}

// Nút cần xác nhận: bấm lần đầu hiện "Xác nhận" và "Hủy"
export function ConfirmButton({ label, confirmLabel, onConfirm, className = "btn danger", style, disabled }) {
  const [armed, setArmed] = useState(false);
  if (!armed) return <button className={className} style={style} disabled={disabled} onClick={(e) => { e.stopPropagation(); setArmed(true); }}>{label}</button>;
  return (
    <span className="confirm" onClick={(e) => e.stopPropagation()}>
      <button className="btn danger armed" style={style} onClick={() => { setArmed(false); onConfirm(); }}>{confirmLabel}</button>
      <button className="btn" style={style} autoFocus onClick={() => setArmed(false)}>Hủy</button>
    </span>
  );
}

export const balClass = (v) => (Math.abs(v) < 1 ? "c-muted" : v > 0 ? "c-owe" : "c-credit");

export function BalPill({ v }) {
  if (Math.abs(v) < 1) return <span className="pill zero">Đã tất toán</span>;
  return v > 0 ? <span className="pill owe">Nợ bạn</span> : <span className="pill credit">Bạn nợ</span>;
}

export function Fab() {
  const { go, view, p } = useApp();
  return <button className="fab" onClick={() => go("expense", { from: view, mid: p.mid, pm: p.pm })}>+ Thêm khoản chi</button>;
}

export const Empty = ({ title, children }) => (
  <div className="card empty"><b>{title}</b>{children}</div>
);
