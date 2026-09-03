/* ============================================================
   InfoSense — FAQ Page Scripts
   Live search filter + expand/collapse controls
   ============================================================ */

(function () {
  "use strict";

  var searchInput  = document.getElementById("faq-search");
  var faqList      = document.getElementById("faq-list");
  var noResults    = document.getElementById("faq-no-results");
  var countEl      = document.getElementById("faq-count");
  var expandBtn    = document.getElementById("faq-expand");
  var collapseBtn  = document.getElementById("faq-collapse");

  if (!faqList) return;

  var items = Array.prototype.slice.call(faqList.querySelectorAll(".faq-item"));

  function updateCount(visible) {
    if (!countEl) return;
    countEl.textContent = visible === items.length
      ? items.length + " questions"
      : visible + " of " + items.length + " questions";
  }

  /* ---------- Live search filter ---------- */
  function filter() {
    if (!searchInput) return;
    var q = searchInput.value.trim().toLowerCase();
    var visible = 0;

    items.forEach(function (item) {
      var text = item.textContent.toLowerCase();
      var match = !q || text.indexOf(q) !== -1;
      item.style.display = match ? "" : "none";
      if (match) visible++;
    });

    if (noResults) noResults.classList.toggle("hidden", visible !== 0);
    updateCount(visible);
  }

  if (searchInput) {
    searchInput.addEventListener("input", filter);
  }

  /* ---------- Expand / collapse all ---------- */
  if (expandBtn) {
    expandBtn.addEventListener("click", function () {
      items.forEach(function (item) { item.open = true; });
    });
  }

  if (collapseBtn) {
    collapseBtn.addEventListener("click", function () {
      items.forEach(function (item) { item.open = false; });
    });
  }

  /* ---------- Init count ---------- */
  updateCount(items.length);
})();