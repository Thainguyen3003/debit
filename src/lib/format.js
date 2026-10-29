export const fmtNum = (n) => (n ? Math.round(n).toLocaleString("vi-VN") : "");
export const fmt = (n) => Math.round(n).toLocaleString("vi-VN") + " đ";
// Có dấu trừ cho số âm, dùng trong Bảng
export const money = (v) => (v < 0 ? "−" : "") + fmtNum(Math.abs(v)) + " đ";

// Đọc số tiền người dùng gõ: "365k", "1.5tr", "60.833", "60833"
export function parseMoney(s) {
  s = String(s || "").trim().toLowerCase().replace(/\s/g, "");
  let mult = 1;
  if (/k$/.test(s)) { mult = 1000; s = s.slice(0, -1); }
  else if (/(tr|m)$/.test(s)) { mult = 1e6; s = s.replace(/(tr|m)$/, ""); }
  if (mult > 1) {
    const v = parseFloat(s.replace(",", ".").replace(/[^\d.]/g, ""));
    return isNaN(v) ? 0 : Math.round(v * mult);
  }
  const d = s.replace(/[^\d]/g, "");
  return d ? parseInt(d, 10) : 0;
}

export function today() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
export const dmy = (d) => (d ? d.slice(8, 10) + "/" + d.slice(5, 7) + "/" + d.slice(0, 4) : "");
export const monthLabel = (ym) => "Tháng " + parseInt(ym.slice(5, 7), 10) + "/" + ym.slice(0, 4);
export const wd = (d) => { const n = new Date(d + "T00:00:00").getDay(); return n === 0 ? "Chủ nhật" : "Thứ " + (n + 1); };
export const isWeekend = (d) => /Thứ 7|Chủ/.test(wd(d));
export const nextYm = (ym) => {
  let y = +ym.slice(0, 4), m = +ym.slice(5, 7) + 1;
  if (m > 12) { m = 1; y++; }
  return y + "-" + String(m).padStart(2, "0");
};
export const initials = (n) => (n || "?").trim().split(/\s+/).slice(-1)[0].slice(0, 2).toUpperCase();
// Bỏ dấu tiếng Việt (cho nội dung chuyển khoản và tên chủ tài khoản)
export const ascii = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^A-Za-z0-9 ]/g, "").trim();
