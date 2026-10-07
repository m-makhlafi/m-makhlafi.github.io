// Filters server-rendered lab cards by category and search text.
document.querySelectorAll("[data-catalog]").forEach((wrap) => {
  const cards = wrap.querySelectorAll("[data-cat]");
  const chips = wrap.querySelectorAll("[data-filter]");
  const search = wrap.querySelector("input[type=search]");
  const empty = wrap.querySelector("[data-empty]");
  let cur = "all";
  function apply() {
    const q = (search.value || "").trim().toLowerCase();
    let shown = 0;
    cards.forEach((c) => {
      const ok = (cur === "all" || c.getAttribute("data-cat") === cur) &&
        (!q || c.getAttribute("data-k").toLowerCase().includes(q));
      c.hidden = !ok;
      if (ok) shown++;
    });
    empty.hidden = shown > 0;
  }
  chips.forEach((b) => {
    b.addEventListener("click", () => {
      cur = b.getAttribute("data-filter");
      chips.forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
      apply();
    });
  });
  search.addEventListener("input", apply);
});
