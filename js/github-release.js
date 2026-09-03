/* ============================================================
   InfoSense — GitHub Release Integration
   Fetches the latest release from GitHub API and updates:
   version, release date, APK download button, What's New.
   Fails gracefully if the API is unavailable.
   ============================================================ */

(function () {
  "use strict";

  var cfg = window.INFOSENSE_CONFIG && window.INFOSENSE_CONFIG.github;
  if (!cfg) return;

  function $(id) { return document.getElementById(id); }

  var els = {
    version: $("release-version"),
    date:    $("release-date"),
    file:    $("release-file"),
    status:  $("release-status"),
    btn:     $("download-apk-btn"),
    view:    $("view-release-btn"),
    whatsNew: $("whats-new"),
    notes:   $("release-notes")
  };

  /* ---------- Helpers ---------- */

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric"
      });
    } catch (e) { return ""; }
  }

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  /* Very small markdown-lite renderer for release notes
     (bullets + bold only — safe, escaped first) */
  function renderNotes(body) {
    var lines = escapeHtml(body).split(/\r?\n/);
    var html = "", inList = false;

    lines.forEach(function (line) {
      var t = line.trim();
      var isBullet = /^[-*]\s+/.test(t);

      if (isBullet) {
        if (!inList) { html += '<ul class="policy-list">'; inList = true; }
        html += "<li>" + t.replace(/^[-*]\s+/, "") + "</li>";
      } else {
        if (inList) { html += "</ul>"; inList = false; }
        if (t) html += "<p>" + t + "</p>";
      }
    });
    if (inList) html += "</ul>";

    return html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  /* ---------- Graceful fallback ---------- */

  function fallback(message) {
    if (els.version) els.version.textContent = "—";
    if (els.date)    els.date.textContent = "";
    if (els.file)    els.file.textContent = "";
    if (els.btn)     els.btn.href = cfg.releasesUrl;
    if (els.view)    els.view.href = cfg.releasesUrl;
    if (els.status) {
      els.status.innerHTML =
        '<i class="fa-solid fa-triangle-exclamation text-warning" aria-hidden="true"></i> ' +
        escapeHtml(message) +
        ' You can still get the app from the ' +
        '<a class="text-accent underline" href="' + cfg.releasesUrl + '">GitHub Releases</a> page.';
    }
  }

  /* ---------- Main fetch ---------- */

  if (!("fetch" in window)) {
    fallback("Your browser does not support automatic release detection.");
    return;
  }

  if (els.status) {
    els.status.innerHTML =
      '<i class="fa-solid fa-circle-notch fa-spin text-accent" aria-hidden="true"></i> ' +
      "Checking for the latest release…";
  }

  fetch(cfg.apiLatestRelease, {
    headers: { "Accept": "application/vnd.github+json" }
  })
    .then(function (res) {
      if (!res.ok) throw new Error("GitHub API HTTP " + res.status);
      return res.json();
    })
    .then(function (release) {
      /* Version */
      if (els.version) els.version.textContent = release.tag_name || "—";

      /* Release date */
      if (els.date) {
        els.date.innerHTML =
          '<i class="fa-regular fa-calendar mr-1" aria-hidden="true"></i>' +
          (release.published_at ? "Released " + formatDate(release.published_at) : "");
      }

      /* Find the .apk asset */
      var apk = (release.assets || []).find(function (a) {
        return /\.apk$/i.test(a.name);
      });

      if (els.btn) {
        els.btn.href = apk ? apk.browser_download_url : cfg.releasesUrl;
      }

      if (els.file) {
        els.file.textContent = apk
          ? apk.name + (apk.size ? " · " + (apk.size / 1048576).toFixed(1) + " MB" : "")
          : "APK available on the Releases page";
      }

      if (els.view) els.view.href = release.html_url || cfg.releasesUrl;

      if (els.status) {
        els.status.innerHTML =
          '<i class="fa-solid fa-circle-check text-success" aria-hidden="true"></i> ' +
          "Latest release loaded from GitHub.";
      }

      /* What's New — release notes */
      if (release.body && els.notes && els.whatsNew) {
        els.notes.innerHTML = renderNotes(release.body);
        els.whatsNew.classList.remove("hidden");
      }
    })
    .catch(function () {
      fallback("Couldn't load the latest release info right now.");
    });
})();