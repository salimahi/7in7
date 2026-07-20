/* 7 IN 7 — Affiliate click capture and attribution */

(function () {
  const STORAGE_KEY = 'w7i7_aff_code';

  const params = new URLSearchParams(window.location.search);
  const urlAffCode = params.get('aff');

  if (urlAffCode) {
    localStorage.setItem(STORAGE_KEY, urlAffCode);

    const baseUrl = window.W7I7_CONFIG && window.W7I7_CONFIG.affiliateServiceUrl;
    if (baseUrl) {
      fetch(`${baseUrl}/clicks`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          refCode: urlAffCode,
          landingPage: window.location.pathname,
          referrer: document.referrer || '',
        }),
        keepalive: true,
      }).catch(() => {});
    }
  }

  function getStoredAffCode() {
    return localStorage.getItem(STORAGE_KEY) || '';
  }

  window.W7I7AffAttribution = { getStoredAffCode };
})();
