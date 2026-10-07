import { defineConfig } from "astro/config";

// GitHub Pages: set SITE_URL and BASE_PATH in the deploy workflow.
// For a repo named <username>.github.io keep BASE_PATH as "/".
// For any other repo name use "/<repo-name>".
export default defineConfig({
  site: process.env.SITE_URL ?? "https://username.github.io",
  base: process.env.BASE_PATH ?? "/",
  trailingSlash: "ignore",
  // keep whitespace: the hero terminal relies on white-space: pre
  compressHTML: false,
});
