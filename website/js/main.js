/**
 * Skin Goddess Beauty Lounge — main.js
 *
 * Responsibilities:
 *   1. Booking URL configuration (single source of truth)
 *   2. Mobile navigation (open / close / overlay / focus trap)
 *   3. Service category filter
 *   4. FAQ accordion (ARIA-compliant)
 *   5. Mobile sticky booking bar (appears after hero scrolls away)
 *   6. Footer copyright year (auto-updates)
 *   7. Smooth scroll offset correction for fixed header
 *
 * No external dependencies. No build step required.
 * Vanilla ES6 — compatible with all modern browsers.
 */

'use strict';

/* ============================================================
   1. CONFIGURATION
   ============================================================

   ★ SET YOUR SETMORE URL HERE before going live.
   All booking buttons on the page reference this single value.

   How to find your Setmore booking URL:
     1. Log in to app.setmore.com
     2. Go to Settings → Booking Page
     3. Copy the "Online Booking URL"
     4. Paste it below (replace the placeholder string)
*/

const CONFIG = {
  setmoreUrl: '[SETMORE_BOOKING_URL]',
  // Example: 'https://book.setmore.com/scheduleappointment/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
};


/* ============================================================
   2. BOOKING LINKS — wire up all [data-booking-link] elements
   ============================================================ */

function initBookingLinks() {
  if (CONFIG.setmoreUrl === '[SETMORE_BOOKING_URL]') {
    // Development warning — remove in production
    console.warn(
      '[Skin Goddess] Setmore booking URL not configured. ' +
      'Open js/main.js and set CONFIG.setmoreUrl to your real Setmore link.'
    );
  }

  const bookingLinks = document.querySelectorAll('[data-booking-link]');

  bookingLinks.forEach(function (el) {
    if (el.tagName === 'A') {
      el.href   = CONFIG.setmoreUrl;
      el.target = '_blank';
      el.rel    = 'noopener noreferrer';
    }
  });
}


/* ============================================================
   3. MOBILE NAVIGATION
   ============================================================ */

function initMobileNav() {
  const toggle  = document.getElementById('nav-toggle');
  const nav     = document.getElementById('mobile-nav');
  const overlay = document.getElementById('nav-overlay');

  if (!toggle || !nav || !overlay) return;

  // Collect all focusable elements inside mobile nav
  function getFocusableElements() {
    return Array.from(
      nav.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
  }

  function openNav() {
    toggle.setAttribute('aria-expanded', 'true');
    nav.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-active');
    document.body.style.overflow = 'hidden';

    // Move focus to first nav link
    const focusable = getFocusableElements();
    if (focusable.length) {
      focusable[0].focus();
    }
  }

  function closeNav() {
    toggle.setAttribute('aria-expanded', 'false');
    nav.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('is-active');
    document.body.style.overflow = '';
    toggle.focus();
  }

  function isNavOpen() {
    return toggle.getAttribute('aria-expanded') === 'true';
  }

  // Toggle button click
  toggle.addEventListener('click', function () {
    isNavOpen() ? closeNav() : openNav();
  });

  // Close when overlay is clicked
  overlay.addEventListener('click', closeNav);

  // Close when a nav link is clicked (navigate to section)
  nav.querySelectorAll('.mobile-nav-link, [data-booking-link]').forEach(function (link) {
    link.addEventListener('click', closeNav);
  });

  // Close on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isNavOpen()) {
      closeNav();
    }
  });

  // Focus trap inside mobile nav when open
  nav.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    if (!isNavOpen()) return;

    const focusable = getFocusableElements();
    if (!focusable.length) return;

    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    if (e.shiftKey) {
      // Shift+Tab: if focus is on first element, wrap to last
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      // Tab: if focus is on last element, wrap to first
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Close nav if window resizes beyond mobile breakpoint
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (window.innerWidth >= 640 && isNavOpen()) {
        closeNav();
      }
    }, 100);
  });
}


/* ============================================================
   4. SERVICE FILTER
   ============================================================ */

function initServiceFilter() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  const serviceCards  = document.querySelectorAll('.service-card');

  if (!filterButtons.length || !serviceCards.length) return;

  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const selectedCategory = btn.getAttribute('data-filter');

      // Update button active state
      filterButtons.forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');

      // Show / hide cards
      serviceCards.forEach(function (card) {
        const cardCategory = card.getAttribute('data-category');

        if (selectedCategory === 'all' || cardCategory === selectedCategory) {
          card.removeAttribute('hidden');
        } else {
          card.setAttribute('hidden', '');
        }
      });
    });
  });

  // Set initial aria-pressed on "All" button
  const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
  if (allBtn) {
    allBtn.setAttribute('aria-pressed', 'true');
  }
}


/* ============================================================
   5. FAQ ACCORDION
   ============================================================ */

