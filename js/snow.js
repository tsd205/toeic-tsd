
/* TOEIC TSD - Gentle Snow */

(() => {
  "use strict";

  function createSnow() {
    if (document.getElementById("tsd-snow")) return;

    if (window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches) return;

    const container = document.createElement("div");
    container.id = "tsd-snow";
    container.setAttribute("aria-hidden", "true");

    const count = window.innerWidth < 600 ? 14 : 25;

    for (let i = 0; i < count; i++) {
      const snow = document.createElement("span");
      snow.className = "tsd-snowflake";

      const size = 1.5 + Math.random() * 2;
      const duration = 13 + Math.random() * 12;
      const delay = -Math.random() * duration;

      snow.style.left = Math.random() * 100 + "%";
      snow.style.width = size + "px";
      snow.style.height = size + "px";
      snow.style.opacity =
        (0.12 + Math.random() * 0.20).toFixed(2);

      snow.style.animationDuration = duration + "s";
      snow.style.animationDelay = delay + "s";

      container.appendChild(snow);
    }

    document.body.appendChild(container);
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      createSnow,
      { once: true }
    );
  } else {
    createSnow();
  }
})();

