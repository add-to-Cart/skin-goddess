# Skin Goddess Beauty Lounge — Website

Static, content-driven marketing website.
Stack: HTML5 · CSS3 · Vanilla JavaScript. No framework, no build step.

---

## Architecture

```
js/content.js   — ALL business content and configuration (edit this)
js/main.js      — Reads content.js, renders every dynamic section
index.html      — Mount points + static structure
css/styles.css  — All styles
assets/         — Organized image folders
```

**The rule:** Edit `content.js` to update content. Never edit `index.html` for content changes.

---

## File Structure

```
website/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── content.js        ← edit this for content
│   └── main.js
├── assets/
│   ├── images/
│   │   ├── brand/        ← logo.jpg
│   │   ├── hero/         ← branch and Gluta menu posters
│   │   ├── services/     ← service posters
│   │   ├── products/     ← no product photos supplied yet
│   │   ├── promotions/   ← promotional posters
│   │   ├── about/        ← no about photo supplied yet
│   │   └── testimonials/ ← no client photos supplied
│   └── icons/
│       └── app_icon.ico
└── README.md
```

---

## Content Updates — Common Tasks

### Set the booking URL
```js
// js/content.js → BUSINESS
bookingUrl: 'https://your-booking-page.com',
```
Every "Book" button on the page updates automatically.

---

### Change phone number
```js
// js/content.js → BUSINESS
phone: '+63 917 XXX XXXX',
```
Header, footer, and contact section all update.

---

### Add a service
```js
// js/content.js → SERVICES array
{
  id:          'my-new-service',
  name:        'Service Name',
  category:    'Facials',           // must match a value in FILTER_CATEGORIES
  description: 'What this does.',
  price:       '₱500',
  duration:    '60 min',
  image:       'assets/images/services/my-new-service.webp',
  featured:    false,
  visible:     true,
},
```
Service appears in the grid automatically. Add `featured: true` to also show it in the Featured strip.

---

### Hide a service (without deleting it)
```js
visible: false,
```

---

### Add a promotion
```js
// js/content.js → PROMOTIONS array
{
  id:            'promo-2',
  title:         'Promotion Name',
  description:   'What is included.',
  price:         '₱799',
  originalPrice: '₱1,200',
  validUntil:    '2026-12-31',
  image:         'assets/images/promotions/promo-2.webp',
  active:        true,
  featured:      true,
  note:          'By appointment only.',
},
```
Only one `active + featured` promotion shows at a time (the first match).

---

### Remove/hide a promotion
```js
active: false,
```
Section disappears automatically. No broken layout.

---

### Add a "What's New" update
```js
// js/content.js → UPDATES array
{
  id:          'update-3',
  label:       'New Service',
  title:       'New Treatment Now Available',
  description: 'One or two sentences about it.',
  link:        '#services',
  linkText:    'View Services',
  active:      true,
  date:        '2026-10-01',
},
```

---

### Add a testimonial
```js
// js/content.js → TESTIMONIALS array
// Only add REAL quotes with customer consent.
{
  quote:   'The facial was incredible.',
  name:    'Maria S.',
  service: 'Classic Facial',
  image:   '',   // or 'assets/images/testimonials/ms.webp'
},
```
If TESTIMONIALS is empty, section shows a graceful "coming soon" message.

---

### Add a product
```js
// js/content.js → PRODUCTS array
{
  id:          'product-5',
  name:        'Product Name',
  description: 'One sentence.',
  price:       '₱450',
  image:       'assets/images/products/product-5.webp',
  featured:    true,
  available:   true,
},
```

---

### Disable a product (out of stock)
```js
available: false,
```

---

### Add the Google Maps embed
1. Go to Google Maps → search for your address
2. Click **Share** → **Embed a map**
3. Copy only the `src="..."` value from the iframe code
4. Paste into `content.js`:
```js
// BUSINESS
mapEmbed: 'https://www.google.com/maps/embed?pb=...',
```

---

### Update business hours
```js
// BUSINESS.hours
hours: [
  { days: 'Monday – Friday', time: '9:00 AM – 7:00 PM' },
  { days: 'Saturday',        time: '9:00 AM – 6:00 PM' },
  { days: 'Sunday',          time: 'Closed' },
],
```

---

## Image handling

The supplied campaign artwork is portrait JPEG at 1080×1350 (4:5). Keep promotional graphics and service posters contained so their prices and copy stay visible. Use `object-fit: cover` only for photography when the crop is intentional. The current branch and Gluta menu graphics are posters, not wide hero photography.

| Content | Field | Folder | Size |
|---|---|---|---|
| Hero | `HERO.image` | `assets/images/hero/` | Existing poster: 1080×1350px (4:5), contained; future photo: landscape |
| Service | `SERVICES[n].image` | `assets/images/services/` | Existing posters: 1080×1350px (4:5), contained |
| Promotion | `PROMOTIONS[n].image` | `assets/images/promotions/` | Existing posters: 1080×1350px (4:5), contained |
| Product | `PRODUCTS[n].image` | `assets/images/products/` | No product photos supplied yet |
| About | `ABOUT.image` | `assets/images/about/` | No about photo supplied yet |
| Testimonial | `TESTIMONIALS[n].image` | `assets/images/testimonials/` | 80×80px, WebP |
| Favicon | *(link in index.html)* | `assets/icons/` | `app_icon.ico` |

Images should keep their natural proportions. Do not force posters into landscape crops; change the image layout to fit the asset.

---

## Deployment (Render)

This is a static site. No build step needed.

In your Render service settings:
- **Build command:** *(leave blank or use `echo done`)*
- **Publish directory:** `website` *(or root if you deployed from the website folder)*
- **Environment:** Static Site

---

## Typography (Optional Upgrade)

Uncomment the Google Fonts block in `index.html` `<head>`, then update in `css/styles.css`:

```css
--font-body:    'Inter', system-ui, sans-serif;
--font-display: 'Cormorant', Georgia, serif;
```

---

## Brand Colors

```css
/* css/styles.css — :root */
--color-accent-brand: #FFB0B6;   /* Brand pink (decorative: logo, icons, stars) */
--color-accent:       #C2404A;   /* Deep rose (interactive: buttons, links)     */
--color-accent-hover: #A83039;   /* Button hover                                */
--color-bg:           #FDF8F8;   /* Page background                             */
--color-promo-bg:     #2A1A1C;   /* Dark promo section                          */
```
