/* ============================================================
   InfoSense — Authentication & Navbar User UI
   - Google Sign-In
   - Email/Password: signup (username), login, reset
   - Email verification gating (link-based, free tier safe)
   - Username uniqueness via Firestore transaction
   ============================================================ */

(function () {
  "use strict";

  var cfg = window.FIREBASE_CONFIG;
  if (!cfg || !cfg.apiKey || cfg.apiKey.indexOf("PASTE") === 0) {
    return; /* config දමලා නැත්නම් මුකුත් කරන්නේ නෑ */
  }

  var SDK = "https://www.gstatic.com/firebasejs/10.12.2/";

  function loadScript(src, cb) {
    var s = document.createElement("script");
    s.src = src; s.async = true;
    s.onload = cb; s.onerror = cb;
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
    var authInstance = firebase.auth;

    /* ---------- Navbar: desktop slot ---------- */
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
        var label = user.displayName ||
                    (user.email ? user.email.split("@")[0] : "My Account");
        var initial = (label || "U").charAt(0).toUpperCase();
        var avatar = user.photoURL
          ? '<img src="' + user.photoURL + '" alt="" referrerpolicy="no-referrer" ' +
            'class="w-8 h-8 rounded-full border border-white/20 object-cover" />'
          : '<span class="w-8 h-8 rounded-full bg-accent grid place-items-center text-white text-xs font-bold">' +
            escapeHtml(initial) + "</span>";

        slot.innerHTML =
          '<a href="account.html" title="My Account" class="flex items-center gap-2 group">' +
          avatar +
          '<span class="hidden md:inline text-sm font-semibold text-white group-hover:text-accent transition">' +
          escapeHtml(label) + "</span></a>";
      }
      container.insertBefore(slot, container.firstChild);
    }

    /* ---------- Navbar: mobile item ---------- */
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

    /* ---------- Firestore user doc ---------- */
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
      if (user) syncUserDoc(user);
      if (typeof window.__isAuthListener === "function") {
        window.__isAuthListener(user);
      }
    });

    auth.getRedirectResult().catch(function () {});

    /* ---------- Username helpers ---------- */
    function validateUsername(username) {
      return /^[a-zA-Z0-9_]{3,20}$/.test(username || "");
    }

    function checkUsernameAvailable(username) {
      if (!validateUsername(username)) {
        return Promise.reject({ code: "username/invalid" });
      }
      return db.collection("usernames")
        .doc(username.toLowerCase())
        .get()
        .then(function (snap) { return !snap.exists; });
    }

    /* ---------- Email sign up ---------- */
    function signUpWithEmail(username, email, password) {
      username = (username || "").trim();
      if (!validateUsername(username)) {
        return Promise.reject({ code: "username/invalid" });
      }
      var uname = username.toLowerCase();
      var usernamesRef = db.collection("usernames").doc(uname);

      /* quick pre-check for better UX */
      return usernamesRef.get().then(function (snap) {
        if (snap.exists) {
          throw { code: "username/taken" };
        }
        /* create auth account */
        return authInstance().createUserWithEmailAndPassword(email, password);
      }).then(function (cred) {
        var uid = cred.user.uid;

        /* race-safe username claim */
        return db.runTransaction(function (tx) {
          return tx.get(usernamesRef).then(function (s) {
            if (s.exists) {
              throw { code: "username/taken" };
            }
            tx.set(usernamesRef, {
              uid: uid,
              username: uname,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return null;
          });
        }).catch(function (err) {
          if (err && err.code === "username/taken") {
            /* rollback: remove just-created auth account */
            return firebase.auth().currentUser.delete().then(function () {
              throw err;
            });
          }
          throw err;
        }).then(function () {
          /* profile doc */
          return db.collection("users").doc(uid).set({
            username:   uname,
            displayName: username,
            name:       username,
            email:      email,
            provider:   "password",
            premium:    false,
            plan:       "free",
            createdAt:  firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin:  firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }).then(function () {
          /* verification email (link) */
          return cred.user.sendEmailVerification({
            url: window.location.origin +
                 window.location.pathname.replace(/[^/]*$/, "") + "login.html"
          });
        }).then(function () {
          return cred.user;
        });
      });
    }

    /* ---------- Public API ---------- */
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
      signInWithEmail: function (email, password) {
        return auth.signInWithEmailAndPassword(email, password);
      },
      signUpWithEmail: signUpWithEmail,
      checkUsernameAvailable: checkUsernameAvailable,
      sendVerification: function (user) {
        return user.sendEmailVerification({
          url: window.location.origin +
               window.location.pathname.replace(/[^/]*$/, "") + "login.html"
        });
      },
      reloadUser: function (user) { return user.reload(); },
      sendPasswordReset: function (email) {
        return auth.sendPasswordResetEmail(email);
      },
      signOut: function () { return auth.signOut(); },
      getUser: function () { return auth.currentUser; },
      db: db,
      auth: auth
    };
  }
})();
