(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Mouse-parallax and the rain canvas are desktop flourishes — on a
  // touch device they either never fire (mousemove) or just burn
  // battery and compete with scrolling for the main thread, which is
  // what makes the hero feel janky/heavy on phones. Treat coarse
  // pointers and narrow viewports the same as reduced motion for
  // those two effects.
  var isCoarsePointer = window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 760;

  /* ---------------- cookie consent ----------------
     Nothing on this site tracks visitors. The only thing consent gates is
     whether the theme choice below is allowed to persist in localStorage
     across visits — that's the "storage" the banner is telling people
     about. Decline, and the toggle still works, it just resets on
     reload. */
  var CONSENT_KEY = "mm-cookie-consent";
  var THEME_KEY = "mm-theme";

  function getConsent() {
    try { return window.localStorage.getItem(CONSENT_KEY); }
    catch (e) { return null; }
  }

  function setConsent(value) {
    try { window.localStorage.setItem(CONSENT_KEY, value); }
    catch (e) { /* storage unavailable, banner just won't reappear this tab */ }
  }

  var banner = document.getElementById("cookie-banner");
  if (banner) {
    var existingConsent = getConsent();
    if (!existingConsent) {
      window.setTimeout(function () { banner.classList.add("is-visible"); }, 900);
    }
    var acceptBtn = banner.querySelector(".cookie-accept");
    var declineBtn = banner.querySelector(".cookie-decline");
    if (acceptBtn) {
      acceptBtn.addEventListener("click", function () {
        setConsent("accepted");
        banner.classList.remove("is-visible");
      });
    }
    if (declineBtn) {
      declineBtn.addEventListener("click", function () {
        setConsent("declined");
        try { window.localStorage.removeItem(THEME_KEY); } catch (e) {}
        banner.classList.remove("is-visible");
      });
    }
  }

  /* ---------------- theme toggle ----------------
     Reads a saved preference first, falls back to system preference.
     Only writes to localStorage once cookie consent has been accepted. */
  var root = document.documentElement;
  var toggle = document.querySelector(".theme-toggle");

  function setTheme(mode) {
    if (mode === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
    if (toggle) toggle.setAttribute("aria-label", "Switch to " + (mode === "dark" ? "light" : "dark") + " mode");
  }

  function getSavedTheme() {
    try { return window.localStorage.getItem(THEME_KEY); }
    catch (e) { return null; }
  }

  function saveTheme(mode) {
    if (getConsent() !== "accepted") return;
    try { window.localStorage.setItem(THEME_KEY, mode); }
    catch (e) { /* ignore */ }
  }

  var savedTheme = getSavedTheme();
  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(savedTheme ? savedTheme : (prefersDark ? "dark" : "light"));

  if (toggle) {
    toggle.addEventListener("click", function () {
      var isDark = root.getAttribute("data-theme") === "dark";
      var next = isDark ? "light" : "dark";
      if (!reduceMotion) {
        toggle.classList.add("is-switching");
        window.setTimeout(function () { toggle.classList.remove("is-switching"); }, 260);
      }
      setTheme(next);
      saveTheme(next);
    });
  }

  /* ---------------- mobile nav menu ---------------- */
  var navToggle = document.getElementById("nav-toggle");
  var navLinksEl = document.getElementById("nav-links");

  function closeNavMenu() {
    if (!navToggle || !navLinksEl) return;
    navToggle.classList.remove("is-open");
    navLinksEl.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  }

  if (navToggle && navLinksEl) {
    navToggle.addEventListener("click", function () {
      var open = navLinksEl.classList.toggle("is-open");
      navToggle.classList.toggle("is-open", open);
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    navLinksEl.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeNavMenu);
    });

    document.addEventListener("click", function (e) {
      if (!navLinksEl.classList.contains("is-open")) return;
      if (navLinksEl.contains(e.target) || navToggle.contains(e.target)) return;
      closeNavMenu();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeNavMenu();
    });

    var deskQuery = window.matchMedia("(min-width: 761px)");
    var deskListener = function (e) { if (e.matches) closeNavMenu(); };
    if (deskQuery.addEventListener) deskQuery.addEventListener("change", deskListener);
    else if (deskQuery.addListener) deskQuery.addListener(deskListener);
  }

  /* ---------------- nav scroll state + scroll progress ---------------- */
  var navEl = document.querySelector(".nav");
  var progressEl = document.querySelector(".scroll-progress");
  var navIsScrolled = false;
  var chromeRaf = null;

  function onScrollChrome() {
    chromeRaf = null;
    var y = window.scrollY;
    if (navEl) {
      // Hysteresis (enter above 32px, leave below 12px) instead of a
      // single threshold, so scroll jitter right at one value can't
      // flip the class back and forth every frame.
      if (!navIsScrolled && y > 32) {
        navIsScrolled = true;
        navEl.classList.add("is-scrolled");
      } else if (navIsScrolled && y < 12) {
        navIsScrolled = false;
        navEl.classList.remove("is-scrolled");
      }
    }
    if (progressEl) {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      var pct = max > 0 ? (y / max) * 100 : 0;
      progressEl.style.width = pct + "%";
    }
  }
  onScrollChrome();
  window.addEventListener("scroll", function () {
    if (!chromeRaf) chromeRaf = requestAnimationFrame(onScrollChrome);
  }, { passive: true });

  /* ---------------- button ripple ---------------- */
  if (!reduceMotion) {
    document.querySelectorAll(".btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        var rect = btn.getBoundingClientRect();
        var size = Math.max(rect.width, rect.height) * 1.4;
        var span = document.createElement("span");
        span.className = "ripple";
        span.style.width = span.style.height = size + "px";
        span.style.left = (e.clientX - rect.left - size / 2) + "px";
        span.style.top = (e.clientY - rect.top - size / 2) + "px";
        btn.appendChild(span);
        window.setTimeout(function () { span.remove(); }, 620);
      });
    });
  }

  /* ---------------- scroll reveal ---------------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length && "IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------------- hero parallax (mouse-driven) ----------------
     The Ken Burns drift lives in CSS (.hero-parallax keyframes). This adds
     a second, independent layer of movement: the photo nudges opposite the
     cursor, like the mountain is settling into place as you look around. */
  var heroOuter = document.querySelector(".hero-parallax-outer");
  var heroEl = document.querySelector(".hero");

  if (heroOuter && heroEl && !reduceMotion && !isCoarsePointer) {
    var targetX = 0, targetY = 0, curX = 0, curY = 0;
    var raf = null;

    heroEl.addEventListener("mousemove", function (e) {
      var rect = heroEl.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width - 0.5;
      var py = (e.clientY - rect.top) / rect.height - 0.5;
      targetX = px * -18;
      targetY = py * -12;
      if (!raf) raf = requestAnimationFrame(tick);
    });

    heroEl.addEventListener("mouseleave", function () {
      targetX = 0;
      targetY = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    });

    function tick() {
      curX += (targetX - curX) * 0.06;
      curY += (targetY - curY) * 0.06;
      heroOuter.style.transform = "translate3d(" + curX.toFixed(2) + "px, " + curY.toFixed(2) + "px, 0)";
      if (Math.abs(targetX - curX) > 0.05 || Math.abs(targetY - curY) > 0.05) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = null;
      }
    }
  }

  /* ---------------- hero parallax (scroll-driven) ----------------
     As the page scrolls past the hero, the photo drifts and dims a touch
     faster than the page itself, and the plaque eases up and fades —
     a quieter cousin of the mouse-driven nudge above. */
  var heroMedia = document.querySelector(".hero-media");
  var plaqueEl = document.querySelector(".plaque");

  if (heroEl && (heroMedia || plaqueEl) && !reduceMotion) {
    var heroRaf = null;
    function updateHeroScroll() {
      heroRaf = null;
      var rect = heroEl.getBoundingClientRect();
      var progress = Math.min(Math.max(-rect.top / rect.height, 0), 1);
      if (heroMedia) {
        heroMedia.style.transform = "translate3d(0, " + (progress * 60).toFixed(1) + "px, 0)";
        heroMedia.style.opacity = String(1 - progress * 0.5);
      }
      if (plaqueEl) {
        plaqueEl.style.transform = "translate3d(0, " + (progress * -28).toFixed(1) + "px, 0)";
        plaqueEl.style.opacity = String(1 - progress * 0.9);
      }
    }
    window.addEventListener("scroll", function () {
      if (!heroRaf) heroRaf = requestAnimationFrame(updateHeroScroll);
    }, { passive: true });
    updateHeroScroll();
  }

  /* ---------------- rain over the hero photo ---------------- */
  var canvas = document.getElementById("hero-rain");
  if (canvas && !reduceMotion && !isCoarsePointer) {
    var ctx = canvas.getContext("2d");
    var drops = [];
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var wrapEl = canvas.closest(".hero-media") || canvas.parentElement;

    function sizeCanvas() {
      var rect = wrapEl.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
      var count = Math.round((rect.width * rect.height) / 9000);
      drops = [];
      for (var i = 0; i < count; i++) drops.push(makeDrop(rect.width, rect.height, true));
    }

    function makeDrop(w, h, randomY) {
      var len = 14 + Math.random() * 22;
      return {
        x: Math.random() * (w + 200) - 100,
        y: randomY ? Math.random() * h : -len,
        len: len,
        speed: 6 + Math.random() * 7,
        drift: 1.2 + Math.random() * 0.6,
        opacity: 0.12 + Math.random() * 0.22
      };
    }

    var lastW = 0, lastH = 0;
    function loop() {
      var w = canvas.width / dpr, h = canvas.height / dpr;
      if (w !== lastW || h !== lastH) { lastW = w; lastH = h; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = "round";
      for (var i = 0; i < drops.length; i++) {
        var d = drops[i];
        d.x += d.drift;
        d.y += d.speed;
        if (d.y - d.len > h) {
          d.y = -d.len;
          d.x = Math.random() * (w + 200) - 100;
        }
        ctx.strokeStyle = "rgba(230,236,244," + d.opacity + ")";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.drift * 2.2, d.y - d.len);
        ctx.stroke();
      }
      requestAnimationFrame(loop);
    }

    sizeCanvas();
    window.addEventListener("resize", sizeCanvas);
    requestAnimationFrame(loop);
  }

  /* ---------------- family portal mock: working buttons ----------------
     This mirrors what a family sees on the real portal link: Approve
     locks in the proof and updates the status; Request changes opens a
     short comment field. Nothing here submits anywhere — it's a preview
     of the interaction, scoped to this page. */
  var portalMock = document.querySelector(".portal-mock");
  if (portalMock) {
    var statusValue = portalMock.querySelector(".status-value");
    var approveBtn = portalMock.querySelector(".approve");
    var changesBtn = portalMock.querySelector(".request-changes");
    var commentBox = portalMock.querySelector(".comment-box");
    var commentSend = portalMock.querySelector(".send-comment");
    var commentSent = portalMock.querySelector(".comment-sent");
    var commentTextarea = portalMock.querySelector(".comment-box textarea");

    function setStatus(text, kind) {
      if (!statusValue) return;
      statusValue.textContent = text;
      statusValue.classList.remove("is-approved", "is-flagged");
      if (kind) statusValue.classList.add(kind);
    }

    if (approveBtn) {
      approveBtn.addEventListener("click", function () {
        if (approveBtn.disabled) return;
        approveBtn.disabled = true;
        approveBtn.textContent = "Approved ✓";
        approveBtn.classList.add("is-done");
        if (changesBtn) changesBtn.disabled = true;
        setStatus("Approved", "is-approved");
        if (commentBox) commentBox.classList.remove("is-open");
      });
    }

    if (changesBtn) {
      changesBtn.addEventListener("click", function () {
        if (changesBtn.disabled || !commentBox) return;
        commentBox.classList.toggle("is-open");
        if (commentBox.classList.contains("is-open") && commentTextarea) {
          window.setTimeout(function () { commentTextarea.focus(); }, 180);
        }
      });
    }

    if (commentSend) {
      commentSend.addEventListener("click", function () {
        if (commentTextarea && !commentTextarea.value.trim()) {
          commentTextarea.focus();
          return;
        }
        setStatus("Changes requested", "is-flagged");
        if (commentBox) commentBox.classList.remove("is-open");
        if (commentSent) {
          commentSent.classList.add("is-visible");
          window.setTimeout(function () { commentSent.classList.remove("is-visible"); }, 3200);
        }
        if (commentTextarea) commentTextarea.value = "";
      });
    }
  }

  /* ---------------- footer year ---------------- */
  var yearEl = document.getElementById("footer-year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------------- demo form → Formspree ---------------- */
  var form = document.getElementById("demo-form");
  if (form) {
    var card = document.getElementById("form-card");
    var errorBox = document.getElementById("form-error");
    var submitBtn = form.querySelector(".form-submit");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      if (errorBox) errorBox.classList.remove("is-visible");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Sending…';
      }

      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      })
        .then(function (response) {
          if (response.ok) {
            card.classList.add("submitted");
            var successPanel = document.getElementById("success-panel");
            if (successPanel) successPanel.scrollIntoView({ behavior: "smooth", block: "center" });
          } else {
            throw new Error("Request failed");
          }
        })
        .catch(function () {
          if (errorBox) errorBox.classList.add("is-visible");
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Request a demo"; }
        });
    });
  }
})();
