// Chuyển dist/index.html (tài liệu HTML đầy đủ) thành dist/artifact.html để đăng lên Claude.
// Claude tự bọc trang bằng <!doctype><html><head><body>, nên chỉ giữ phần nội dung bên trong.
import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync("dist/index.html", "utf8");
const head = html.match(/<head>([\s\S]*)<\/head>/)[1]
  .replace(/<meta charset[^>]*>/i, "")
  .replace(/<meta name="viewport"[^>]*>/i, "");
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
writeFileSync("dist/artifact.html", head.trim() + "\n" + body.trim() + "\n");
console.log("dist/artifact.html", Math.round((head.length + body.length) / 1024) + " KB");
