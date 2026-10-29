import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Gộp toàn bộ JS + CSS vào một file HTML duy nhất để đăng lên Claude (Artifact)
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  server: { port: 5180 },
});
