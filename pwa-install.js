(function () {
  "use strict";

  var DISMISS_KEY = "pwa-install-dismissed-at";
  var DISMISS_DAYS = 14;
  var SHOW_DELAY_MS = 2500;

  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }

  function detectPlatform() {
    var ua = navigator.userAgent;
    var isIOS =
      /iphone|ipad|ipod/i.test(ua) ||
      (ua.indexOf("Macintosh") > -1 && navigator.maxTouchPoints > 1);
    if (isIOS) return "ios";
    if (/android/i.test(ua)) return "android";
    return "desktop";
  }

  function wasRecentlyDismissed() {
    try {
      var raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return false;
      var elapsedDays = (Date.now() - Number(raw)) / (1000 * 60 * 60 * 24);
      return elapsedDays < DISMISS_DAYS;
    } catch (e) {
      return false;
    }
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch (e) {}
  }

  function accentColor() {
    var meta = document.querySelector('meta[name="theme-color"]');
    return (meta && meta.content) || "#8D96C1";
  }

  function appIcon() {
    var link =
      document.querySelector('link[rel="apple-touch-icon"]') ||
      document.querySelector('link[rel="icon"][sizes="512x512"]') ||
      document.querySelector('link[rel="icon"]');
    return (link && link.href) || "/icon-192.png";
  }

  function appName() {
    var meta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    return (meta && meta.content) || document.title || "o app";
  }

  function build(platform, onInstall, onDismiss) {
    var accent = accentColor();

    var style = document.createElement("style");
    style.textContent =
      "#pwa-install-card{position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom));" +
      "transform:translate(-50%,16px);width:min(480px,calc(100vw - 24px));z-index:9999;" +
      "background:#1c1c1e;color:#fffbf3;border-radius:22px;box-shadow:0 16px 40px rgba(0,0,0,.4);" +
      "padding:20px 20px 18px;display:flex;flex-direction:column;gap:14px;" +
      "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;" +
      "opacity:0;transition:opacity .35s cubic-bezier(.22,1,.36,1),transform .35s cubic-bezier(.22,1,.36,1);}" +
      "#pwa-install-card.pwa-visible{opacity:1;transform:translate(-50%,0);}" +
      "#pwa-install-card .pwa-row{display:flex;align-items:center;gap:14px;}" +
      "#pwa-install-card img{width:60px;height:60px;border-radius:16px;flex-shrink:0;object-fit:cover;}" +
      "#pwa-install-card .pwa-title{font-weight:700;font-size:19px;line-height:1.25;}" +
      "#pwa-install-card .pwa-sub{font-size:14.5px;opacity:.75;line-height:1.35;}" +
      "#pwa-install-card .pwa-close{background:transparent;border:none;color:inherit;opacity:.6;" +
      "font-size:22px;line-height:1;padding:6px;cursor:pointer;}" +
      "#pwa-install-card .pwa-steps{display:flex;align-items:center;gap:12px;font-size:14.5px;" +
      "background:rgba(255,255,255,.08);border-radius:14px;padding:13px 15px;}" +
      "#pwa-install-card .pwa-btn{background:" + accent + ";color:#fff;border:none;border-radius:14px;" +
      "padding:14px 18px;font-weight:700;font-size:16px;cursor:pointer;width:100%;" +
      "filter:drop-shadow(0 1px 0 rgba(0,0,0,.1));}" +
      "@media (prefers-reduced-motion: reduce){#pwa-install-card{transition:none!important;}}";
    document.head.appendChild(style);

    var card = document.createElement("div");
    card.id = "pwa-install-card";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-label", "Instalar app");

    var shareIcon =
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" style="flex-shrink:0">' +
      '<path d="M12 3v12m0-12 4 4m-4-4-4 4M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" ' +
      'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    card.innerHTML =
      '<div class="pwa-row">' +
      '<img src="' + appIcon() + '" alt="">' +
      '<div style="flex:1;min-width:0">' +
      '<div class="pwa-title">Instale ' + appName() + "</div>" +
      '<div class="pwa-sub">' +
      (platform === "ios"
        ? "Acesso rápido direto da tela inicial"
        : "Acesso rápido, funciona offline") +
      "</div></div>" +
      '<button class="pwa-close" aria-label="Fechar">✕</button>' +
      "</div>" +
      (platform === "ios"
        ? '<div class="pwa-steps"><span>Toque em</span>' +
          shareIcon +
          '<span>e depois em <strong>"Adicionar à Tela de Início"</strong></span></div>'
        : '<button class="pwa-btn">Instalar</button>');

    document.body.appendChild(card);

    card.querySelector(".pwa-close").addEventListener("click", function () {
      dismiss();
      card.classList.remove("pwa-visible");
      setTimeout(function () {
        card.remove();
      }, 350);
      if (onDismiss) onDismiss();
    });

    var installBtn = card.querySelector(".pwa-btn");
    if (installBtn) {
      installBtn.addEventListener("click", function () {
        onInstall();
      });
    }

    requestAnimationFrame(function () {
      card.classList.add("pwa-visible");
    });

    return card;
  }

  function init() {
    if (isStandalone() || wasRecentlyDismissed()) return;

    var platform = detectPlatform();
    var deferredPrompt = null;

    if (platform === "ios") {
      setTimeout(function () {
        build(platform, null, null);
      }, SHOW_DELAY_MS);
      return;
    }

    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferredPrompt = e;
      setTimeout(function () {
        var card = build(platform, async function () {
          if (!deferredPrompt) return;
          deferredPrompt.prompt();
          await deferredPrompt.userChoice;
          deferredPrompt = null;
          dismiss();
          card.classList.remove("pwa-visible");
          setTimeout(function () {
            card.remove();
          }, 350);
        });
      }, SHOW_DELAY_MS);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
