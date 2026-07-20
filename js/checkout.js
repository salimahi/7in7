/* 7 IN 7 — server-side Checkout Session creation for the plain checkout buttons */

(function () {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-checkout-product]');
    if (!button) return;

    const baseUrl = window.W7I7_CONFIG && window.W7I7_CONFIG.affiliateServiceUrl;
    if (!baseUrl) return;

    const productType = button.getAttribute('data-checkout-product');
    const affCode = window.W7I7AffAttribution ? window.W7I7AffAttribution.getStoredAffCode() : '';
    const rdtCid = window.W7I7Attribution ? window.W7I7Attribution.getStoredClickId() : '';

    button.disabled = true;

    try {
      const res = await fetch(`${baseUrl}/checkout-sessions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productType, affCode, rdtCid }),
      });

      if (!res.ok) throw new Error(`checkout-sessions responded ${res.status}`);

      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error('[checkout] failed to start checkout:', err);
      button.disabled = false;
      window.alert('Something went wrong starting checkout. Please try again in a moment.');
    }
  });

  function showBanner(status) {
    const container = document.querySelector('.page-header-content');
    if (!container) return;

    const banner = document.createElement('div');
    banner.className = `checkout-banner checkout-banner-${status}`;
    banner.textContent = status === 'success'
      ? 'Thanks! Your payment was received.'
      : 'Checkout was cancelled — no charge was made.';
    container.appendChild(banner);
  }

  const params = new URLSearchParams(window.location.search);
  const checkoutStatus = params.get('checkout');
  if (checkoutStatus === 'success' || checkoutStatus === 'cancelled') {
    document.addEventListener('DOMContentLoaded', () => showBanner(checkoutStatus));
  }
})();
