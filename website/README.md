# Skin Goddess Beauty Lounge — Website

Static marketing website for Skin Goddess Beauty Lounge.
Built with HTML5, CSS3, and vanilla JavaScript. No framework, no build step.

---

## File Structure

```
website/
├── index.html              Main page
├── css/
│   └── styles.css          All styles
├── js/
│   └── main.js             All interactivity
├── assets/
│   ├── images/             All photos go here
│   └── icons/              favicon.svg, apple-touch-icon.png
└── README.md               This file
```

---

## Before Going Live — Checklist

### 1. Set the Setmore booking URL

Open `js/main.js`. At the top, find:

```js
const CONFIG = {
  setmoreUrl: '[SETMORE_BOOKING_URL]',
};
```

Replace `[SETMORE_BOOKING_URL]` with your real Setmore booking link.
Example: `'https://book.setmore.com/scheduleappointment/xxxxxxxx-...'`

This is the only place you need to change it. Every "Book" button on the
page uses this value automatically.

---

### 2. Replace all `[PLACEHOLDER]` content in index.html

Search for `[` in index.html to find every placeholder.
Replace each one with the real content:

| Placeholder | What to put |
|---|---|
| `[YOUR POSITIONING HEADLINE]` | A short, honest headline — what Skin Goddess is |
| `[ONE OR TWO SENTENCES...]` | Who you serve and what you offer |
| `[OPENING HOURS]` | e.g. 9:00 AM – 6:00 PM |
| `[CITY / AREA]` | e.g. Quezon City |
| `[SERVICE NAME 1]` – `[SERVICE NAME 6]` | Real service names |
| `₱[PRICE]` | Real prices |
| `[XX] min` | Real durations |
| `[PROMO NAME]` | Real promotion name |
| `[PRODUCT NAME 1]` – `[PRODUCT NAME 4]` | Real product names |
| `[STREET ADDRESS]` | Full street address |
| `[CITY, PROVINCE / ZIP]` | City/province/ZIP |
| `[PHONE NUMBER]` | Phone in tel: format e.g. +63-917-XXX-XXXX |
| `[FACEBOOK_URL]` | Full Facebook page URL |
| `[INSTAGRAM_URL]` | Full Instagram profile URL |
| `[INSTAGRAM HANDLE]` | e.g. @skingoddesslounge |
| `[YOUR-DOMAIN].com` | Real domain in all OG/meta tags |
| `[YOUR TAGLINE...]` | Short footer description |
| `[YOUR WEB DESIGNER...]` | Credit or remove this line |

---

### 3. Replace testimonials

The testimonial section has 3 placeholder `<blockquote>` elements.
Replace the placeholder text with real quotes from real clients.
Optionally add real client photos (with their consent).

---

### 4. Replace About content

The about section has two paragraph placeholders.
Write 2–4 honest sentences about the business, the owner, and the approach.
Replace the credential items with real certifications or training.

---

### 5. Replace all images

| Placeholder | Real image |
|---|---|
| Hero image (`img-placeholder--hero`) | Lounge interior, treatment in progress, or brand photo. 1440×800px minimum. |
| Service images (`img-placeholder--service`) | Each service. 800×600px. 4:3 ratio. |
| Promo image (`img-placeholder--promo`) | Promo photo or designed graphic. 4:3 ratio. |
| Product images (`img-placeholder--product`) | Each product on clean background. 600×600px. 1:1 ratio. |
| About image (`img-placeholder--about`) | Owner, team, or lounge interior. 800×1000px portrait. |
| Testimonial avatars (`img-placeholder--avatar`) | Client photos (with consent). 80×80px. |

**To replace a placeholder:**
Remove the `<div class="img-placeholder ...">` element and insert a real `<img>` tag:
```html
<img
  src="assets/images/your-image.jpg"
  alt="Descriptive alt text"
  loading="lazy"
  width="800"
  height="600"
/>
```

Use WebP format where possible for best performance.

---

### 6. Replace the map

Find `<!-- MAP PLACEHOLDER -->` in index.html.
Replace the entire `<div class="map-placeholder">` block with an embedded
Google Maps iframe:

1. Go to Google Maps and find the business location
2. Click Share → Embed a map
3. Copy the `<iframe>` code
4. Paste it in place of the map-placeholder div
5. Add `title="Skin Goddess Beauty Lounge on Google Maps"` to the iframe

---

### 7. Add a favicon

Place these files in `assets/icons/`:
- `favicon.svg` — Vector favicon (32×32 viewBox)
- `apple-touch-icon.png` — 180×180px PNG for iOS

---

### 8. Add your OG cover image

Create a 1200×630px image for social media sharing.
Save as `assets/images/og-cover.jpg`.
Update the `og:image` and `twitter:image` meta tags in `<head>` with the real URL.

---

### 9. Update the service filter categories

The filter buttons use `data-filter` values: `facial`, `body`, `specialty`.
Each service card uses `data-category` with the matching value.

When you add real services, set the correct `data-category` on each card.
If your categories are different, update both the filter buttons and card attributes.

---

## Deployment

This is a static site. No server required.

### Cloudflare Pages
1. Push to a GitHub/GitLab repository
2. Connect the repo in Cloudflare Pages dashboard
3. Build command: (none)
4. Output directory: `/` (root)

### Netlify
1. Drag and drop the `website/` folder into app.netlify.com
   — or connect a Git repository
2. No build settings needed

### GitHub Pages
1. Push the `website/` folder contents to a repository
2. Enable Pages in repository Settings → Pages
3. Set source to the branch and folder containing `index.html`

---

## Updating the Promotion

To update the promo section later:
1. Open `index.html`
2. Find `<section class="section-promo"`
3. Replace:
   - `[PROMO NAME]` with the new promotion name
   - `[PROMO PRICE]` and `[REGULAR PRICE]` with current prices
   - `[DATE]` and `datetime="[YYYY-MM-DD]"` with the new expiry
   - The description paragraph
   - `[CONDITIONS / NOTES]` with any terms

---

## Adding More Services

Copy one `<article class="service-card">` block inside `#services-grid`.
Update all the content and set the correct `data-category` attribute.
The service filter will pick it up automatically.

---

## Typography (Optional Upgrade)

The site uses the system font stack by default — it loads instantly.

To use the recommended Cormorant + Inter pairing, add this to `<head>` in
index.html (before the stylesheet link):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

Then in `css/styles.css`, update the font tokens:

```css
--font-body:    'Inter', system-ui, sans-serif;
--font-display: 'Cormorant', Georgia, serif;
```

---

## Color Customization

All colours are in CSS custom properties at the top of `styles.css`.

The main ones to update if branding changes:

```css
--color-accent:       #C2866A;  /* Primary accent — buttons, links, highlights */
--color-accent-hover: #A96D53;  /* Hover state */
--color-accent-light: #F0DDD3;  /* Light tint background */
--color-bg:           #FAF8F5;  /* Page background */
--color-promo-bg:     #2E2420;  /* Dark promo section background */
```
