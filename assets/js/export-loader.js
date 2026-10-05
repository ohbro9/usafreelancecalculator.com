(function () {
  'use strict';

  var pending = null;
  var pdfSource = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
  var canvasSource = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

  function loadScript(source, isReady) {
    if (isReady()) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = source;
      script.async = true;
      script.onload = function () {
        if (isReady()) resolve();
        else reject(new Error('Export library unavailable: ' + source));
      };
      script.onerror = function () {
        script.remove();
        reject(new Error('Export library failed to load: ' + source));
      };
      document.head.appendChild(script);
    });
  }

  window.ensureUsafcExportLibraries = function () {
    if (typeof window.html2pdf === 'function' && typeof window.html2canvas === 'function') {
      return Promise.resolve();
    }
    if (pending) return pending;
    pending = loadScript(pdfSource, function () { return typeof window.html2pdf === 'function'; })
      .then(function () {
        return loadScript(canvasSource, function () { return typeof window.html2canvas === 'function'; });
      })
      .catch(function (error) {
        pending = null;
        throw error;
      });
    return pending;
  };
}());
