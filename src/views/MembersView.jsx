import { useRef, useState } from "react";
import { useApp, assetUrl } from "../store.jsx";
import { TopBar, ConfirmButton, balClass, Empty } from "../components/ui.jsx";
import { fmt, today, initials, ascii } from "../lib/format.js";
import { balances } from "../lib/ledger.js";
import { BANKS } from "../lib/vietqr.js";

const small = { padding: "6px 10px", fontSize: 13 };

function MemberRow({ m, v, used }) {
  const { write, toast } = useApp();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(m.name);
  async function rename() {
    const n = name.trim();
    if (!n) return toast("Nhập tên");
    if (await write((db) => db.doc("members/" + m.id).update({ name: n }), "Đã đổi tên")) setEditing(false);
  }
  if (editing) return (
    <div className="row"><span className="inline-edit">
      <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && rename()} />
      <button className="btn primary" onClick={rename}>Lưu</button>
      <button className="btn" onClick={() => { setEditing(false); setName(m.name); }}>Hủy</button>
    </span></div>
  );
  return (
    <div className="row">
      <span className="avatar">{initials(m.name)}</span>
      <span className="main"><span className="name">{m.name}</span><br />
        <span className={"sub num " + balClass(v)}>{Math.abs(v) < 1 ? "Không nợ" : (v > 0 ? "Nợ bạn " : "Bạn nợ ") + fmt(Math.abs(v))}</span></span>
      <span className="btns" style={{ flex: "none" }}>
        <button className="btn" style={small} onClick={() => setEditing(true)}>Sửa</button>
        <button className="btn" style={small} onClick={() => write((db) => db.doc("members/" + m.id).update({ hidden: !m.hidden }), m.hidden ? "Đã hiện lại" : "Đã ẩn")}>{m.hidden ? "Hiện" : "Ẩn"}</button>
        {!used && <ConfirmButton label="Xóa" confirmLabel="Xác nhận xóa" style={small} onConfirm={() => write((db) => db.doc("members/" + m.id).delete(), "Đã xóa")} />}
      </span>
    </div>
  );
}

// Ảnh mã QR tự tải lên (từ app ngân hàng, MoMo, ZaloPay…), hiện trên hóa đơn. Lưu ảnh vào kho của artifact, id ảnh lưu trong settings/main
function QrUpload() {
  const { data, write, toast, assets } = useApp();
  const id = data.settings.qrAssetId;
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return toast("Chọn ảnh PNG, JPG hoặc WebP");
    if (file.size > 5 * 1024 * 1024) return toast("Ảnh quá lớn, chọn ảnh dưới 5 MB");
    setBusy(true);
    try {
      const up = await assets.upload(file);
      const ok = await write((db) => db.doc("settings/main").set({ ...data.settings, qrAssetId: up.id }), "Đã lưu ảnh QR");
      // Xóa ảnh không còn dòng nào trỏ tới: ảnh cũ khi đổi thành công, hoặc ảnh vừa tải nếu chưa lưu được
      const orphan = ok ? id : up.id;
      if (orphan) assets.delete(orphan).catch(() => {});
    } catch (err) {
      toast(err?.code === "too_large" ? "Ảnh quá lớn" : err?.code === "quota_or_state" ? "Hết chỗ lưu ảnh" : "Chưa tải được ảnh, thử lại sau");
    } finally { setBusy(false); }
  }
  async function remove() {
    const { qrAssetId, ...rest } = data.settings;
    if (await write((db) => db.doc("settings/main").set(rest), "Đã xóa ảnh QR")) assets?.delete(qrAssetId).catch(() => {});
  }

  return <div className="card">
    {id && <div className="qrprev"><img src={assetUrl(id)} alt="Ảnh mã QR đã tải lên" /></div>}
    {assets ? <div className="btns">
      <button className="btn" disabled={busy} onClick={() => fileRef.current.click()}>{busy ? "Đang tải…" : id ? "Đổi ảnh" : "Tải ảnh QR lên"}</button>
      {id && <ConfirmButton label="Xóa ảnh" confirmLabel="Xác nhận xóa" onConfirm={remove} />}
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pick} />
    </div> : <p className="hint">Chỉ chủ sổ mới tải được ảnh QR.</p>}
    <p className="hint" style={{ marginTop: 8 }}>Lưu ảnh mã QR từ app ngân hàng hoặc ví rồi tải lên đây. Hóa đơn sẽ kèm ảnh này để mọi người quét và chuyển tiền.</p>
  </div>;
}

