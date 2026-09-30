/**
 * Skin Goddess Beauty Lounge — content.js
 *
 * THE SINGLE SOURCE OF TRUTH FOR ALL BUSINESS CONTENT.
 *
 * How to use:
 *   - Edit this file to update any business information.
 *   - Refresh the browser. Changes appear automatically.
 *   - You never need to touch index.html or main.js to update content.
 *
 * Rules:
 *   - Never fabricate prices, services, addresses, or testimonials.
 *   - Set visible/active/available to false to hide content without deleting it.
 */

'use strict';

/* ============================================================
   BUSINESS CONFIGURATION
============================================================ */

const BUSINESS = {
  name:        'Skin Goddess Beauty Lounge',
  tagline:     'Where Beauty Meets Confidence.',
  description: 'Professional aesthetic and beauty services in General Trias, Cavite. From glutathione drips to body sculpting and facial treatments — tailored for your goals.',

  // Booking URL — paste your online booking page link here
  bookingUrl:  '[BOOKING_URL]',

  // Contact
  phone: '[PHONE NUMBER]',

  // Location — Lancaster Branch
  address:  '9005 FY Manalo Road Navarro, General Trias, Cavite',
  mapUrl:   'https://maps.google.com/?q=9005+FY+Manalo+Road+Navarro+General+Trias+Cavite',
  mapEmbed: '', // Paste Google Maps embed src here

  // Hours
  hours: [
    { days: 'Monday – Friday', time: '[TIME] – [TIME]' },
    { days: 'Saturday',        time: '[TIME] – [TIME]' },
    { days: 'Sunday',          time: '[CLOSED or HOURS]' },
  ],

  // Social
  facebook:        '[FACEBOOK_PAGE_URL]',
  instagram:       '[INSTAGRAM_PROFILE_URL]',
  instagramHandle: '@[INSTAGRAM_HANDLE]',

  // SEO
  seoTitle:       'Skin Goddess Beauty Lounge — Aesthetic & Beauty Services in General Trias, Cavite',
  seoDescription: 'Explore aesthetic and beauty treatments at Skin Goddess Beauty Lounge in General Trias, Cavite.',
  domain:         '[YOUR-DOMAIN].com',
};


/* ============================================================
   SERVICES
============================================================ */

