import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

<<<<<<< HEAD
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
=======
export default defineConfig({
  plugins: [react()],
>>>>>>> 620cdbb100bc3a54420d680ba278e3b8cad06da8
});
