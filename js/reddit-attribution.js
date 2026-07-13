/* 7 IN 7 — Reddit click-ID capture and Stripe checkout attribution */

(function () {
  const STORAGE_KEY = 'w7i7_rdt_cid';

  const params = new URLSearchParams(window.location.search);
  const urlClickId = params.get('rdt_cid');
  if (urlClickId) {
    localStorage.setItem(STORAGE_KEY, urlClickId);
  }

  function getStoredClickId() {
    return localStorage.getItem(STORAGE_KEY) || '';
  }

  window.W7I7Attribution = { getStoredClickId };

  document.addEventListener('DOMContentLoaded', () => {
    const clickId = getStoredClickId();
    if (!clickId) return;

    document.querySelectorAll('stripe-buy-button').forEach(el => {
      el.setAttribute('client-reference-id', clickId);
    });

    const paymentLink = document.getElementById('late-entry-payment-link');
    if (paymentLink) {
      const url = new URL(paymentLink.href);
      url.searchParams.set('client_reference_id', clickId);
      paymentLink.href = url.toString();
    }
  });
})();
