import { defineConfig as defineViteConfig } from "vite";
import { defineConfig as definePreviewConfig } from "@lovable.dev/vite-tanstack-config";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

const previewConfig = definePreviewConfig({
  plugins: [dyadComponentTagger()],
  tanstackStart: { server: { entry: "server" } },
});

export default defineViteConfig(async (env) => {
  if (env.command === "serve") return previewConfig(env);

  // The preview wrapper pins Cloudflare in sandboxes; production uses Nitro directly.
  return {
    plugins: [
      tailwindcss(),
      tsconfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        server: { entry: "server" },
        importProtection: {
          behavior: "error",
          client: { files: ["**/server/**"], specifiers: ["server-only"] },
        },
      }),
      nitro({
        preset: "vercel",
        vercel: {
          entryFormat: "web",
          functions: { runtime: "nodejs22.x" },
        },
      }),
      react(),
    ],
    resolve: {
      dedupe: ["react", "react-dom", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});