function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  if (!faqItems.length) return;

  faqItems.forEach(function (item) {
    const question = item.querySelector('.faq-question');
    const answerId = question ? question.getAttribute('aria-controls') : null;
    const answer   = answerId ? document.getElementById(answerId) : null;

    if (!question || !answer) return;

    question.addEventListener('click', function () {
      const isExpanded = question.getAttribute('aria-expanded') === 'true';

      if (isExpanded) {
        // Close this item
        question.setAttribute('aria-expanded', 'false');
        answer.hidden = true;
      } else {
        // Open this item
        question.setAttribute('aria-expanded', 'true');
        answer.hidden = false;
      }
    });

    // Keyboard: Space or Enter already trigger click on buttons.
    // No additional key handling needed for standard <button> elements.
  });
}


/* ============================================================
   6. MOBILE STICKY BOOKING BAR
   Shows after hero CTA scrolls out of viewport.
   Hides when the final booking section comes into view
   (because the permanent CTA is already visible).
   ============================================================ */

function initStickyBar() {
  const stickyBar = document.getElementById('mobile-sticky-bar');

  // Only runs on mobile — bar is CSS display:none at 640px+
  if (!stickyBar) return;

  // Reference elements: hide bar when these are in view
  const heroActions     = document.querySelector('.hero-actions');
  const bookingCta      = document.getElementById('book');

  function updateStickyBar() {
    // Don't run on desktop
    if (window.innerWidth >= 640) {
      stickyBar.classList.remove('is-visible');
      stickyBar.setAttribute('aria-hidden', 'true');
      stickyBar.querySelector('a').setAttribute('tabindex', '-1');
      return;
    }

    const heroActionsRect = heroActions ? heroActions.getBoundingClientRect() : null;
    const ctaRect         = bookingCta  ? bookingCta.getBoundingClientRect()  : null;

    // Hero CTA has scrolled above viewport
    const heroCtaGone  = heroActionsRect ? heroActionsRect.bottom < 0 : true;

    // Final booking section is in or below viewport (not yet passed)
    const ctaNotPassed = ctaRect ? ctaRect.top > 0 : true;

    if (heroCtaGone && ctaNotPassed) {
      stickyBar.classList.add('is-visible');
      stickyBar.setAttribute('aria-hidden', 'false');
      stickyBar.querySelector('a').setAttribute('tabindex', '0');
    } else {
      stickyBar.classList.remove('is-visible');
      stickyBar.setAttribute('aria-hidden', 'true');
      stickyBar.querySelector('a').setAttribute('tabindex', '-1');
    }
  }

  // Throttled scroll listener
  var scrollTicking = false;
  window.addEventListener('scroll', function () {
    if (!scrollTicking) {
      window.requestAnimationFrame(function () {
        updateStickyBar();
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }, { passive: true });

  // Also run on resize
  window.addEventListener('resize', updateStickyBar, { passive: true });

  // Initial state
  updateStickyBar();
}


/* ============================================================
   7. FOOTER YEAR — auto-updates so it never goes stale
   ============================================================ */

function initFooterYear() {
  var yearEl = document.getElementById('footer-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}


/* ============================================================
   8. SMOOTH SCROLL — corrects offset for sticky header
   ============================================================ */

function initSmoothScroll() {
  // CSS `scroll-margin-top` handles most cases already (see :target in CSS).
  // This handles <a href="#section"> clicks on browsers that don't
  // respect scroll-margin-top, and ensures the header height offset is correct.

  var HEADER_HEIGHT = 64; // matches --header-height in CSS
  var OFFSET_EXTRA  = 24; // a little breathing room

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var targetId = anchor.getAttribute('href');
      if (!targetId || targetId === '#') return;

      var target = document.querySelector(targetId);
      if (!target) return;

      // Let CSS scroll-behavior handle animation; just correct position.
      e.preventDefault();

      var targetTop = target.getBoundingClientRect().top + window.scrollY;
      var scrollTo  = targetTop - HEADER_HEIGHT - OFFSET_EXTRA;

      window.scrollTo({
        top:      Math.max(0, scrollTo),
        behavior: 'smooth',
      });

      // Update URL without triggering browser's native scroll
      history.pushState(null, '', targetId);

      // Move focus to the target section for accessibility
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
      target.focus({ preventScroll: true });
    });
  });
}


/* ============================================================
   9. HEADER SCROLL STATE — subtle shadow on scroll
   ============================================================ */

function initHeaderScroll() {
  var header = document.querySelector('.site-header');
  if (!header) return;

  var ticking = false;

  function update() {
    if (window.scrollY > 8) {
      header.style.boxShadow = '0 1px 8px rgba(28, 25, 22, 0.08)';
    } else {
      header.style.boxShadow = 'none';
    }
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
}


/* ============================================================
   INIT — run everything after DOM is ready
   ============================================================ */

function init() {
  initBookingLinks();
  initMobileNav();
  initServiceFilter();
  initFaqAccordion();
  initStickyBar();
  initFooterYear();
  initSmoothScroll();
  initHeaderScroll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // DOM already parsed (script deferred or at bottom of body)
  init();
}
