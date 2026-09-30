/**
 * Skin Goddess Beauty Lounge — main.js
 *
 * Reads from CONTENT (defined in content.js) and:
 *   1. Renders all dynamic sections (services, products, promos, testimonials,
 *      updates, about, hero, contact, footer, FAQ)
 *   2. Wires all booking CTAs to CONTENT.business.bookingUrl
 *   3. Handles mobile navigation
 *   4. Handles service filter
 *   5. Handles FAQ accordion
 *   6. Handles mobile sticky bar
 *   7. Handles header shadow on scroll
 *   8. Handles smooth scroll with header offset
 *   9. Auto-sets footer year
 *
 * ARCHITECTURE:
 *   content.js  →  main.js (renders DOM)  →  index.html (mount points)  →  styles.css
 *
 * Dependencies: content.js must be loaded before this file.
 */

'use strict';

/* ============================================================
   GUARD — ensure content.js is loaded
============================================================ */
if (typeof CONTENT === 'undefined') {
  console.error('[Skin Goddess] content.js must be loaded before main.js.');
}

const C = typeof CONTENT !== 'undefined' ? CONTENT : {};
const BIZ = C.business || {};


/* ============================================================
   HELPERS
============================================================ */

/**
 * Build an image element or a styled placeholder div.
 * If the image path is non-empty and doesn't contain '[',
 * renders a real <img>. Otherwise renders a placeholder div.
 *
 * @param {string} src        — image path
 * @param {string} alt        — alt text
 * @param {string} modClass   — img-placeholder--X modifier class
 * @param {string} [label]    — placeholder label text
 * @returns {string} HTML string
 */
function imageOrPlaceholder(src, alt, modClass, label) {
  if (src && !src.includes('[')) {
    return `<img src="${escHtml(src)}" alt="${escHtml(alt)}" loading="lazy" />`;
  }
  const text = label || alt || 'Image';
  return `<div class="img-placeholder ${escHtml(modClass)}" aria-hidden="true"><span>${escHtml(text)}</span></div>`;
}

/**
 * Escape HTML special characters to prevent XSS.
 * Content comes from content.js (developer-controlled), but
 * we sanitize anyway as a safe habit.
 */
function escHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format an ISO date string 'YYYY-MM-DD' into a human-readable date.
 * Falls back gracefully if date is a placeholder.
 */
