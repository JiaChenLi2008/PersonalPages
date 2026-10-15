import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Relative base keeps asset URLs valid on GitHub Pages project subpaths
// (/<repo>/) and on Cloudflare Pages root deployments alike.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
