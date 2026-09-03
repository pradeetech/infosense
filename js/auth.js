/* ============================================================
   InfoSense — Authentication & Navbar User UI
   - Google Sign-In (Firebase Auth)
   - Navbar auto-injects: "Sign In" button / user avatar
   - Firestore: creates users/{uid} profile on first login
   Fails silently if firebase-config.js is not configured yet.
   ============================================================ */

(function () {
  "use strict";

  var cfg = window.FIREBASE_CONFIG;
  if (!cfg || !cfg.apiKey || cfg.apiKey.indexOf("PASTE") === 0) {
    return; /* Config දමලා නැත්නම් කිසිවක් කරන්නේ නෑ */
  }

  var SDK = "https://www.gstatic.com/firebasejs/10.12.2/";

  function loadScript(src, cb) {
    var s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = cb;
    s.onerror = cb;
    document.head.appendChild(s);
  }

  loadScript(SDK + "firebase-app-compat.js", function () {
    loadScript(SDK + "firebase-auth-compat.js", function () {
      loadScript(SDK + "firebase-firestore-compat.js", init);
    });
  });

  function escapeHtml(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : s;
    return d.innerHTML;
  }

  function init() {
    if (!window.firebase) return;
    if (!firebase.apps.length) firebase.initializeApp(cfg);

    var auth = firebase.auth();
    var db   = firebase.firestore();

    /* ---------- Desktop navbar slot ---------- */
    function buildNavUI(user) {
      var container = document.querySelector("header nav .flex.items-center.gap-3");
      var old = document.getElementById("is-auth-slot");
      if (old) old.remove();
      if (!container) return;

      var slot = document.createElement("div");
      slot.id = "is-auth-slot";
      slot.className = "flex items-center";

      if (!user) {
        slot.innerHTML =
          '<a href="login.html" class="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full ' +
          'bg-surface border border-white/10 hover:border-accent/50 text-white text-sm font-semibold ' +
          'transition-all duration-200 hover:-translate-y-0.5">' +
          '<i class="fa-solid fa-user text-xs text-accent" aria-hidden="true"></i> Sign In</a>';
      } else {
        var initial = (user.displayName || user.email || "U").charAt(0).toUpperCase();
        var avatar = user.photoURL
          ? '<img src="' + user.photoURL + '" alt="" referrerpolicy="no-referrer" ' +
            'class="w-8 h-8 rounded-full border border-white/20 object-cover" />'
          : '<span class="w-8 h-8 rounded-full bg-accent grid place-items-center text-white text-xs font-bold">' +
            escapeHtml(initial) + "</span>";

        slot.innerHTML =
          '<a href="account.html" title="My Account" class="flex items-center gap-2 group">' +
          avatar +
          '<span class="hidden md:inline text-sm font-semibold text-white group-hover:text-accent transition">' +
          escapeHtml(user.displayName || "My Account") + "</span></a>";
      }

      container.insertBefore(slot, container.firstChild);
    }

    /* ---------- Mobile menu item ---------- */
    function buildMobileUI(user) {
      var menu = document.getElementById("mobile-menu");
      if (!menu) return;
      var old = document.getElementById("is-mobile-auth");
      if (old) old.remove();

      var li = document.createElement("li");
      li.id = "is-mobile-auth";
      li.innerHTML = user
        ? '<a href="account.html" class="mobile-link"><i class="fa-solid fa-user-circle mr-2 text-accent" aria-hidden="true"></i>My Account</a>'
        : '<a href="login.html" class="mobile-link"><i class="fa-solid fa-user mr-2 text-accent" aria-hidden="true"></i>Sign In</a>';

      var ul = menu.querySelector("ul");
      if (ul) ul.insertBefore(li, ul.firstChild);
    }

    /* ---------- Firestore profile sync ---------- */
    function syncUserDoc(user) {
      if (!user) return;
      var ref = db.collection("users").doc(user.uid);
      ref.get().then(function (snap) {
        var data = {
          name:      user.displayName || "",
          email:     user.email || "",
          photoURL:  user.photoURL || "",
          lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (!snap.exists) {
          data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          data.premium   = false;
          data.plan      = "free";
        }
        ref.set(data, { merge: true }).catch(function () {});
      }).catch(function () {});
    }

    /* ---------- Auth state ---------- */
    auth.onAuthStateChanged(function (user) {
      buildNavUI(user);
      buildMobileUI(user);
      syncUserDoc(user);

      /* Pages can hook into this (login.html / account.html) */
      if (typeof window.__isAuthListener === "function") {
        window.__isAuthListener(user);
      }
    });

    /* Handle redirect fallback result */
    auth.getRedirectResult().catch(function () {});

    /* ---------- Public helper API ---------- */
    window.InfoSenseAuth = {
      signInWithGoogle: function () {
        var provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        return auth.signInWithPopup(provider).catch(function (err) {
          if (err && err.code === "auth/popup-blocked") {
            return auth.signInWithRedirect(provider);
          }
          throw err;
        });
      },
      signOut: function () { return auth.signOut(); },
      getUser: function () { return auth.currentUser; },
      db: db
    };
  }
})();