const SERVICES = [
  {
    id:          'barbie-arms',
    name:        'Barbie Arms',
    category:    'Body Sculpting',
    description: 'Visible arm-slimming transformation visible after just one session. Enjoy smoother, more defined, and slimmer-looking arms as you work toward your body goals.',
    price:       '₱4,999',
    duration:    '[XX] min',
    image:       'assets/images/services/barms.jpg',
    featured:    true,
    visible:     true,
  },
  {
    id:          'traptox',
    name:        'Traptox',
    category:    'Body Sculpting',
    description: 'Softens bulky shoulder muscles to enhance the neck and shoulder line, creating a longer, more elegant silhouette. Also provides pain relief, improved posture, and relaxation.',
    price:       '₱4,999 / session · ₱9,499 / 2 sessions',
    duration:    '[XX] min',
    image:       'assets/images/services/traptox.jpg',
    featured:    true,
    visible:     true,
  },
  {
    id:          'sweatox',
    name:        'Sweatox',
    category:    'Body Sculpting',
    description: 'A targeted treatment that helps reduce excessive sweating for a fresher, drier, and more confident you. Long-lasting results for months. Palmtox also available.',
    price:       'Starts at ₱4,999',
    duration:    '[XX] min',
    image:       'assets/images/services/sweatox.jpg',
    featured:    false,
    visible:     true,
  },
  {
    id:          'hugis-bigas',
    name:        'Hugis Bigas',
    category:    'Face & Fillers',
    description: 'Contour and define your features with this nose-reshaping treatment. Refined. Balanced. Defined. Results visible in 1–2 weeks. Book now and get freebies.',
    price:       '₱5,999 / session',
    duration:    '[XX] min',
    image:       'assets/images/services/hbigas.jpg',
    featured:    true,
    visible:     true,
  },
  {
    id:          'ilong-goals',
    name:        'Ilong Goals',
    category:    'Face & Fillers',
    description: 'Add definition to your profile with nose filler options that complement your features and personal preferences. Includes special freebies with this promo.',
    price:       '₱4,999',
    duration:    '[XX] min',
    image:       'assets/images/services/ilonggoals.jpg',
    featured:    false,
    visible:     true,
  },
  {
    id:          'lip-filler',
    name:        'Lip Filler',
    category:    'Face & Fillers',
    description: 'Enhances lip volume for a fuller, more defined appearance while maintaining a natural-looking result. Can help balance uneven lips and enhance facial harmony.',
    price:       '[PRICE]',
    duration:    '[XX] min',
    image:       'assets/images/services/lipfiller.jpg',
    featured:    false,
    visible:     true,
  },
  {
    id:          'sg-gluta-drip-nad',
    name:        'SG Gluta Drip w/ NAD+',
    category:    'Glutathione',
    description: 'Premium intravenous glutathione drip combined with NAD+ for enhanced brightening, energy, and anti-aging benefits.',
    price:       '₱1,299',
    duration:    '[XX] min',
    image:       '',
    featured:    false,
    visible:     true,
  },
  {
    id:          'sg-soul-gluta-drip',
    name:        'SG Soul Gluta Drip w/ Slimming',
    category:    'Glutathione',
    description: 'Glutathione drip with slimming formula for skin brightening and body slimming benefits in one session.',
    price:       '₱1,499',
    duration:    '[XX] min',
    image:       '',
    featured:    false,
    visible:     true,
  },
  {
    id:          'korean-gluta-trio',
    name:        'Korean Gluta Trio w/ Slimming',
    category:    'Glutathione',
    description: 'Premium Korean glutathione trio formula combined with slimming ingredients for maximum brightening and body-sculpting results.',
    price:       '₱1,899',
    duration:    '[XX] min',
    image:       '',
    featured:    false,
    visible:     true,
  },
  {
    id:          'sg-gluta-push-nad',
    name:        'SG Gluta Push & NAD+',
    category:    'Glutathione',
    description: 'Fast-acting glutathione push paired with NAD+ for brightening and cellular rejuvenation.',
    price:       '₱899',
    duration:    '[XX] min',
    image:       '',
    featured:    false,
    visible:     true,
  },
  {
    id:          'sg-gluta-acne',
    name:        'SG Gluta for Acne',
    category:    'Glutathione',
    description: 'Glutathione formula specially targeted for acne-prone skin — helps reduce inflammation and brighten acne marks.',
    price:       '₱899',
    duration:    '[XX] min',
    image:       '',
    featured:    false,
    visible:     true,
  },
  {
    id:          'sakura-gluta-drip',
    name:        'Sakura Gluta Drip',
    category:    'Glutathione',
    description: 'Sakura-inspired glutathione drip for a luminous, petal-soft skin glow and overall brightening effect.',
    price:       '₱899',
    duration:    '[XX] min',
    image:       '',
    featured:    false,
    visible:     true,
  },
  {
    id:          'tad-gluta-push',
    name:        'TAD Gluta Push',
    category:    'Glutathione',
    description: 'Affordable glutathione push for skin brightening and antioxidant benefits.',
    price:       '₱599',
    duration:    '[XX] min',
    image:       '',
    featured:    false,
    visible:     true,
  },
  {
    id:          'sg-cinderella-drip',
    name:        'SG Cinderella Drip 500ml',
    category:    'Glutathione',
    description: 'A high-dose 500ml Cinderella drip for intense skin brightening and a radiant glow — our most popular IV treatment.',
    price:       '₱1,399',
    duration:    '[XX] min',
    image:       '',
    featured:    false,
    visible:     true,
  },
  {
    id:          'ultimate-gluta-push',
    name:        'Ultimate Gluta Push',
    category:    'Glutathione',
    description: 'Our most accessible glutathione push — a quick and effective brightening treatment to start your glow journey.',
    price:       '₱399',
    duration:    '[XX] min',
    image:       '',
    featured:    false,
    visible:     true,
  },
];

// Filter categories — "All" is added automatically.
const FILTER_CATEGORIES = ['Body Sculpting', 'Face & Fillers', 'Glutathione'];


/* ============================================================
   PROMOTIONS
   Only the first active + featured promotion shows as the main feature.
============================================================ */

const PROMOTIONS = [
  {
    id:            'hydra-facial',
    title:         'Hydra Facial',
    description:   'A non-invasive treatment that cleanses, exfoliates, and hydrates the skin, leaving it smooth, refreshed, and radiant. Ber Months All-In Promo.',
    price:         '₱1,399',
    originalPrice: '',
    validUntil:    '',
    image:         'assets/images/promotions/hydrafacial.jpg',
    active:        true,
    featured:      true,
    note:          'Also available: 5+1 Sessions Package for only ₱6,999. Limited time offer.',
  },
  {
    id:            'v-face-package',
    title:         'V-Face Package',
    description:   'Sculpt, slim, and define your features. Designed to enhance your natural contours and create a more lifted, V-shaped profile. Results in 1–2 weeks. Includes free Mesolipo for face contouring and double chin.',
    price:         '₱5,999',
    originalPrice: '[REGULAR PRICE]',
    validUntil:    '',
    image:         'assets/images/promotions/vfacepkg.jpg',
    active:        false,
    featured:      false,
    note:          'Ber Months All-In Promo. Limited slots only.',
  },
  {
    id:            'traptox-promo',
    title:         'Traptox',
    description:   'Experience pain relief, aesthetic benefits, improved posture, and ultimate relaxation all in one treatment. Softens bulky shoulder muscles for a longer, more elegant silhouette.',
    price:         '₱4,999',
    originalPrice: '[REGULAR PRICE]',
    validUntil:    '',
    image:         'assets/images/promotions/traptox.jpg',
    active:        false,
    featured:      false,
    note:          '2 Sessions Package for only ₱9,499.',
  },
];


