/* =========================================================
   UI.JS — Interacciones de interfaz
   SPA mode: cada panel se muestra/oculta (no scroll landing).
   ========================================================= */

/* ── THEME: carga inicial ─────────────────────────────── */
(function initTheme() {
  document.documentElement.setAttribute("data-theme", "light");
  updateThemeIcons("light");
})();

function updateThemeIcons(theme) {
  var sun  = document.getElementById("themeIconSun");
  var moon = document.getElementById("themeIconMoon");
  if (!sun || !moon) return;
  if (theme === "dark") { sun.style.display = "none"; moon.style.display = ""; }
  else                  { sun.style.display = "";     moon.style.display = "none"; }
}
window.updateThemeIcons = updateThemeIcons;

/* ── Variables de panel (accesibles desde window.load) ── */
var _panelMap       = null;
var _navItems       = null;
var _activateNav    = null;
window._showPanel   = null;

document.addEventListener("DOMContentLoaded", function () {

  /* ── THEME TOGGLE ──────────────────────────────────── */
  var themeBtn = document.getElementById("themeToggleBtn");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme") || "light";
      var next    = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      updateThemeIcons(next);

      var session = typeof window.getSession === "function" ? window.getSession() : null;
      if (session && window.supabase) {
        window.supabase.from("users").update({ theme: next }).eq("id", session.id)
          .then(function (res) { if (!res.error && session) session.theme = next; });
      }
    });
  }

  /* ── SIDEBAR NAVIGATION — modo SPA ───────────────────── */
  _navItems = document.querySelectorAll(".nav-item[data-panel]");
  _panelMap = {
    overview:  document.getElementById("panelOverview"),
    registro:  document.getElementById("panelRegistro"),
    consulta:  document.getElementById("panelConsulta"),
    usuarios:  document.getElementById("usersSection"),
    auditoria: document.getElementById("panelAudit"),
  };

  _activateNav = function (targetPanel) {
    _navItems.forEach(function (item) {
      item.classList.toggle("active", item.dataset.panel === targetPanel);
      item.setAttribute("aria-current", item.dataset.panel === targetPanel ? "page" : "false");
    });
  };

  /* Muestra un panel y oculta todos los demás */
  window._showPanel = function (panelId) {
    Object.values(_panelMap).forEach(function (el) {
      if (el) el.classList.remove("panel-active");
    });
    var target = _panelMap[panelId];
    if (target) target.classList.add("panel-active");
    _activateNav(panelId);
  };

  /* Inicializar: mostrar resumen al cargar */
  window._showPanel("overview");

  _navItems.forEach(function (item) {
    item.addEventListener("click", function () {
      var panel  = item.dataset.panel;
      if (!panel) return;
      var target = _panelMap[panel];

      /* Verificar permisos para paneles restringidos */
      if ((panel === "usuarios" || panel === "auditoria") &&
          target && target.classList.contains("section-hidden")) {
        showNotif("Acceso restringido", "No tienes permisos para acceder a esta sección.", "error");
        return;
      }

      window._showPanel(panel);
      closeSidebar();

      /* Al entrar a consulta, forzar render de fichas */
      if (panel === "consulta") {
        if (typeof window.renderSearchResults === "function") window.renderSearchResults();
        if (typeof window.renderAnalytics     === "function") window.renderAnalytics();
      }
      /* Al entrar a overview, redibujar gráfica */
      if (panel === "overview" && typeof window.drawProvinceChart === "function") {
        setTimeout(window.drawProvinceChart, 80);
      }
    });
  });

  /* ── NAV GROUP COLLAPSE ───────────────────────────── */
  document.querySelectorAll(".nav-group-header[data-target]").forEach(function (hdr) {
    hdr.addEventListener("click", function () {
      var group = document.getElementById(hdr.dataset.target);
      if (!group) return;
      var isOpen = hdr.classList.contains("open");
      hdr.classList.toggle("open", !isOpen);
      hdr.setAttribute("aria-expanded", String(!isOpen));
      group.classList.toggle("collapsed", isOpen);
    });
    hdr.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); hdr.click(); }
    });
  });

  /* ── SIDEBAR MOBILE ────────────────────────────────── */
  var sidebar   = document.getElementById("appSidebar");
  var overlay   = document.getElementById("sidebarOverlay");
  var toggleBtn = document.getElementById("sidebarToggleBtn");

  function openSidebar() {
    if (!sidebar) return;
    sidebar.classList.add("open");
    overlay   && overlay.classList.add("visible");
    toggleBtn && toggleBtn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove("open");
    overlay   && overlay.classList.remove("visible");
    toggleBtn && toggleBtn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }
  window._closeSidebar = closeSidebar;

  if (toggleBtn) toggleBtn.addEventListener("click", function () {
    sidebar.classList.contains("open") ? closeSidebar() : openSidebar();
  });
  if (overlay) overlay.addEventListener("click", closeSidebar);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && sidebar && sidebar.classList.contains("open")) closeSidebar();
  });

  /* ── TOPBAR SEARCH → va directo a Consulta ────────── */
  var topbarSearch = document.getElementById("topbarSearchInput");
  var mainSearch   = document.getElementById("searchInput");
  if (topbarSearch && mainSearch) {
    topbarSearch.addEventListener("input", function () {
      mainSearch.value = topbarSearch.value;
      /* Cambiar al panel de consulta automáticamente */
      if (topbarSearch.value.trim() && window._showPanel) window._showPanel("consulta");
      mainSearch.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

});

/* ── UPDATE SIDEBAR USER INFO ─────────────────────────── */
function updateSidebarUser(session) {
  if (!session) return;
  var avatar = document.getElementById("sidebarAvatar");
  var nameEl = document.getElementById("sidebarUserName");
  var roleEl = document.getElementById("sidebarUserRole");
  if (avatar) {
    var initials = (session.name || "U").trim().split(" ")
      .map(function (w) { return w[0] || ""; }).slice(0, 2).join("").toUpperCase();
    avatar.textContent = initials;
  }
  if (nameEl) nameEl.textContent = session.name || session.username || "Usuario";
  if (roleEl) roleEl.textContent = session.role || "—";
}

/* ── NOTIFICATIONS ────────────────────────────────────── */
function showNotif(title, message, type) {
  type = type || "info";
  var container = document.getElementById("notifContainer");
  if (!container) return;

  var icons = {
    success: '<svg class="notif-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error:   '<svg class="notif-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg class="notif-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info:    '<svg class="notif-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
  };

  var el = document.createElement("div");
  el.className = "notif " + type;
  el.setAttribute("role", "status");
  el.innerHTML =
    (icons[type] || icons.info) +
    '<div class="notif-body">' +
      '<div class="notif-title">' + escapeNotifHtml(title)   + '</div>' +
      '<div class="notif-msg">'   + escapeNotifHtml(message) + '</div>' +
    '</div>' +
    '<button class="notif-dismiss" type="button" aria-label="Cerrar">×</button>';

  container.appendChild(el);
  el.querySelector(".notif-dismiss").addEventListener("click", function () { dismissNotif(el); });
  setTimeout(function () { dismissNotif(el); }, 4500);
}

function dismissNotif(el) {
  if (!el || !el.parentNode) return;
  el.classList.add("notif-leaving");
  setTimeout(function () { el.parentNode && el.parentNode.removeChild(el); }, 240);
}

function escapeNotifHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ── PATCHES (se aplican en load) ─────────────────────── */
window.addEventListener("load", function () {

  /* Interceptar showMessage → notif */
  var origShowMessage = window.showMessage;
  if (typeof origShowMessage === "function") {
    window.showMessage = function (element, message, type) {
      origShowMessage(element, message, type);
      if (message) showNotif(
        type === "success" ? "Operación exitosa" : type === "error" ? "Error" : "Aviso",
        message,
        { success: "success", error: "error", info: "info" }[type] || "info"
      );
    };
  }

  /* Parchear loadDashboard → volver al panel overview tras login */
  var origLoadDashboard = window.loadDashboard;
  if (typeof origLoadDashboard === "function") {
    window.loadDashboard = async function () {
      await origLoadDashboard();
      var session = typeof window.getSession === "function" ? window.getSession() : null;
      if (session) updateSidebarUser(session);
      if (typeof window.updateAuditAccess === "function") window.updateAuditAccess();
      /* Siempre arrancar en el panel de resumen */
      if (typeof window._showPanel === "function") window._showPanel("overview");
    };
  }

  /* Parchear updateAdminAccess */
  var origUpdateAdminAccess = window.updateAdminAccess;
  if (typeof origUpdateAdminAccess === "function") {
    window.updateAdminAccess = function () {
      origUpdateAdminAccess();
      if (typeof window.updateAuditAccess === "function") window.updateAuditAccess();
    };
  }

  /* Redibujar gráfica al cambiar tema */
  var themeToggle = document.getElementById("themeToggleBtn");
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      setTimeout(function () {
        if (typeof window.drawProvinceChart === "function") window.drawProvinceChart();
      }, 240);
    });
  }

  /* Actualizar sidebar si ya hay sesión (recarga de página) */
  var session = typeof window.getSession === "function" ? window.getSession() : null;
  if (session) {
    updateSidebarUser(session);
    if (typeof window.updateAuditAccess === "function") window.updateAuditAccess();
  }

});
