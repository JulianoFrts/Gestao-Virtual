import { defineConfig } from "orval";

export default defineConfig({
  orion: {
    output: {
      mode: "tags-split",
      target: "src/integrations/orion/generated/orion.ts",
      schemas: "src/integrations/orion/generated/model",
      client: "react-query",
      mock: false,
      httpClient: "axios",
      override: {
        mutator: {
          path: "./src/integrations/orion/orion-client.ts",
          name: "orionClient",
        },
      },
    },
    input: {
      target: "../backend/openapi.json",
    },
  },
});