function formatDate(isoString) {
  if (!isoString || isoString.includes('[')) return isoString || '';
  const d = new Date(isoString + 'T00:00:00');
  if (isNaN(d)) return isoString;
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * Mount rendered HTML into a container element.
 * No-ops silently if container not found.
 */
function mount(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

/**
 * Show or hide a section element based on a boolean.
 */
function toggleSection(id, visible) {
  const el = document.getElementById(id);
  if (!el) return;
  if (visible) {
    el.removeAttribute('hidden');
  } else {
    el.setAttribute('hidden', '');
  }
}

/**
 * Set text content of every element matching a selector.
 */
function setText(selector, value) {
  document.querySelectorAll(selector).forEach(function (el) {
    el.textContent = value || '';
  });
}

/**
 * Set the href of every element matching a selector.
 */
function setHref(selector, value) {
  document.querySelectorAll(selector).forEach(function (el) {
    if (el.tagName === 'A') el.href = value || '#';
  });
}

function renderMetadata() {
  var title = BIZ.seoTitle || BIZ.name;
  var description = BIZ.seoDescription || BIZ.description;
  if (title && !title.includes('[')) {
    document.title = title;
    document.querySelectorAll('meta[property="og:title"], meta[name="twitter:title"]').forEach(function (meta) {
      meta.content = title;
    });
  }
  if (description && !description.includes('[')) {
    var descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) descriptionMeta.content = description;
    document.querySelectorAll('meta[property="og:description"], meta[name="twitter:description"]').forEach(function (meta) {
      meta.content = description;
    });
  }
}


/* ============================================================
   1. BOOKING LINKS
   Wires all [data-booking-link] elements to the booking URL.
============================================================ */

function initBookingLinks() {
  var url = BIZ.bookingUrl || '';
  var bookingConfigured = url && !url.includes('[');

  if (!url || url.includes('[')) {
    console.warn(
      '[Skin Goddess] Booking URL not configured. ' +
      'Open js/content.js and set BUSINESS.bookingUrl.'
    );
  }

  document.querySelectorAll('[data-booking-link]').forEach(function (el) {
    if (el.tagName === 'A') {
      if (!bookingConfigured) {
        el.href = BIZ.mapUrl && !BIZ.mapUrl.includes('[') ? BIZ.mapUrl : '#contact';
        el.target = BIZ.mapUrl && !BIZ.mapUrl.includes('[') ? '_blank' : '_self';
        el.textContent = BIZ.mapUrl && !BIZ.mapUrl.includes('[') ? 'Get Directions' : 'Contact the Lounge';
        el.setAttribute('aria-label', 'Get directions to Skin Goddess Beauty Lounge');
      } else {
        el.href = url;
        el.target = '_blank';
      }
      el.rel    = 'noopener noreferrer';
    }
  });

  if (!bookingConfigured) {
    var ctaHeading = document.getElementById('cta-heading');
    var ctaBody = document.querySelector('.cta-body');
    if (ctaHeading) ctaHeading.textContent = 'Plan Your Visit';
    if (ctaBody) ctaBody.textContent = 'Find the Skin Goddess Lancaster Branch in General Trias, Cavite.';
    var bookingGroup = document.getElementById('contact-booking-group');
    if (bookingGroup) bookingGroup.hidden = true;
  }
}


/* ============================================================
   2. HERO SECTION
============================================================ */

function renderHero() {
  var hero = C.hero || {};
  var biz  = BIZ;

  // Headline
  var headlineEl = document.getElementById('hero-heading');
  if (headlineEl) headlineEl.textContent = hero.headline || biz.name || 'Skin Goddess Beauty Lounge';

  // Subheadline
  var bodyEl = document.querySelector('.hero-body');
  if (bodyEl) bodyEl.textContent = hero.subheadline || biz.description || '';

  // Hero image
  var imageWrap = document.querySelector('.hero-image-wrap');
  if (imageWrap) {
    if (hero.image && !hero.image.includes('[')) {
      imageWrap.innerHTML = `<img
        src="${escHtml(hero.image)}"
        alt="${escHtml(hero.imageAlt || 'Skin Goddess Beauty Lounge')}"
        loading="eager"
        fetchpriority="high"
      />`;
    }
    // If no image, placeholder div from HTML stays in place
  }

  // Trust bar items
  var trustItems = (hero.trustItems || []).filter(function (item) {
    return item.text && !item.text.includes('[');
  });
  var trustBar   = document.getElementById('hero-trust-bar');
  if (trustBar && trustItems.length) {
    var icons = {
      clock: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.5v4l2.5 1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
      location: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6c0 3.75 4.5 8.5 4.5 8.5s4.5-4.75 4.5-8.5c0-2.485-2.015-4.5-4.5-4.5z" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="6" r="1.5" stroke="currentColor" stroke-width="1.5"/></svg>`,
      check: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8l3.5 3.5L13 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    };
    var html = trustItems.map(function (item, i) {
      var icon = icons[item.icon] || '';
      var divider = i < trustItems.length - 1
        ? '<span class="trust-divider" aria-hidden="true">·</span>'
        : '';
      return `<span class="trust-item">${icon}${escHtml(item.text)}</span>${divider}`;
    }).join('');
    trustBar.innerHTML = html;
  }
}


/* ============================================================
   3. WHAT'S NEW — UPDATES STRIP
============================================================ */

function renderUpdates() {
  var updates = (C.updates || []).filter(function (u) { return u.active; });
  var count   = C.updatesVisibleCount || 2;
  var visible = updates.slice(0, count);

  // Section visibility
  toggleSection('updates-section', visible.length > 0);
  if (!visible.length) return;

  var html = visible.map(function (u) {
    var linkHtml = u.link
      ? `<a href="${escHtml(u.link)}" class="update-link">${escHtml(u.linkText || 'Learn More')} →</a>`
      : '';
    return `
      <div class="update-item">
        <span class="update-label">${escHtml(u.label)}</span>
        <h3 class="update-title">${escHtml(u.title)}</h3>
        <p class="update-desc">${escHtml(u.description)}</p>
        ${linkHtml}
      </div>`;
  }).join('');

  mount('updates-list', html);
}


/* ============================================================
   4. FEATURED SERVICES (homepage strip — featured:true only)
============================================================ */

function renderFeaturedServices() {
  var featured = (C.services || []).filter(function (s) {
    return s.visible && s.featured;
  });

  toggleSection('featured-services-section', featured.length > 0);
  if (!featured.length) return;

  var html = featured.map(function (s) {
    var img = imageOrPlaceholder(
      s.image, s.name + ' service photo',
      'img-placeholder--service', 'Service Photo · 4:3'
    );
    var meta = [s.price, s.duration].some(function (value) { return value && !value.includes('['); });
    return `
      <article class="featured-service-card" aria-labelledby="fs-${escHtml(s.id)}">
        <div class="featured-service-image">${img}</div>
        <div class="featured-service-body">
          <div class="featured-service-category">${escHtml(s.category)}</div>
          <h3 id="fs-${escHtml(s.id)}" class="featured-service-name">${escHtml(s.name)}</h3>
          <p class="featured-service-desc">${escHtml(s.description)}</p>
          ${meta ? `<div class="featured-service-meta">
            ${s.price && !s.price.includes('[') ? `<span class="service-price">${escHtml(s.price)}</span>` : ''}
            ${s.duration && !s.duration.includes('[') ? `<span class="service-duration">${escHtml(s.duration)}</span>` : ''}
          </div>` : ''}
          <a href="${escHtml(BIZ.bookingUrl || '#book')}"
             class="btn btn-primary btn-sm"
             data-booking-link
             aria-label="Book ${escHtml(s.name)}">
            Book This Service
          </a>
        </div>
      </article>`;
  }).join('');

  mount('featured-services-list', html);
}


/* ============================================================
   5. SERVICES — full filterable grid
============================================================ */

function renderServices() {
  var services    = (C.services || []).filter(function (s) { return s.visible; });
  var categories  = C.filterCategories || [];

  // Filter buttons
  var filterHtml = `<button class="filter-btn active" data-filter="all" aria-pressed="true">All</button>`;
  filterHtml += categories.map(function (cat) {
    return `<button class="filter-btn" data-filter="${escHtml(cat)}" aria-pressed="false">${escHtml(cat)}</button>`;
  }).join('');
  mount('service-filter-bar', filterHtml);

  // Service cards
  if (!services.length) {
    mount('services-grid', `<p class="services-empty">Services coming soon. <a href="${escHtml(BIZ.bookingUrl || '#book')}" data-booking-link>Contact us to enquire.</a></p>`);
    return;
  }

  var html = services.map(function (s) {
    var img = imageOrPlaceholder(
      s.image, s.name + ' service photo',
      'img-placeholder--service', 'Service Photo · 4:3'
    );
    var meta = [s.price, s.duration].some(function (value) { return value && !value.includes('['); });
    return `
      <article class="service-card" data-category="${escHtml(s.category)}" aria-labelledby="svc-${escHtml(s.id)}">
        ${s.image ? `<div class="service-card-image">${img}</div>` : ''}
        <div class="service-card-body">
          <h3 id="svc-${escHtml(s.id)}" class="service-name">${escHtml(s.name)}</h3>
          <p class="service-desc">${escHtml(s.description)}</p>
          ${meta ? `<div class="service-meta">
            ${s.price && !s.price.includes('[') ? `<span class="service-price">${escHtml(s.price)}</span>` : ''}
            ${s.duration && !s.duration.includes('[') ? `<span class="service-duration">${escHtml(s.duration)}</span>` : ''}
          </div>` : ''}
          <a href="${escHtml(BIZ.bookingUrl || '#book')}"
             class="btn btn-outline btn-sm"
             data-booking-link
             aria-label="Book ${escHtml(s.name)}">
            Book This Service
          </a>
        </div>
      </article>`;
  }).join('');

  mount('services-grid', html);

  // Re-init filter after DOM update
  initServiceFilter();
}


/* ============================================================
   6. FEATURED PROMOTION
============================================================ */

function renderPromo() {
  var promos   = C.promotions || [];
  var featured = promos.find(function (p) { return p.active && p.featured; });

  toggleSection('promos-section', !!featured);
  if (!featured) return;

  var img = imageOrPlaceholder(
    featured.image, featured.title + ' promotion',
    'img-placeholder--promo', 'Promo Image · 4:3'
  );

  var validText = '';
  if (featured.validUntil && !featured.validUntil.includes('[')) {
    validText = `<p class="promo-validity">Valid until <time datetime="${escHtml(featured.validUntil)}">${formatDate(featured.validUntil)}</time></p>`;
  } else if (featured.validUntil) {
    validText = `<p class="promo-validity">Valid until [DATE]</p>`;
  }

  var noteHtml = featured.note
    ? `<p class="promo-note">${escHtml(featured.note)}</p>`
    : '';

  mount('promo-card', `
    <div class="promo-image-col">${img}</div>
    <div class="promo-content-col">
      <div class="promo-eyebrow">Limited Offer</div>
      <h2 id="promo-heading" class="promo-title">${escHtml(featured.title)}</h2>
      <p class="promo-desc">${escHtml(featured.description)}</p>
      <div class="promo-pricing">
        <span class="promo-price">${escHtml(featured.price)}</span>
        ${featured.originalPrice && !featured.originalPrice.includes('[') ? `<span class="promo-regular">Regular ${escHtml(featured.originalPrice)}</span>` : ''}
      </div>
      ${validText}
      <a href="${escHtml(BIZ.bookingUrl || '#book')}"
         class="btn btn-primary"
         data-booking-link
         aria-label="Book ${escHtml(featured.title)}">
        Book This Promo
      </a>
      ${noteHtml}
    </div>
  `);
}


/* ============================================================
   7. PRODUCTS
============================================================ */

function renderProducts() {
  var products = (C.products || []).filter(function (p) { return p.available; });

  if (!products.length) {
    toggleSection('products-section', false);
    document.querySelectorAll('a[href="#products"]').forEach(function (link) { link.hidden = true; });
    return;
  }

  toggleSection('products-section', true);

  var html = products.map(function (p) {
    var img = imageOrPlaceholder(
      p.image, p.name,
      'img-placeholder--product', 'Product Photo · 1:1'
    );
    return `
      <article class="product-card" aria-labelledby="prod-${escHtml(p.id)}">
        <div class="product-card-image">${img}</div>
        <div class="product-card-body">
          <h3 id="prod-${escHtml(p.id)}" class="product-name">${escHtml(p.name)}</h3>
          <p class="product-desc">${escHtml(p.description)}</p>
          <div class="product-footer">
            <span class="product-price">${escHtml(p.price)}</span>
            <a href="#contact"
               class="btn btn-outline btn-sm"
               aria-label="Inquire about ${escHtml(p.name)}">
              Inquire
            </a>
          </div>
        </div>
      </article>`;
  }).join('');

  mount('products-grid', html);
}


/* ============================================================
   8. TESTIMONIALS
============================================================ */

function renderTestimonials() {
  var testimonials = C.testimonials || [];

  if (!testimonials.length) {
    toggleSection('testimonials', false);

    // Hide social proof bar Instagram button if no handle yet
    var handle = BIZ.instagramHandle || '';
    if (!handle || handle.includes('[')) {
      toggleSection('social-proof-bar', false);
    }
    return;
  }

  var html = testimonials.map(function (t, i) {
    var avatarHtml;
    if (t.image && !t.image.includes('[')) {
      avatarHtml = `<div class="testimonial-avatar" aria-hidden="true">
        <img src="${escHtml(t.image)}" alt="${escHtml(t.name)}" loading="lazy" />
      </div>`;
    } else {
      avatarHtml = `<div class="testimonial-avatar testimonial-avatar--initials" aria-hidden="true">
        <span>${escHtml(t.name ? t.name.charAt(0).toUpperCase() : '?')}</span>
      </div>`;
    }

    var id = 'testi-' + (i + 1) + '-author';
    return `
      <blockquote class="testimonial-card" aria-labelledby="${id}">
        <div class="testimonial-stars" aria-label="5 out of 5 stars" role="img">
          <span aria-hidden="true">★★★★★</span>
        </div>
        <p class="testimonial-text">"${escHtml(t.quote)}"</p>
        <footer class="testimonial-footer">
          ${avatarHtml}
          <cite id="${id}" class="testimonial-author">
            <span class="author-name">${escHtml(t.name)}</span>
            <span class="author-service">${escHtml(t.service)}</span>
          </cite>
        </footer>
      </blockquote>`;
  }).join('');

  mount('testimonials-grid', html);
}


/* ============================================================
   9. ABOUT SECTION
============================================================ */

function renderAbout() {
  var about = C.about || {};

  // Image
  var imageWrap = document.getElementById('about-image-wrap');
  if (imageWrap && about.image && !about.image.includes('[')) {
    imageWrap.innerHTML = `<img
      src="${escHtml(about.image)}"
      alt="${escHtml(about.imageAlt || 'Skin Goddess Beauty Lounge')}"
      loading="lazy"
    />`;
  } else {
    var imageCol = document.querySelector('.about-image-col');
    if (imageCol) imageCol.hidden = true;
  }

  // Intro
  var introEl = document.getElementById('about-intro');
  if (introEl) introEl.textContent = about.intro || '';

  // Body
  var bodyEl = document.getElementById('about-body');
  if (bodyEl) {
    if (about.body && !about.body.includes('[')) {
      bodyEl.textContent = about.body;
      bodyEl.removeAttribute('hidden');
    } else {
      bodyEl.setAttribute('hidden', '');
    }
  }

  // Credentials
  var credsWrap = document.getElementById('about-credentials');
  var creds     = (about.credentials || []).filter(function (c) {
    return c && !c.includes('[');
  });

  if (credsWrap) {
    if (creds.length) {
      var html = creds.map(function (c) {
        return `<div class="credential-item">
          <span class="credential-icon" aria-hidden="true">✓</span>
          ${escHtml(c)}
        </div>`;
      }).join('');
      credsWrap.innerHTML = html;
      credsWrap.removeAttribute('hidden');
    } else {
      credsWrap.setAttribute('hidden', '');
    }
  }
}


/* ============================================================
   10. CONTACT SECTION
============================================================ */

function renderContact() {
  var biz = BIZ;

  // Address
  var addressEl = document.getElementById('contact-address');
  if (addressEl && biz.address && !biz.address.includes('[')) {
    addressEl.innerHTML = escHtml(biz.address).replace(/,\s*/g, ',<br>');
  }

  // Map links
  document.querySelectorAll('[data-map-link]').forEach(function (el) {
    if (el.tagName === 'A' && biz.mapUrl && !biz.mapUrl.includes('[')) {
      el.href = biz.mapUrl;
    }
  });

  // Map embed
  var mapWrap = document.getElementById('map-embed-wrap');
  if (mapWrap && biz.mapEmbed) {
    mapWrap.innerHTML = `<iframe
      src="${escHtml(biz.mapEmbed)}"
      width="100%"
      height="100%"
      style="border:0;display:block;"
      allowfullscreen=""
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"
      title="Skin Goddess Beauty Lounge on Google Maps">
    </iframe>`;
    mapWrap.classList.add('has-embed');
  }

  // Phone
  var phoneLink = document.getElementById('contact-phone');
  if (phoneLink && biz.phone && !biz.phone.includes('[')) {
    phoneLink.textContent = biz.phone;
    phoneLink.href = 'tel:' + biz.phone.replace(/\s/g, '');
  }

  // Facebook
  var fbLink = document.getElementById('contact-facebook');
  if (fbLink && biz.facebook && !biz.facebook.includes('[')) {
    fbLink.href = biz.facebook;
    fbLink.textContent = 'Facebook';
  }

  // Instagram
  var igLink = document.getElementById('contact-instagram');
  if (igLink && biz.instagram && !biz.instagram.includes('[')) {
    igLink.href = biz.instagram;
    igLink.textContent = 'Instagram — ' + (biz.instagramHandle || '');
  }

  // Hours
  var hoursList = document.getElementById('hours-list');
  if (hoursList && biz.hours && biz.hours.length) {
    var hours = biz.hours.filter(function (h) {
      return h.days && h.time && !h.days.includes('[') && !h.time.includes('[');
    });
    hoursList.innerHTML = hours.map(function (h) {
      return `<div class="hours-row">
        <dt>${escHtml(h.days)}</dt>
        <dd>${escHtml(h.time)}</dd>
      </div>`;
    }).join('');
    var hoursGroup = document.getElementById('contact-hours-group');
    if (hoursGroup) hoursGroup.hidden = !hours.length;
  }

  ['contact-phone', 'contact-facebook', 'contact-instagram'].forEach(function (id) {
    var link = document.getElementById(id);
    if (link && (!link.href || link.getAttribute('href') === '#' || link.getAttribute('href').includes('['))) {
      link.closest('li').hidden = true;
    }
  });
  var contactLinks = document.getElementById('contact-links-group');
  if (contactLinks && !contactLinks.querySelector('li:not([hidden])')) contactLinks.hidden = true;
}


/* ============================================================
   11. FOOTER
============================================================ */

function renderFooter() {
  var biz = BIZ;

  // Tagline
  var taglineEl = document.querySelector('.footer-tagline');
  if (taglineEl && biz.tagline && !biz.tagline.includes('[')) {
    taglineEl.textContent = biz.tagline;
  }

  // Social links
  var fbFooter = document.getElementById('footer-facebook');
  if (fbFooter && biz.facebook && !biz.facebook.includes('[')) {
    fbFooter.href = biz.facebook;
  } else if (fbFooter) {
    fbFooter.hidden = true;
  }

  var igFooter = document.getElementById('footer-instagram');
  if (igFooter && biz.instagram && !biz.instagram.includes('[')) {
    igFooter.href = biz.instagram;
  } else if (igFooter) {
    igFooter.hidden = true;
  }
  var footerSocial = document.querySelector('.footer-social');
  if (footerSocial && !footerSocial.querySelector('a:not([hidden])')) footerSocial.hidden = true;

  var credits = document.querySelector('.footer-credits');
  if (credits && credits.textContent.includes('[')) credits.hidden = true;

  // Year
  var yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}


/* ============================================================
   12. SOCIAL PROOF BAR
============================================================ */

function renderSocialProofBar() {
  var biz    = BIZ;
  var handle = biz.instagramHandle || '';
  var igUrl  = biz.instagram || '';

  var barEl  = document.getElementById('social-proof-bar');
  if (!barEl) return;

  if (!handle || handle.includes('[') || !igUrl || igUrl.includes('[')) {
    barEl.setAttribute('hidden', '');
    return;
  }

  barEl.removeAttribute('hidden');
  var btnEl = document.getElementById('instagram-follow-btn');
  if (btnEl) {
    btnEl.textContent = handle;
    btnEl.href = igUrl;
  }
}


/* ============================================================
   13. FAQ
============================================================ */

function renderFaq() {
  var faqs = (C.faq || []).filter(function (f) {
    return f.question && f.answer && !f.question.includes('[') && !f.answer.includes('[');
  });
  if (!faqs.length) {
    toggleSection('faq-section', false);
    return;
  }
  toggleSection('faq-section', true);

  var html = faqs.map(function (f, i) {
    var idx    = i + 1;
    var ansId  = 'faq-' + idx + '-answer';
    return `
      <div class="faq-item">
        <dt>
          <button
            class="faq-question"
            aria-expanded="false"
            aria-controls="${ansId}">
            ${escHtml(f.question)}
            <svg class="faq-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </dt>
        <dd id="${ansId}" class="faq-answer" hidden>
          <p>${escHtml(f.answer)}</p>
        </dd>
      </div>`;
  }).join('');

  mount('faq-list', html);
  // Re-init accordion after DOM update
  initFaqAccordion();
}


/* ============================================================
   14. MOBILE NAVIGATION
============================================================ */

function initMobileNav() {
  var toggle  = document.getElementById('nav-toggle');
  var nav     = document.getElementById('mobile-nav');
  var overlay = document.getElementById('nav-overlay');

  if (!toggle || !nav || !overlay) return;

  function getFocusable() {
    return Array.from(nav.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ));
  }

  function openNav() {
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close navigation menu');
    nav.setAttribute('aria-hidden', 'false');
    overlay.classList.add('is-active');
    document.body.style.overflow = 'hidden';
    var focusable = getFocusable();
    if (focusable.length) focusable[0].focus();
  }

  function closeNav() {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
    nav.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('is-active');
    document.body.style.overflow = '';
    toggle.focus();
  }

  function isOpen() {
    return toggle.getAttribute('aria-expanded') === 'true';
  }

  toggle.addEventListener('click', function () {
    isOpen() ? closeNav() : openNav();
  });

  overlay.addEventListener('click', closeNav);

  nav.querySelectorAll('.mobile-nav-link, [data-booking-link]').forEach(function (link) {
    link.addEventListener('click', closeNav);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) closeNav();
  });

  nav.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || !isOpen()) return;
    var focusable = getFocusable();
    if (!focusable.length) return;
    var first = focusable[0];
    var last  = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (window.innerWidth >= 640 && isOpen()) closeNav();
    }, 100);
  });
}


