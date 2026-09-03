/* ============================================================
   InfoSense — Privacy Policy Page Scripts
   Vanilla JS only — lightweight, no dependencies
   ============================================================ */

(function () {
  "use strict";

  /* ---------- 1. Mobile menu toggle ---------- */
  const menuBtn = document.getElementById("menu-btn");
  const mobileMenu = document.getElementById("mobile-menu");

  if (menuBtn && mobileMenu) {
    const menuIcon = menuBtn.querySelector("i");

    menuBtn.addEventListener("click", function () {
      const isOpen = !mobileMenu.classList.contains("hidden");
      mobileMenu.classList.toggle("hidden");
      menuBtn.setAttribute("aria-expanded", String(!isOpen));

      if (menuIcon) {
        menuIcon.classList.toggle("fa-bars", isOpen);
        menuIcon.classList.toggle("fa-xmark", !isOpen);
      }
    });

    // Close menu when a mobile link is tapped
    mobileMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mobileMenu.classList.add("hidden");
        menuBtn.setAttribute("aria-expanded", "false");
        if (menuIcon) {
          menuIcon.classList.add("fa-bars");
          menuIcon.classList.remove("fa-xmark");
        }
      });
    });
  }

  /* ---------- 2. Scroll progress bar ---------- */
  const progressBar = document.getElementById("progress-bar");

  function updateProgress() {
    if (!progressBar) return;
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = progress + "%";
  }

  /* ---------- 3. Back to top button ---------- */
  const toTop = document.getElementById("to-top");

  function toggleToTop() {
    if (!toTop) return;
    const show = window.scrollY > 500;
    toTop.classList.toggle("opacity-0", !show);
    toTop.classList.toggle("pointer-events-none", !show);
  }

  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  window.addEventListener("scroll", function () {
    updateProgress();
    toggleToTop();
  }, { passive: true });

  updateProgress();
  toggleToTop();

  /* ---------- 4. TOC active highlighting ---------- */
  const tocLinks = document.querySelectorAll(".toc-link");
  const sections = document.querySelectorAll("article section[id]");

  if ("IntersectionObserver" in window && tocLinks.length && sections.length) {
    const tocMap = new Map();
    tocLinks.forEach(function (link) {
      const id = link.getAttribute("href");
      if (id && id.startsWith("#")) tocMap.set(id.slice(1), link);
    });

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            tocLinks.forEach(function (l) { l.classList.remove("active"); });
            const activeLink = tocMap.get(entry.target.id);
            if (activeLink) {
              activeLink.classList.add("active");
              // Keep active item visible inside TOC scroll area
              activeLink.scrollIntoView({ block: "nearest" });
            }
          }
        });
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 }
    );

    sections.forEach(function (s) { observer.observe(s); });
  }

  /* ---------- 5. Reveal on scroll animations ---------- */
  const revealEls = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window && revealEls.length) {
    const revealObserver = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );

    revealEls.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }
})();