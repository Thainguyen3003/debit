# Sổ Ghi Nợ: ghi chú cho lần làm tiếp

- App đã đăng: https://claude.ai/artifact/QMEA165meubuQqwbnHnjqG
- Code: React + Vite trong `src/`. Bản thuần HTML cũ nằm trong lịch sử Git (commit đầu tiên).
- Dữ liệu lưu trong database của artifact (capability `db`), quy tắc truy cập: chỉ chủ sở hữu đọc/ghi.

## Lệnh
- `npm install`: cài thư viện (lần đầu trên máy mới)
- `npm run dev`: chạy thử ở http://localhost:5180 với **dữ liệu giả** (`src/lib/mockDb.js`), không đụng dữ liệu thật
- `npm run build`: tạo `dist/artifact.html`. Đăng file này lên đúng URL app ở trên (Artifact tool, truyền `url`)

## Cấu trúc
- `src/lib/ledger.js`: cách tính nợ, timeline, hóa đơn, tháng (logic thuần, không có giao diện)
- `src/lib/format.js`: định dạng tiền, ngày, đọc số tiền gõ vào ("60k", "1.5tr")
- `src/lib/vietqr.js`: mã QR VietQR + danh sách mã BIN ngân hàng
- `src/store.jsx`: kết nối dữ liệu, `write()`, `toast()`, điều hướng `go(view, p)`
- `src/views/`: Bảng, Từng người, Chi tiết người, Hóa đơn, Thêm/sửa khoản chi, Thành viên
- `src/components/`: Nav (menu trái/thu gọn), nút xác nhận có Hủy, TopBar…
- `scripts/to-artifact.mjs`: bỏ phần `<html><head><body>` để Claude tự bọc trang

## Dữ liệu
- `members/{id}`: `{name, hidden, createdAt}`
- `expenses/{id}`: `{date "YYYY-MM-DD", title, payerId ("me" hoặc id thành viên), mode "equal"|"custom", shares {id: số tiền}, total, createdAt}`
- `payments/{id}`: `{memberId, amount, date, note, createdAt}`. amount dương = họ trả mình, âm = mình trả họ
- `settings/main`: `{myName, bankBin, accountNo, accountName}`
- `months/{YYYY-MM}`: `{closed}`. closed = đã chốt sổ: khóa thêm/sửa/xóa khoản chi và trả tiền trong tháng đó

## Cách tính nợ (đã chốt với người dùng)
Số dư mỗi người so với mình: dương = họ nợ mình, âm = mình nợ họ.
Với mỗi khoản chi: số dư[m] += phần của m − (nếu m là người trả thì tổng tiền).
Trả tiền: số dư[m] −= amount. Gạch ngang "đã trả": tiền trả được trừ dần vào các khoản cũ nhất trước.
Hóa đơn: theo tháng (có dòng Nợ cũ) hoặc mọi khoản sau lần cuối số dư về 0.

## Hướng phát triển đã bàn
- Cách B: chuyển lên hosting (Vercel/Firebase) để có link hóa đơn riêng cho từng người. Chỉ cần thay `connectDb()` trong `src/store.jsx`; dùng nút "Xuất dữ liệu" để chuyển dữ liệu sang.
