// Builds a link that respects the deploy base path (e.g. "/portfolio-site" on GitHub Pages).
export function url(path = ""): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return base + "/" + path.replace(/^\//, "");
}
