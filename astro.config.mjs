import { defineConfig } from "astro/config";

const basePath = process.env.BASE_PATH ?? "/";
const normalizedBasePath =
  basePath === "/" ? "/" : `/${basePath.replace(/^\/+|\/+$/g, "")}/`;

export default defineConfig({
  site: "https://example.github.io/yellow-avatar-quotations",
  base: normalizedBasePath,
});
