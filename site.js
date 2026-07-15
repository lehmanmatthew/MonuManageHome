(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- theme toggle ----------------
     Follows system preference on load. Toggling only changes the current
     page view (no localStorage/cookies), since this runs inside a chat
     preview sandbox — wire up persistence once it's hosted on your own
     domain if you want the choice to stick across visits. */
  var root = document.documentElement;
  var toggle = document.querySelector(".theme-toggle");

  function setTheme(mode) {
    if (mode === "dark") root.setAttribute("data-theme", "dark");
    else root.removeAttribute("data-theme");
  }

  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(prefersDark ? "dark" : "light");

  if (toggle) {
    toggle.addEventListener("click", function () {
      var isDark = root.getAttribute("data-theme") === "dark";
      setTheme(isDark ? "light" : "dark");
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

  if (heroOuter && heroEl && !reduceMotion) {
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

  /* ---------------- rain over the hero photo ---------------- */
  var canvas = document.getElementById("hero-rain");
  if (canvas && !reduceMotion) {
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
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Sending…"; }

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
