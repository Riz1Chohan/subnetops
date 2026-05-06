import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command, mode }) => {
  const loadedEnv = loadEnv(mode, process.cwd(), "");
  const configuredApiBaseUrl = loadedEnv.VITE_API_BASE_URL?.trim();

  if (command === "build" && mode === "production" && !configuredApiBaseUrl) {
    throw new Error(
      "VITE_API_BASE_URL is required for production builds. Set it to the backend API base URL such as https://subnetops-backend.onrender.com/api.",
    );
  }

  return {
    plugins: [react()],
  };
});