/* ============================================================
   15. SERVICE FILTER
============================================================ */

function initServiceFilter() {
  var filterButtons = document.querySelectorAll('.filter-btn');
  var serviceCards  = document.querySelectorAll('.service-card');

  if (!filterButtons.length || !serviceCards.length) return;

  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var selected = btn.getAttribute('data-filter');

      filterButtons.forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');

      serviceCards.forEach(function (card) {
        var cat = card.getAttribute('data-category');
        if (selected === 'all' || cat === selected) {
          card.removeAttribute('hidden');
        } else {
          card.setAttribute('hidden', '');
        }
      });
    });
  });
}


/* ============================================================
   16. FAQ ACCORDION
============================================================ */

function initFaqAccordion() {
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var question = item.querySelector('.faq-question');
    var answerId = question ? question.getAttribute('aria-controls') : null;
    var answer   = answerId ? document.getElementById(answerId) : null;

    if (!question || !answer) return;

    // Remove old listener by replacing the node (clean re-init after re-render)
    var newQuestion = question.cloneNode(true);
    question.parentNode.replaceChild(newQuestion, question);

    newQuestion.addEventListener('click', function () {
      var expanded = newQuestion.getAttribute('aria-expanded') === 'true';
      newQuestion.setAttribute('aria-expanded', String(!expanded));
      answer.hidden = expanded;
    });
  });
}


