/* 7 IN 7 — main.js */

document.addEventListener('DOMContentLoaded', () => {

  /* --- Mobile nav toggle --- */
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      toggle.classList.toggle('open', isOpen);
      toggle.setAttribute('aria-expanded', isOpen);
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!toggle.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', false);
      }
    });

    // Close on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        toggle.classList.remove('open');
      });
    });
  }

  /* --- FAQ accordion --- */
  document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    if (!question) return;
    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // Close all others
      document.querySelectorAll('.faq-item.open').forEach(other => {
        if (other !== item) other.classList.remove('open');
      });
      item.classList.toggle('open', !isOpen);
    });
  });

  /* --- File input display --- */
  const fileInput = document.getElementById('script-file');
  const fileDisplay = document.querySelector('.file-name-display');
  if (fileInput && fileDisplay) {
    fileInput.addEventListener('change', () => {
      fileDisplay.textContent = fileInput.files.length
        ? fileInput.files[0].name
        : 'No file chosen';
    });
  }

  /* --- Submit button guard (non-functional) --- */
  const submitBtn = document.querySelector('.btn-submit');
  if (submitBtn) {
    submitBtn.addEventListener('click', (e) => {
      e.preventDefault();
    });
  }

  /* --- Active nav link --- */
  const normalizePath = (path) => path.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  const currentPath = normalizePath(window.location.pathname);
  document.querySelectorAll('.nav-links a').forEach(link => {
    if (normalizePath(link.pathname) === currentPath) {
      link.classList.add('active');
    }
  });

  /* --- RSS feed: copy link instead of opening raw XML --- */
  const rssLink = document.getElementById('rss-copy-link');
  if (rssLink && navigator.clipboard) {
    const rssLabel = rssLink.querySelector('.listen-badge-rss-label');
    const rssUrl = rssLink.href;
    const originalLabel = rssLabel.textContent;
    rssLink.addEventListener('click', (e) => {
      e.preventDefault();
      navigator.clipboard.writeText(rssUrl).then(() => {
        rssLabel.textContent = 'Copied!';
        rssLink.classList.add('copied');
        setTimeout(() => {
          rssLabel.textContent = originalLabel;
          rssLink.classList.remove('copied');
        }, 1800);
      }).catch(() => {
        window.open(rssUrl, '_blank', 'noopener');
      });
    });
  }

});
