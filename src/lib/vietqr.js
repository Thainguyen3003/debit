// Mã QR chuyển khoản theo chuẩn VietQR (NAPAS / EMVCo)
// Mã BIN của các ngân hàng
export const BANKS = [["970436","Vietcombank"],["970415","VietinBank"],["970418","BIDV"],["970405","Agribank"],["970407","Techcombank"],
["970422","MB Bank"],["970416","ACB"],["970432","VPBank"],["970423","TPBank"],["970403","Sacombank"],["970441","VIB"],
["970437","HDBank"],["970443","SHB"],["970426","MSB"],["970448","OCB"],["970440","SeABank"],["970431","Eximbank"],
["970449","LPBank"],["970428","Nam A Bank"],["970409","Bac A Bank"],["970454","BVBank (Timo)"],["546034","CAKE by VPBank"],
["546035","Ubank by VPBank"],["970425","ABBANK"],["970452","KienlongBank"],["970412","PVcomBank"],["970427","VietABank"],
["970419","NCB"],["970400","Saigonbank"],["970438","BaoViet Bank"],["970429","SCB"],["970433","VietBank"],["970406","DongA Bank"],
["970408","GPBank"],["970430","PGBank"],["970424","Shinhan Bank"],["970457","Woori Bank"],["970458","UOB"],["458761","HSBC"]];
export const bankName = (bin) => BANKS.find((b) => b[0] === bin)?.[1] || "";

const tlv = (id, v) => id + String(v.length).padStart(2, "0") + v;

export function crc16(s) {
  let c = 0xffff;
  for (let i = 0; i < s.length; i++) {
    c ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
  }
  return c.toString(16).toUpperCase().padStart(4, "0");
}

export function vietqr(bin, acc, amount, memo) {
  let p = tlv("00", "01") + tlv("01", amount ? "12" : "11")
    + tlv("38", tlv("00", "A000000727") + tlv("01", tlv("00", bin) + tlv("01", acc)) + tlv("02", "QRIBFTTA"))
    + tlv("53", "704");
  if (amount) p += tlv("54", String(Math.round(amount)));
  p += tlv("58", "VN");
  if (memo) p += tlv("62", tlv("08", memo.slice(0, 25)));
  p += "6304";
  return p + crc16(p);
}