/* ============================================================
   17. MOBILE STICKY BAR
============================================================ */

function initStickyBar() {
  var bar         = document.getElementById('mobile-sticky-bar');
  var heroActions = document.querySelector('.hero-actions');
  var bookSection = document.getElementById('book');

  if (!bar) return;

  function update() {
    if (window.innerWidth >= 640) {
      bar.classList.remove('is-visible');
      bar.setAttribute('aria-hidden', 'true');
      var link = bar.querySelector('a');
      if (link) link.setAttribute('tabindex', '-1');
      return;
    }

    var heroGone   = heroActions ? heroActions.getBoundingClientRect().bottom < 0 : true;
    var ctaNotYet  = bookSection  ? bookSection.getBoundingClientRect().top > 0   : true;

    if (heroGone && ctaNotYet) {
      bar.classList.add('is-visible');
      bar.setAttribute('aria-hidden', 'false');
      var link = bar.querySelector('a');
      if (link) link.setAttribute('tabindex', '0');
    } else {
      bar.classList.remove('is-visible');
      bar.setAttribute('aria-hidden', 'true');
      var link = bar.querySelector('a');
      if (link) link.setAttribute('tabindex', '-1');
    }
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(function () { update(); ticking = false; });
      ticking = true;
    }
  }, { passive: true });

  window.addEventListener('resize', update, { passive: true });
  update();
}