/* ============================================================
   PRODUCTS
============================================================ */

const PRODUCTS = [
  {
    id:          'product-1',
    name:        '[PRODUCT NAME 1]',
    description: '[One sentence about what this product does for the skin.]',
    price:       '₱[PRICE]',
    image:       'assets/images/products/product-1.webp',
    featured:    true,
    available:   false,
  },
  {
    id:          'product-2',
    name:        '[PRODUCT NAME 2]',
    description: '[One sentence about what this product does for the skin.]',
    price:       '₱[PRICE]',
    image:       'assets/images/products/product-2.webp',
    featured:    true,
    available:   false,
  },
];


/* ============================================================
   TESTIMONIALS
   Only add real quotes with customer consent.
   Leave empty for graceful "coming soon" state.
============================================================ */

const TESTIMONIALS = [];


/* ============================================================
   WHAT'S NEW — BUSINESS UPDATES
============================================================ */

const UPDATES = [
  {
    id:          'lancaster-branch',
    label:       'New Branch',
    title:       'Now Open: Skin Goddess Lancaster Branch',
    description: 'Visit us at 9005 FY Manalo Road Navarro, General Trias, Cavite. Book your session and experience our full menu of aesthetic treatments.',
    link:        '#contact',
    linkText:    'Get Directions',
    active:      true,
    date:        '',
  },
  {
    id:          'ber-months-promo',
    label:       'Promo',
    title:       'Ber Months All-In Promo — Limited Slots',
    description: 'See the current Hydra Facial offer and other available treatments. Contact the lounge to confirm availability and terms.',
    link:        '#promos-section',
    linkText:    'See Promos',
    active:      true,
    date:        '',
  },
];

const UPDATES_VISIBLE_COUNT = 2;


/* ============================================================
   ABOUT
============================================================ */

const ABOUT = {
  intro: 'Skin Goddess Beauty Lounge is a professional aesthetic and beauty lounge in General Trias, Cavite. We offer a curated range of treatments — from glutathione drips and hydra facials to body sculpting and facial aesthetic procedures — designed to help you look and feel your best.',
  body:  '',
  image:    '',
  imageAlt: 'Skin Goddess Beauty Lounge — treatment room',
  credentials: [],
};


/* ============================================================
   HERO
============================================================ */

const HERO = {
  headline:    'Where Beauty Meets Confidence.',
  subheadline: 'Professional aesthetic treatments and beauty services in General Trias, Cavite. From glutathione drips to body sculpting — personalised for your goals.',
  trustItems: [
    { icon: 'location', text: 'General Trias, Cavite' },
    { icon: 'check',    text: 'Mastercard & Visa Accepted' },
    { icon: 'clock',    text: '[OPENING HOURS]' },
  ],
  image:    'assets/images/hero/new branch.jpg',
  imageAlt: 'Skin Goddess Beauty Lounge — Lancaster Branch, General Trias, Cavite',
};


/* ============================================================
   FAQ
============================================================ */

const FAQ = [
  {
    question: 'Where is Skin Goddess Beauty Lounge located?',
    answer:   '9005 FY Manalo Road Navarro, General Trias, Cavite (Lancaster Branch).',
  },
  {
    question: 'What payment methods do you accept?',
    answer:   'We accept Mastercard and Visa.',
  },
  {
    question: 'Do I need to prepare anything before my visit?',
    answer:   '[Preparation instructions — e.g. arrive without makeup, inform us about skin conditions or allergies, etc.]',
  },
  {
    question: 'Can I reschedule or cancel my appointment?',
    answer:   '[Your rescheduling and cancellation policy — how much notice is needed and how to contact you.]',
  },
];


/* ============================================================
   EXPORTS
============================================================ */

const CONTENT = {
  business:             BUSINESS,
  hero:                 HERO,
  services:             SERVICES,
  filterCategories:     FILTER_CATEGORIES,
  promotions:           PROMOTIONS,
  products:             PRODUCTS,
  testimonials:         TESTIMONIALS,
  updates:              UPDATES,
  updatesVisibleCount:  UPDATES_VISIBLE_COUNT,
  about:                ABOUT,
  faq:                  FAQ,
};
