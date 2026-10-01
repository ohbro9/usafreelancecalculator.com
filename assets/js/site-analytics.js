(function () {
  'use strict';

  // Website traffic only: exclude previews and the bundled Android app.
  var location = window.location;
  if (location.protocol !== 'https:' ||
      (location.hostname !== 'usafreelancecalculator.com' &&
       location.hostname !== 'www.usafreelancecalculator.com')) return;
  if (window.__usafcAnalyticsLoaded) return;
  window.__usafcAnalyticsLoaded = true;

  function publicPageUrl(value) {
    try {
      var url = new URL(value);
      return /^(https?:)$/.test(url.protocol) ? url.origin + url.pathname : '';
    } catch (error) {
      return '';
    }
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', 'G-K1B2H6ENHK', {
    send_page_view: true,
    // Query strings and fragments may contain private calculator state.
    page_location: location.origin + location.pathname,
    page_referrer: publicPageUrl(document.referrer),
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-K1B2H6ENHK';
  document.head.appendChild(script);
}());
