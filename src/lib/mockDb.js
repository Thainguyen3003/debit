// Database giả, CHỈ dùng khi chạy thử trên máy (npm run dev).
// Bắt chước đúng các hàm của capability `db` mà app dùng, kèm sẵn vài dòng dữ liệu mẫu.
export function createMockDb() {
  const docs = new Map(); // "collection/id" -> data
  const listeners = new Set();
  const emit = () => queueMicrotask(() => listeners.forEach((l) => l()));
  const seed = (col, id, data) => docs.set(col + "/" + id, data);

  [["m1", "c Thảo"], ["m2", "Dung"], ["m3", "An Trần"], ["m4", "Đại"]].forEach(([id, name], i) =>
    seed("members", id, { name, hidden: false, createdAt: i }));
  seed("settings", "main", { myName: "Thái" });
  const ym = new Date().toISOString().slice(0, 7);
  seed("expenses", "e1", { date: ym + "-01", title: "Bún đậu (mẫu)", payerId: "me", mode: "equal", createdAt: 1,
    shares: { me: 60833, m1: 60833, m2: 60833, m3: 60833, m4: 60833 } });
  seed("expenses", "e2", { date: ym + "-02", title: "Phê La (mẫu)", payerId: "m4", mode: "custom", createdAt: 2,
    shares: { me: 45000, m3: 45000, m4: 45000 } });
  seed("payments", "p1", { memberId: "m1", amount: 60833, date: ym + "-03", note: "", createdAt: 3 });

  const snapDoc = (id, data) => ({ id, exists: data !== undefined, data: () => data && { ...data } });
  let n = 0;
  const docRef = (path) => ({
    get: async () => snapDoc(path.split("/").pop(), docs.get(path)),
    set: async (d) => { docs.set(path, { ...d }); emit(); },
    update: async (d) => { if (!docs.has(path)) throw { code: "invalid_argument" }; docs.set(path, { ...docs.get(path), ...d }); emit(); },
    delete: async () => { docs.delete(path); emit(); },
    onSnapshot(next) {
      const l = () => next(snapDoc(path.split("/").pop(), docs.get(path)));
      listeners.add(l); queueMicrotask(l);
      return () => listeners.delete(l);
    },
  });
  return {
    doc: docRef,
    collection: (col) => ({
      doc: (id) => docRef(col + "/" + (id || "x" + Date.now() + n++)),
      add: async (d) => { const ref = docRef(col + "/x" + Date.now() + n++); await ref.set(d); return ref; },
      onSnapshot(next) {
        const l = () => {
          const list = [...docs].filter(([k]) => k.startsWith(col + "/")).map(([k, v]) => snapDoc(k.slice(col.length + 1), v));
          next({ docs: list, size: list.length, empty: !list.length });
        };
        listeners.add(l); queueMicrotask(l);
        return () => listeners.delete(l);
      },
    }),
  };
}
