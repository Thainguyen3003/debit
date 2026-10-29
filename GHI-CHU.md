# Sổ Ghi Nợ: ghi chú cho lần làm tiếp

- App đã đăng: https://claude.ai/artifact/QMEA165meubuQqwbnHnjqG
- Code: `index.html` (một file HTML/CSS/JS). Sửa xong thì đăng lại lên đúng URL trên.
- Dữ liệu lưu trong database của artifact (capability `db`), quy tắc truy cập: chỉ chủ sở hữu đọc/ghi.

## Dữ liệu
- `members/{id}`: `{name, hidden, createdAt}`
- `expenses/{id}`: `{date "YYYY-MM-DD", title, payerId ("me" hoặc id thành viên), mode "equal"|"custom", shares {id: số tiền}, total, createdAt}`
- `payments/{id}`: `{memberId, amount, date, note, createdAt}`. amount dương = họ trả mình, âm = mình trả họ
- `settings/main`: `{myName, bankBin, accountNo, accountName}`
- `months/{YYYY-MM}`: `{closed}`. closed = đã chốt sổ: khóa thêm/sửa/xóa khoản chi và trả tiền trong tháng đó

## Các màn hình
Bảng (giống Google Sheet, gõ trực tiếp, tổng kết + chốt sổ theo tháng) · Từng người (lọc theo tháng) · Hóa đơn (theo tháng hoặc từ lần tất toán cuối) · Thành viên + ngân hàng + xuất dữ liệu.
Menu bên trái trên màn hình ≥ 900px, thu gọn được; trên điện thoại ở dưới cùng.

## Cách tính nợ (đã chốt với người dùng)
Số dư mỗi người so với mình: dương = họ nợ mình, âm = mình nợ họ.
Với mỗi khoản chi: số dư[m] += phần của m − (nếu m là người trả thì tổng tiền).
Trả tiền: số dư[m] −= amount. Hóa đơn chỉ liệt kê các khoản sau lần cuối số dư về 0.

## Hướng phát triển đã bàn
- Cách B: chuyển lên hosting (Vercel/Firebase) để có link hóa đơn riêng cho từng người. Dùng nút "Xuất dữ liệu" để chuyển dữ liệu sang.
