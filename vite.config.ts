
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";

export default defineConfig({
  plugins: [dyadComponentTagger()],

  tanstackStart: {
    // Mantém o servidor original do projeto
    server: { entry: "server" },
  },
});