export default function MembersView() {
  const { data, write, toast } = useApp();
  const b = balances(data);
  const st = data.settings;
  const [newName, setNewName] = useState("");
  const [form, setForm] = useState({ myName: st.myName || "", bankBin: st.bankBin || "", accountNo: st.accountNo || "", accountName: st.accountName || "" });
  const setF = (patch) => setForm((x) => ({ ...x, ...patch }));

  const used = (id) => data.expenses.some((e) => (e.shares && id in e.shares) || e.payerId === id) || data.payments.some((p) => p.memberId === id);
  const vis = data.members.filter((m) => !m.hidden), hid = data.members.filter((m) => m.hidden);

  async function add() {
    const name = newName.trim();
    if (!name) return toast("Nhập tên");
    if (data.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) return toast("Tên này đã có");
    if (await write((db) => db.collection("members").add({ name, hidden: false, createdAt: Date.now() }), "Đã thêm " + name)) setNewName("");
  }
  function saveSettings() {
    const body = { myName: form.myName.trim(), bankBin: form.bankBin, accountNo: form.accountNo.replace(/\s/g, ""), accountName: ascii(form.accountName).toUpperCase() };
    if (body.accountNo && !/^\d{4,20}$/.test(body.accountNo)) return toast("Số tài khoản chỉ gồm chữ số");
    write((db) => db.doc("settings/main").set({ ...st, ...body }), "Đã lưu thông tin");
  }
  async function exportData() {
    const json = JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2);
    const dl = await window.claude?.use?.("downloads");
    if (dl) {
      try { await dl.save({ filename: "so-ghi-no-" + today() + ".json", data: json }); toast("Đã xuất dữ liệu"); }
      catch (e) { if (e?.code !== "declined") toast("Chưa xuất được file"); }
    } else {
      try { await navigator.clipboard.writeText(json); toast("Đã sao chép dữ liệu vào bộ nhớ tạm"); }
      catch { toast("Chưa xuất được dữ liệu ở đây"); }
    }
  }

  return <>
    <TopBar title="Thành viên" />
    <div className="card"><div style={{ display: "flex", gap: 8 }}>
      <input className="input" id="new-member" placeholder="Tên người mới" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
      <button className="btn primary" onClick={add}>Thêm</button>
    </div></div>

    <div className="section-h"><span>Đang dùng ({vis.length})</span></div>
    {vis.length ? <div className="list">{vis.map((m) => <MemberRow key={m.id} m={m} v={b[m.id] || 0} used={used(m.id)} />)}</div>
      : <Empty title="">Chưa có ai. Gõ tên ở trên rồi bấm Thêm.</Empty>}
    {hid.length > 0 && <>
      <div className="section-h"><span>Đã ẩn ({hid.length})</span></div>
      <div className="list">{hid.map((m) => <MemberRow key={m.id} m={m} v={b[m.id] || 0} used={used(m.id)} />)}</div>
      <p className="hint">Người đã ẩn không hiện khi chọn người tham gia, nhưng vẫn giữ lịch sử.</p>
    </>}

    <div className="section-h"><span>Ngân hàng của bạn (cho mã QR)</span></div>
    <div className="card">
      <div className="field"><label htmlFor="s-name">Tên của bạn trên hóa đơn</label>
        <input className="input" id="s-name" placeholder="Tôi" value={form.myName} onChange={(e) => setF({ myName: e.target.value })} /></div>
      <div className="field"><label htmlFor="s-bank">Ngân hàng</label>
        <select className="input" id="s-bank" value={form.bankBin} onChange={(e) => setF({ bankBin: e.target.value })}>
          <option value="">Chọn ngân hàng</option>
          {BANKS.map(([bin, n]) => <option key={bin} value={bin}>{n}</option>)}
        </select></div>
      <div className="field"><label htmlFor="s-acc">Số tài khoản</label>
        <input className="input num" id="s-acc" inputMode="numeric" value={form.accountNo} onChange={(e) => setF({ accountNo: e.target.value })} /></div>
      <div className="field"><label htmlFor="s-holder">Tên chủ tài khoản</label>
        <input className="input" id="s-holder" placeholder="NGUYEN VAN A" value={form.accountName} onChange={(e) => setF({ accountName: e.target.value })} /></div>
      <button className="btn primary block" onClick={saveSettings}>Lưu thông tin</button>
      <p className="hint" style={{ marginTop: 8 }}>Chỉ cần số tài khoản để tạo mã QR. Không bao giờ nhập mật khẩu hay mã OTP vào đây.</p>
    </div>

    <div className="section-h"><span>Ảnh mã QR (kèm trên hóa đơn)</span></div>
    <QrUpload />

    <div className="section-h"><span>Sao lưu</span></div>
    <div className="card">
      <button className="btn block" onClick={exportData}>Xuất dữ liệu (.json)</button>
      <p className="hint" style={{ marginTop: 8 }}>Lưu một bản sao toàn bộ sổ nợ ra file, dùng để sao lưu hoặc chuyển sang nơi khác sau này.</p>
    </div>
  </>;
}