/* ============================================================
   18. HEADER SCROLL SHADOW
============================================================ */

function initHeaderScroll() {
  var header  = document.querySelector('.site-header');
  if (!header) return;
  var ticking = false;

  window.addEventListener('scroll', function () {
    if (!ticking) {
      window.requestAnimationFrame(function () {
        header.style.boxShadow = window.scrollY > 8
          ? '0 1px 8px rgba(30, 21, 23, 0.08)'
          : 'none';
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}


/* ============================================================
   19. SMOOTH SCROLL
============================================================ */

function initSmoothScroll() {
  var HEADER_HEIGHT = 64;
  var OFFSET_EXTRA  = 24;

  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var targetId = anchor.getAttribute('href');
      if (!targetId || targetId === '#') return;
      var target = document.querySelector(targetId);
      if (!target) return;

      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.scrollY
                - HEADER_HEIGHT - OFFSET_EXTRA;

      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      history.pushState(null, '', targetId);

      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });
}


/* ============================================================
   INIT — run in dependency order
============================================================ */

function init() {
  renderMetadata();
  // 1. Render content into DOM (order matters — booking links run after)
  renderHero();
  renderUpdates();
  renderFeaturedServices();
  renderServices();     // calls initServiceFilter() internally
  renderPromo();
  renderProducts();
  renderTestimonials();
  renderAbout();
  renderContact();
  renderFaq();          // calls initFaqAccordion() internally
  renderFooter();
  renderSocialProofBar();

  // 2. Wire all booking links (after all [data-booking-link] elements exist in DOM)
  initBookingLinks();

  // 3. UI interactions
  initMobileNav();
  initStickyBar();
  initHeaderScroll();
  initSmoothScroll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
