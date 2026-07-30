/* 7 IN 7 — shared site footer */

(function () {
  const footer = document.getElementById('site-footer');
  if (!footer) return;

  footer.innerHTML = `
    <div class="container footer-inner">
      <div class="footer-logo"><img src="7in7logos/Wordmark Cream n Gold.svg" alt="Write 7 in 7" class="footer-logo-img" /></div>
      <ul class="footer-nav">
        <li><a href="index.html">Home</a></li>
        <li><a href="about.html">About</a></li>
        <li><a href="prompts.html">Prompts</a></li>
        <li><a href="episodes.html">Podcast</a></li>
        <li><a href="casting/">Casting</a></li>
        <li><a href="rules.html">Rules</a></li>
        <li><a href="faq.html">FAQ</a></li>
        <li><a href="terms.html">Terms &amp; Conditions</a></li>
        <li><a href="privacy.html">Privacy Policy</a></li>
        <li><a href="register.html">Register</a></li>
      </ul>
      <div class="footer-powered">
        <span>⚙</span>
        Powered by <strong>Gopher the Gold Productions</strong>
      </div>
      <p class="footer-copy"><a href="mailto:contact@write7in7.com" style="color:inherit;">contact@write7in7.com</a> &nbsp;&middot;&nbsp; <a href="https://discord.gg/tGxDZydSep" target="_blank" rel="noopener" style="color:inherit;">Discord</a> &nbsp;&middot;&nbsp; <a href="https://www.instagram.com/write7in7" target="_blank" rel="noopener" style="color:inherit;">Instagram</a> &nbsp;&middot;&nbsp; &copy; 2026 Write 7 in 7. All rights reserved.</p>
    </div>
  `;
})();
