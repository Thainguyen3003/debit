import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const EMPTY = { members: [], expenses: [], payments: [], months: [], settings: {} };
const COLLECTIONS = ["members", "expenses", "payments", "months"];

// Kết nối dữ liệu: trên claude.ai dùng capability `db`; khi chạy thử trên máy dùng database giả
async function connectDb() {
  if (window.claude?.use) return window.claude.use("db").catch(() => null);
  if (import.meta.env.DEV) return (await import("./lib/mockDb.js")).createMockDb();
  return null;
}

// Kho ảnh (capability `assets`): chỉ người sửa được artifact mới có. Chạy thử trên máy thì giữ ảnh trong bộ nhớ trình duyệt
const devBlobs = new Map();
async function connectAssets() {
  if (window.claude?.use) return window.claude.use("assets").catch(() => null);
  if (import.meta.env.DEV) return {
    upload: async (blob) => { const id = "dev" + Date.now(), url = URL.createObjectURL(blob); devBlobs.set(id, url); return { id, url }; },
    delete: async (id) => ({ deleted: devBlobs.delete(id) }),
  };
  return null;
}
// Đường dẫn hiển thị ảnh từ id đã lưu trong db
export const assetUrl = (id) => devBlobs.get(id) || "/_blob/" + id;

export function AppProvider({ children }) {
  const [data, setData] = useState(EMPTY);
  const [status, setStatus] = useState("loading");
  const [nav, setNav] = useState({ view: "sheet", p: {} });
  const [toastMsg, setToastMsg] = useState(null);
  const [assets, setAssets] = useState(null);
  const db = useRef(null);
  const toastTimer = useRef();

  useEffect(() => {
    let alive = true;
    const unsubs = [];
    connectDb().then((d) => {
      if (!alive) return;
      if (!d) return setStatus("nodb");
      db.current = d;
      let pending = COLLECTIONS.length + 1;
      const first = () => { if (--pending === 0) setStatus("ready"); };
      for (const name of COLLECTIONS) {
        let got = false;
        unsubs.push(d.collection(name).onSnapshot((s) => {
          setData((prev) => ({ ...prev, [name]: s.docs.map((x) => ({ id: x.id, ...x.data() })) }));
          if (!got) { got = true; first(); }
        }, () => {}));
      }
      let gotS = false;
      unsubs.push(d.doc("settings/main").onSnapshot((s) => {
        setData((prev) => ({ ...prev, settings: s.exists ? { ...s.data() } : {} }));
        if (!gotS) { gotS = true; first(); }
      }, () => {}));
    });
    return () => { alive = false; unsubs.forEach((u) => u()); };
  }, []);
  useEffect(() => { connectAssets().then(setAssets); }, []);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2600);
  }, []);

  // Ghi dữ liệu, báo lỗi dễ hiểu nếu không lưu được. Trả về true khi thành công.
  const write = useCallback(async (fn, okMsg) => {
    if (!db.current) { toast("Chưa kết nối được nơi lưu dữ liệu"); return false; }
    try { await fn(db.current); if (okMsg) toast(okMsg); return true; }
    catch (e) { toast(e?.code === "quota_exceeded" ? "Sổ đã đầy, hãy xóa bớt dữ liệu cũ" : "Chưa lưu được, thử lại sau ít giây"); return false; }
  }, [toast]);

  const go = useCallback((view, p = {}) => { setNav({ view, p }); window.scrollTo(0, 0); }, []);
  const setP = useCallback((patch) => setNav((n) => ({ ...n, p: { ...n.p, ...patch } })), []);

  return (
    <Ctx.Provider value={{ data, status, write, toast, go, setP, assets, view: nav.view, p: nav.p }}>
      {children}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </Ctx.Provider>
  );
}
