import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useApp, assetUrl } from "../store.jsx";
import { TopBar } from "../components/ui.jsx";
import { fmt, dmy, today, ascii } from "../lib/format.js";
import { ME, nameOf, invoiceData } from "../lib/ledger.js";
import { vietqr, bankName } from "../lib/vietqr.js";

export default function InvoiceView() {
  const { data, toast, go, p, readOnly } = useApp();
  const m = data.members.find((x) => x.id === p.mid);
  const { items, balance, label } = invoiceData(data, p.mid, p.pm);
  const st = data.settings;
  const hasBank = !!(st.bankBin && st.accountNo);
  const qrText = m && balance >= 1 && hasBank ? vietqr(st.bankBin, String(st.accountNo).replace(/\s/g, ""), balance, ascii("Tra no " + m.name)) : "";
  const [qr, setQr] = useState("");
  // Ảnh QR tự tải lên được ưu tiên hơn mã VietQR tự tạo
  const qrImg = m && balance >= 1 && st.qrAssetId ? assetUrl(st.qrAssetId) : "";
  const [imgBroken, setImgBroken] = useState(false);

  useEffect(() => {
    if (!qrText) return setQr("");
    // Luôn đen trên trắng để app ngân hàng quét được
    QRCode.toDataURL(qrText, { width: 400, margin: 1, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } })
      .then(setQr).catch(() => setQr(""));
  }, [qrText]);

  if (!m) return <TopBar title="Hóa đơn" back={{ view: "home" }} />;

  // Khoản do người thứ ba trả trước vẫn trả lại cho bạn (mọi khoản đều tính qua bạn), ghi rõ để người nhận không trả nhầm hai lần
  const via = (x) => (x.payerId && x.payerId !== ME && x.payerId !== p.mid
    ? nameOf(data, x.payerId) + " trả trước, bạn trả lại cho " + nameOf(data, ME) : "");

  async function copy() {
    const txt = ["Hóa đơn gửi " + m.name + (label ? " (" + label + ")" : ""),
      ...items.map((x) => (x.date ? dmy(x.date) + " " : "") + x.title + (via(x) ? " (" + via(x) + ")" : "") + ": " + (x.delta < 0 ? "-" : "") + fmt(Math.abs(x.delta))),
      (balance >= 0 ? "Cần trả: " : "Mình trả lại: ") + fmt(Math.abs(balance)),
      st.accountNo ? "STK: " + st.accountNo + " " + bankName(st.bankBin) + " - " + (st.accountName || "") : ""].filter(Boolean).join("\n");
    try { await navigator.clipboard.writeText(txt); toast("Đã sao chép"); }
    catch { toast("Máy không cho sao chép, hãy chụp màn hình"); }
  }

  return <>
    <TopBar title="Hóa đơn" back={{ view: "person", p: { mid: p.mid, pm: p.pm } }} />
    <div className="invoice">
      <div className="ih"><b>Hóa đơn</b><span>{nameOf(data, ME)}<br />{dmy(today())}</span></div>
      <div className="to">{label ? label + " · " : ""}Gửi<strong>{m.name}</strong></div>
      {!items.length ? <p style={{ color: "#66706A" }}>Không có khoản nào chưa thanh toán.</p> : (
        <table><tbody>
          {items.map((x, i) => (
            <tr key={i}><td className="d">{dmy(x.date)}</td><td>{x.title}{via(x) && <span className="via">{via(x)}</span>}</td><td className="a">{x.delta < 0 ? "−" : ""}{fmt(Math.abs(x.delta))}</td></tr>
          ))}
        </tbody></table>
      )}
      <div className="tot"><span>{balance >= 0 ? "Cần trả" : "Mình trả lại bạn"}</span><b className="num">{fmt(Math.abs(balance))}</b></div>
      {qrImg && (
        <div className="qrbox">
          <div className="qr">{imgBroken ? "Không tải được ảnh QR" : <img className="up" src={qrImg} alt="Mã QR chuyển khoản" onError={() => setImgBroken(true)} />}</div>
          <div className="bank">Quét mã để chuyển <b>{fmt(balance)}</b></div>
          {st.accountNo && <div className="bank"><b>{st.accountName}</b><br />{bankName(st.bankBin)} · {st.accountNo}</div>}
        </div>
      )}
      {!qrImg && qrText && (
        <div className="qrbox">
          <div className="qr">{qr ? <img src={qr} alt="Mã QR chuyển khoản" /> : "Đang tạo mã QR…"}</div>
          <div className="bank"><b>{st.accountName}</b><br />{bankName(st.bankBin)} · {st.accountNo}</div>
          <div className="bank">Quét bằng app ngân hàng, số tiền đã điền sẵn</div>
        </div>
      )}
    </div>
    <div className="btns" style={{ marginTop: 12 }}><button className="btn" onClick={copy}>Sao chép nội dung</button></div>
    {balance >= 1 && !hasBank && !st.qrAssetId && !readOnly
      ? <p className="hint" style={{ marginTop: 10 }}>Muốn có mã QR chuyển khoản? Tải ảnh QR hoặc nhập tài khoản ngân hàng ở{" "}
          <button className="btn" style={{ padding: "2px 8px", fontSize: 12 }} onClick={() => go("members")}>Thành viên → Ngân hàng</button></p>
      : <p className="hint" style={{ marginTop: 10 }}>Chụp màn hình phần hóa đơn để gửi cho {m.name}.</p>}
  </>;
}
