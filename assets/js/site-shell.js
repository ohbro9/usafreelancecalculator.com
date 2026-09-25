(function (window, document) {
  'use strict';

  var shell;
  var trigger;
  var menu;
  var backdrop;
  var closeButton;
  var shareButton;
  var initialized = false;
  var historyEntryActive = false;

  function findElements() {
    shell = document.querySelector('[data-site-shell]');
    trigger = document.querySelector('[data-shell-menu-trigger]');
    menu = document.querySelector('[data-shell-menu]');
    backdrop = document.querySelector('[data-shell-backdrop]');
    closeButton = document.querySelector('[data-shell-menu-close]');
    shareButton = document.querySelector('[data-shell-share]');
    return Boolean(shell && trigger && menu && backdrop);
  }

  function isMenuOpen() {
    return Boolean(menu && menu.getAttribute('data-shell-open') === 'true');
  }

  function setOpenState(isOpen) {
    if (!trigger || !menu || !backdrop) return;

    trigger.setAttribute('aria-expanded', String(isOpen));
    menu.setAttribute('data-shell-open', String(isOpen));
    menu.setAttribute('aria-hidden', String(!isOpen));
    backdrop.setAttribute('data-shell-open', String(isOpen));
    backdrop.setAttribute('aria-hidden', String(!isOpen));
    document.body.classList[isOpen ? 'add' : 'remove']('ufc-shell-menu-open');
  }

  function focusMenu() {
    if (!menu || typeof menu.querySelector !== 'function') return;
    var focusTarget = menu.querySelector(
      '[autofocus], a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusTarget && typeof focusTarget.focus === 'function') focusTarget.focus();
  }

  function openMenu() {
    if (!initialized) init();
    if (!shell || !trigger || !menu || !backdrop || isMenuOpen()) return;

    setOpenState(true);
    if (!historyEntryActive && window.history && typeof window.history.pushState === 'function') {
      window.history.pushState({ ufcShellMenu: true }, '', window.location.href);
      historyEntryActive = true;
    }
    focusMenu();
  }

  function closeMenu(options) {
    options = options || {};
    if (!initialized) init();
    if (!trigger || !menu || !backdrop) return;

    var wasOpen = isMenuOpen();
    setOpenState(false);

    if (historyEntryActive && options.skipHistory !== true) {
      historyEntryActive = false;
      if (window.history && typeof window.history.back === 'function') window.history.back();
    }

    if (wasOpen && options.restoreFocus && typeof trigger.focus === 'function') {
      trigger.focus();
    }
  }

  function normalizePath(pathname) {
    var path = pathname || '/';
    if (path.charAt(0) !== '/') path = '/' + path;
    path = path.replace(/\/{2,}/g, '/');
    if (path === '/index.html') return '/';
    if (path === '/app' || path === '/app/index.html') return '/app/';
    return path;
  }

  function syncActiveState() {
    var currentPath = normalizePath(window.location && window.location.pathname);
    var links = document.querySelectorAll('[data-shell-page]');

    for (var index = 0; index < links.length; index += 1) {
      var link = links[index];
      var linkPath = normalizePath(link.getAttribute('data-shell-page'));
      if (linkPath === currentPath) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    }
  }

  function copyWithTemporaryField(url) {
    if (!document.body || typeof document.createElement !== 'function') return;
    var field = document.createElement('textarea');
    field.value = url;
    field.setAttribute('readonly', '');
    field.setAttribute('aria-hidden', 'true');
    if (field.style) {
      field.style.position = 'fixed';
      field.style.opacity = '0';
    }
    document.body.appendChild(field);
    if (typeof field.select === 'function') field.select();
    if (typeof document.execCommand === 'function') document.execCommand('copy');
    if (typeof field.remove === 'function') field.remove();
  }

  function shareCurrentPage() {
    var navigator = window.navigator || {};
    var url = window.location.href;
    var result;

    try {
      if (typeof navigator.share === 'function') {
        result = navigator.share({ title: document.title, url: url });
      } else if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        result = navigator.clipboard.writeText(url);
      } else {
        copyWithTemporaryField(url);
      }
    } catch (error) {
      return;
    }

    if (result && typeof result.catch === 'function') result.catch(function () {});
  }

  function handleKeydown(event) {
    if (event.key === 'Escape' && isMenuOpen()) {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
    }
  }

  function handlePopState() {
    if (!isMenuOpen()) {
      historyEntryActive = false;
      return;
    }
    historyEntryActive = false;
    closeMenu({ restoreFocus: true, skipHistory: true });
  }

  function init() {
    if (initialized) return;
    if (!findElements()) return;

    initialized = true;
    trigger.addEventListener('click', openMenu);
    backdrop.addEventListener('click', function () {
      closeMenu({ restoreFocus: true });
    });
    if (closeButton) {
      closeButton.addEventListener('click', function () {
        closeMenu({ restoreFocus: true });
      });
    }
    if (shareButton) {
      shareButton.addEventListener('click', function (event) {
        event.preventDefault();
        shareCurrentPage();
      });
    }
    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('popstate', handlePopState);
    setOpenState(false);
    syncActiveState();
  }

  window.UFCSiteShell = {
    openMenu: openMenu,
    closeMenu: closeMenu,
    syncActiveState: syncActiveState,
    init: init
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(window, document);
