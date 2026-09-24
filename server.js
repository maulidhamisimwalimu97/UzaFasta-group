const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------- Database ----------------
const dbConfig = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '',
  database: 'uzafasta'
};

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10
});

// ---------------- Session store ----------------
const sessionStore = new MySQLStore({
  expiration: 1000 * 60 * 60 * 24
}, pool);

app.use(session({
  name: 'uzafasta.admin',
  secret: 'uzafasta-super-secret-2024',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// ---------------- Body parsing ----------------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ---------------- Static / uploads ----------------
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, 'vid-' + Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});
const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /mp4|webm|ogg|mov/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = file.mimetype.startsWith('video/');
    if (extOk && mimeOk) return cb(null, true);
    cb(new Error('Only video files (mp4, webm, mov, ogg) are allowed.'));
  }
});

const blogUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'cover_image') {
      const ext = path.extname(file.originalname).toLowerCase();
      if (/\.(jpe?g|png|gif|webp|svg)$/i.test(ext)) return cb(null, true);
      return cb(new Error('Cover must be jpg, png, gif or webp.'));
    }
    if (file.fieldname === 'video_file') {
      const ext = path.extname(file.originalname).toLowerCase();
      if (/\.(mp4|webm|mov|ogg)$/i.test(ext)) return cb(null, true);
      return cb(new Error('Video must be mp4, webm, mov or ogg.'));
    }
    cb(new Error('Unexpected upload field.'));
  }
});

const projectUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'cover_image') {
      const ext = path.extname(file.originalname).toLowerCase();
      if (/\.(jpe?g|png|gif|webp|svg)$/i.test(ext)) return cb(null, true);
      return cb(new Error('Cover image must be jpg, png, gif, webp or svg.'));
    }
    if (file.fieldname === 'video_file') {
      const ext = path.extname(file.originalname).toLowerCase();
      if (/\.(mp4|webm|mov|ogg|ogv)$/i.test(ext)) return cb(null, true);
      return cb(new Error('Video must be mp4, webm, mov or ogg.'));
    }
    cb(null, true);
  }
});

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use('/admin-assets', express.static(path.join(__dirname, 'admin', 'blue-vertical', 'assets')));
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const year = new Date().getFullYear();

// ---------------- Helpers ----------------
function slugify(str) {
  return str.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80) || 'post-' + Date.now();
}

function makeTrackingCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'UZF-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const TASK_PRIORITY = { low: 'Low', medium: 'Medium', high: 'High' };
const TASK_PRIORITY_CLASS = { low: 'badge-soft-info', medium: 'badge-soft-warning', high: 'badge-soft-danger' };
const TASK_STATUS = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' };
const TASK_STATUS_CLASS = { pending: 'badge-soft-warning', in_progress: 'badge-soft-info', completed: 'badge-soft-success' };

const LEAVE_TYPES = {
  annual: 'Annual Leave',
  sick: 'Sick Leave',
  personal: 'Personal Leave',
  unpaid: 'Unpaid Leave',
  other: 'Other'
};
const LEAVE_STATUS = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };
const LEAVE_STATUS_CLASS = { pending: 'badge-soft-warning', approved: 'badge-soft-success', rejected: 'badge-soft-danger' };

// ---------------- Auth middleware ----------------
async function requireAdmin(req, res, next) {
  if (req.session && req.session.adminId) return next();
  return res.redirect('/admin/login');
}

async function loadAdmin(req, res, next) {
  if (req.session && req.session.adminId) {
    try {
      const [rows] = await pool.query('SELECT id, username, full_name, email, role FROM admins WHERE id = ?', [req.session.adminId]);
      if (rows.length) {
        req.admin = rows[0];
        res.locals.admin = rows[0];
      }
    } catch (e) { /* ignore */ }
    const [unreadRows] = await pool.query('SELECT COUNT(*) AS c FROM inquiries WHERE is_viewed = 0');
    req.unreadCount = unreadRows[0].c;
    res.locals.unreadCount = req.unreadCount;
    try {
      let pendingLeaves;
      if (req.admin.role === 'super_admin') {
        const [r] = await pool.query('SELECT COUNT(*) AS c FROM leaves WHERE status = "pending"');
        pendingLeaves = r[0].c;
      } else {
        const [r] = await pool.query('SELECT COUNT(*) AS c FROM leaves WHERE status = "pending" AND staff_id = ?', [req.admin.id]);
        pendingLeaves = r[0].c;
      }
      req.pendingLeaveCount = pendingLeaves;
      res.locals.pendingLeaveCount = pendingLeaves;
    } catch (e) {
      req.pendingLeaveCount = 0;
      res.locals.pendingLeaveCount = 0;
    }
  }
  next();
}

async function requireSuperAdmin(req, res, next) {
  if (req.admin && req.admin.role === 'super_admin') return next();
  req.session.success = 'You do not have permission to manage staff.';
  return res.redirect('/admin/dashboard');
}

// Expose helpers to all templates
app.use((req, res, next) => {
  res.locals.year = year;
  if (!res.locals.admin) res.locals.admin = null;
  if (!res.locals.unreadCount) res.locals.unreadCount = 0;
  next();
});

// =========================================================
//  PUBLIC SITE
// =========================================================

// ---- Home + static pages ----
const pages = [
  'index', 'index-2', 'index-3', 'about', 'services', 'service-details',
  'project-details',
  'blog-grid', 'blog-standard', 'blog-details',
  'our-product',
  'contact', 'faq', 'pricing', 'team', 'team-details', '404'
];

app.get(['/', '/index', '/index.html'], async (req, res) => {
  try {
    const [blogs] = await pool.query(
      'SELECT id, title, slug, excerpt, cover_image, video_url, category, created_at, views FROM blogs WHERE status = "published" ORDER BY created_at DESC LIMIT 3'
    );
    blogs.forEach(b => { b.created_at = new Date(b.created_at); });
    const [projects] = await pool.query(
      'SELECT id, title, category, description, cover_image, video_url, link FROM projects WHERE status = "active" ORDER BY created_at DESC LIMIT 6'
    );
    projects.forEach(p => {
      p.filterKey = normalizeProjectCategory(p.category);
      p.videoType = p.video_url ? String(p.video_url.split('.').pop().split('?')[0]).toLowerCase() : '';
      p.videoMime = p.videoType ? 'video/' + p.videoType : '';
      if (p.video_url) {
        var m = String(p.video_url).match(/\.(mp4|webm|ogg|mov)$/i);
        p.videoType = m ? m[1].toLowerCase() : 'mp4';
        p.videoMime = 'video/' + p.videoType;
      }
      p.poster = p.cover_image || '';
    });
    res.render('pages/index', { blogs, projects });
  } catch (e) {
    console.error('Home blogs error:', e.message);
    res.render('pages/index', { blogs: [], projects: [] });
  }
});

function normalizeProjectCategory(category) {
  const c = String(category || '').trim().toLowerCase();
  if (/web|site/.test(c)) return 'website';
  if (/soft|app|system/.test(c)) return 'software';
  if (/brand|design/.test(c)) return 'branding';
  if (/video/.test(c)) return 'video';
  if (/market|social|ads/.test(c)) return 'marketing';
  return 'website';
}

app.get('/track', (req, res) => {
  res.render('pages/track', { query: '' });
});

app.post('/track', async (req, res) => {
  const q = (req.body.q || '').trim();
  if (!q) return res.render('pages/track', { query: '' });
  try {
    const like = `%${q}%`;
    const [rows] = await pool.query(
      `SELECT id, tracking_code, name, email, subject, message, reply, is_viewed, replied_at, created_at
       FROM inquiries
       WHERE email LIKE ? OR tracking_code = ?
       ORDER BY created_at DESC`,
      [like, q.toUpperCase()]
    );
    rows.forEach(r => {
      r.created_at = new Date(r.created_at);
      r.replied_at = r.replied_at ? new Date(r.replied_at) : null;
    });
    res.render('pages/track', { inquiries: rows, query: q });
  } catch (e) {
    res.render('pages/track', { error: 'Something went wrong. Please try again.' });
  }
});

// ---- Contact form ----
app.post('/contact', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.render('pages/contact', { contactMsg: { type: 'danger', text: 'Please fill in Name, Email and Message.' } });
  }
  const trackingCode = makeTrackingCode();
  try {
    await pool.query(
      'INSERT INTO inquiries (tracking_code, name, email, phone, subject, message) VALUES (?,?,?,?,?,?)',
      [trackingCode, name.trim(), email.trim(), phone || null, subject || null, message.trim()]
    );
    res.render('pages/contact', {
      contactMsg: {
        type: 'success',
        text: `Your message was sent successfully! Your tracking code is ${trackingCode} — use it to follow your inquiry at /track.`
      }
    });
  } catch (e) {
    res.render('pages/contact', { contactMsg: { type: 'danger', text: 'Could not send your message. Please try again.' } });
  }
});

// ---- Service enquiry form ----
app.post('/service-enquiry', async (req, res) => {
  const { name, email, phone, service, redirect } = req.body;
  const back = redirect && redirect.startsWith('/') ? redirect : '/services';
  const query = (q) => back + (back.includes('?') ? '&' : '?') + q;
  if (!name || !email || !phone || !service) {
    return res.redirect(query('enquiry=error&msg=Please fill in all required fields.'));
  }
  const trackingCode = makeTrackingCode();
  try {
    await pool.query(
      'INSERT INTO inquiries (tracking_code, name, email, phone, subject, message) VALUES (?,?,?,?,?,?)',
      [trackingCode, name.trim(), email.trim(), phone.trim(), service.trim(), 'Enquiry request submitted from the Services page.']
    );
    res.redirect(query('enquiry=success&code=' + trackingCode));
  } catch (e) {
    console.error('Service enquiry error:', e.message);
    res.redirect(query('enquiry=error&msg=Could not send your enquiry. Please try again.'));
  }
});

function buildEnquiryMsg(q) {
  if (q && q.enquiry === 'success') {
    return { type: 'success', text: 'Your enquiry has been sent successfully! Your tracking code is ' + (q.code || '') + '.' };
  }
  if (q && q.enquiry === 'error') {
    return { type: 'danger', text: (q.msg || 'Could not send your enquiry. Please try again.') };
  }
  return null;
}

// ---- Dynamic services (existing inline data) ----
const services = [
  {
    slug: 'digital-marketing', name: 'Digital Marketing', icon: 'fa-bullhorn',
    short: 'Grow your brand, reach the right audience, and turn social media into a powerful business channel.',
    tags: ['Social Media', 'SEO', 'Content', 'Ads'],
    thumb: '/assets/images/innerpage/service/svc-digital-marketing.jpg',
    introTitle: 'Marketing that puts your brand in front of the right customers.',
    intro: [
      'Uzafasta Group helps your business get found, get followed, and get customers. From social media management and search engine optimisation to paid advertising and content marketing, we build campaigns that deliver measurable results.',
      'We start by understanding who your customers are and where they spend time online. Then we craft content, run targeted ads, and optimise continuously to make sure every shilling of your marketing budget works harder for you.'
    ],
    highlights: ['Social Media Management & Content', 'SEO & Google Ranking', 'Paid Ads (Facebook, Instagram, Google)', 'Email & WhatsApp Marketing'],
    process: [
      { step: '01', title: 'Audit & Research', desc: 'We analyse your brand, competitors, and target audience to find the best opportunities.' },
      { step: '02', title: 'Strategy & Planning', desc: 'We create a clear content and advertising plan aligned with your business goals.' },
      { step: '03', title: 'Execution & Campaigns', desc: 'We roll out campaigns, publish content, and manage your channels daily.' },
      { step: '04', title: 'Track & Optimise', desc: 'We measure results and continuously improve to boost reach and conversions.' }
    ],
    faqs: [
      { q: 'How soon will I see results from digital marketing?', a: 'Most clients see growing reach within the first month. Stronger results, like leads and sales, typically build up over 2–3 months of consistent, optimised campaigns.' },
      { q: 'Do I need to manage my social media myself?', a: 'No. We handle planning, design, posting, and engagement for you. You can focus on running your business while we grow your audience.' }
    ]
  },
  {
    slug: 'web-design-development', name: 'Website Design & Development', icon: 'fa-code',
    short: 'Professional, responsive, and modern websites designed to represent your brand and help your business grow.',
    tags: ['Corporate', 'WordPress', 'Custom'],
    thumb: '/assets/images/innerpage/service/svc-web-development.jpg',
    introTitle: 'Websites that look great, load fast, and turn visitors into customers.',
    intro: [
      'Your website is your digital storefront. Uzafasta Group designs and builds modern, mobile-friendly websites for businesses, organisations, and institutions across Tanzania.',
      'Whether you need a corporate site, a landing page, or a full custom platform, we deliver clean designs, fast performance, and features that make it easy for your customers to find and contact you.'
    ],
    highlights: ['Corporate & Business Websites', 'Custom Web Design (WordPress / HTML)', 'Landing Pages & Portfolios', 'Speed Optimisation & SEO Setup'],
    process: [
      { step: '01', title: 'Discover', desc: 'We learn about your business, goals, and the features your website needs.' },
      { step: '02', title: 'Design', desc: 'We create a clean, modern design that matches your brand and audience.' },
      { step: '03', title: 'Develop', desc: 'We build and test your site to make sure it works perfectly on all devices.' },
      { step: '04', title: 'Launch & Support', desc: 'We go live, train your team, and keep your site updated and secure.' }
    ],
    faqs: [
      { q: 'How long does it take to build a website?', a: 'A corporate website usually takes 2–4 weeks depending on content and features. We give you a clear timeline before we start.' },
      { q: 'Will my website work on mobile phones?', a: 'Yes. Every site we build is fully responsive, so it looks great on phones, tablets, and computers.' }
    ]
  },
  {
    slug: 'video-production', name: 'Video Production', icon: 'fa-video',
    short: 'We create engaging visual content that helps businesses tell their stories and connect with their audience.',
    tags: ['Promo Videos', 'Events', 'Photography'],
    thumb: '/assets/images/innerpage/service/svc-video-production.jpg',
    introTitle: 'Stories your audience will remember.',
    intro: [
      'Video is the most powerful way to connect with your audience. Uzafasta Group produces professional corporate videos, product promos, event coverage, and brand content that help your business stand out.',
      'From scripting and filming to editing and final delivery, our team handles everything so you get polished, share-ready content for your website, social media, and advertising.'
    ],
    highlights: ['Brand & Corporate Videos', 'Product Promos & Adverts', 'Event & Documentary Coverage', 'Editing, Colouring & Motion Graphics'],
    process: [
      { step: '01', title: 'Concept', desc: 'We define the message and story your video needs to tell.' },
      { step: '02', title: 'Planning & Scripting', desc: 'We write the script, plan shots, and arrange filming logistics.' },
      { step: '03', title: 'Production', desc: 'Our crew films with professional equipment and direction.' },
      { step: '04', title: 'Post-Production', desc: 'We edit, colour, and add graphics to deliver a polished final video.' }
    ],
    faqs: [
      { q: 'What equipment do you use?', a: 'We use professional cinema cameras, lighting, and audio gear to deliver broadcast-quality video.' },
      { q: 'Can you cover live events?', a: 'Yes. We cover conferences, launches, weddings, and corporate events with multi-camera setups.' }
    ]
  },
  {
    slug: 'graphic-design', name: 'Graphic Design', icon: 'fa-palette',
    short: 'Creative designs that make your brand recognizable, professional, and memorable.',
    tags: ['Logos', 'Branding', 'Print'],
    thumb: '/assets/images/innerpage/service/svc-graphic-design.jpg',
    introTitle: 'Design that makes your brand unforgettable.',
    intro: [
      'Great design builds trust. Uzafasta Group creates logos, brand identities, social media creatives, posters, banners, and print materials that give your business a professional, consistent look.',
      'We design with your audience in mind — combining creativity and strategy to make sure your brand is not only beautiful but also effective at attracting and keeping customers.'
    ],
    highlights: ['Logo & Brand Identity Design', 'Social Media Creatives', 'Business Cards, Flyers & Banners', 'Packaging & Print Design'],
    process: [
      { step: '01', title: 'Brief', desc: 'We discuss your brand, style preferences, and the message you want to communicate.' },
      { step: '02', title: 'Concepts', desc: 'We present design concepts and refine them with your feedback.' },
      { step: '03', title: 'Design & Polish', desc: 'We finalise the design and prepare files for web, print, and social media.' },
      { step: '04', title: 'Deliver', desc: 'You receive all source files and ready-to-use assets.' }
    ],
    faqs: [
      { q: 'Will I own the final design and logo?', a: 'Yes. Once paid in full, you receive full ownership and all source files.' },
      { q: 'Can you redesign my current logo?', a: 'Absolutely. We refresh and modernise existing logos while keeping your brand recognisable.' }
    ]
  },
  {
    slug: 'ecommerce-solutions', name: 'E-Commerce Solutions', icon: 'fa-cart-plus',
    short: 'Take your business online with an e-commerce platform designed to help you sell and manage customers.',
    tags: ['Online Stores', 'Payments', 'Orders'],
    thumb: '/assets/images/innerpage/service/svc-ecommerce.jpg',
    introTitle: 'Sell online, 24 hours a day.',
    intro: [
      'Take your business online with a fast, secure online store. Uzafasta Group builds e-commerce platforms in Tanzania that let you showcase products, accept payments, and manage orders from one dashboard.',
      'We handle everything from product setup and payment integration (mobile money, cards) to delivery management — so you can start selling without the technical headache.'
    ],
    highlights: ['Online Store Development', 'Mobile Money & Card Payments', 'Order & Inventory Management', 'Store Setup & Training'],
    process: [
      { step: '01', title: 'Understand', desc: 'We learn how you sell today and what your online store must do.' },
      { step: '02', title: 'Design Store', desc: 'We design a storefront for your products built around your brand.' },
      { step: '03', title: 'Integrate & Populate', desc: 'We add products, payments, delivery, and set up the dashboard.' },
      { step: '04', title: 'Launch & Train', desc: 'We launch your store and train you to manage orders and stock.' }
    ],
    faqs: [
      { q: 'Which payment methods can I accept?', a: 'We integrate M-Pesa, Tigo Pesa, Airtel Money, and bank/card payments so customers can pay however they prefer.' },
      { q: 'Can I manage products myself?', a: 'Yes. We train you to add products, update prices, and track orders without needing a developer.' }
    ]
  },
  {
    slug: 'software-development', name: 'Software Development', icon: 'fa-code-branch',
    short: 'Custom software solutions designed around your business processes and requirements.',
    tags: ['Web Apps', 'Mobile', 'POS'],
    thumb: '/assets/images/innerpage/service/svc-software-dev.jpg',
    introTitle: 'Software built around the way your business works.',
    intro: [
      'Every business is different, so off-the-shelf software does not always fit. Uzafasta Group builds custom web apps, mobile applications, and management systems tailored to your exact processes.',
      'From point-of-sale systems and booking platforms to inventory and HR solutions, we design software that saves you time, reduces errors, and helps your team work smarter.'
    ],
    highlights: ['Custom Web & Mobile Applications', 'Point of Sale (POS) Systems', 'Business & Management Systems', 'System Integration & Automation'],
    process: [
      { step: '01', title: 'Requirements', desc: 'We map out your workflow and define exactly what the software must do.' },
      { step: '02', title: 'Prototype', desc: 'We build a working prototype so you see the solution before development.' },
      { step: '03', title: 'Development', desc: 'Our engineers build, test, and refine the system with your feedback.' },
      { step: '04', title: 'Deploy & Maintain', desc: 'We launch the system, train your team, and provide ongoing support.' }
    ],
    faqs: [
      { q: 'How much does custom software cost?', a: 'Costs depend on scope and features. We give you a clear quotation and timeline after understanding your requirements.' },
      { q: 'Do you support the software after delivery?', a: 'Yes. We offer maintenance and support packages to keep your system running smoothly.' }
    ]
  }
];

app.locals.services = services;

app.get(['/services', '/services.html'], (req, res) => {
  res.render('pages/services', {
    services,
    currentService: null,
    redirectPath: '/services',
    enquiryMsg: buildEnquiryMsg(req.query)
  });
});

app.use('/services/:slug', (req, res, next) => {
  const service = services.find(s => s.slug === req.params.slug);
  if (service) {
    return res.render('pages/service-detail', {
      service,
      services,
      currentService: service.slug,
      redirectPath: '/services/' + service.slug,
      enquiryMsg: buildEnquiryMsg(req.query)
    });
  }
  next();
});

// ---- Blog pages (dynamic from database) ----
app.get('/blogs', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, title, slug, excerpt, content, cover_image, video_url, created_at FROM blogs WHERE status = "published" ORDER BY created_at DESC');
    rows.forEach(r => { r.created_at = new Date(r.created_at); });
    res.render('pages/blog-grid', { blogs: rows });
  } catch (e) {
    console.error('Blogs page error:', e.message);
    res.render('pages/blog-grid', { blogs: [] });
  }
});

app.get('/blog-post', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM blogs WHERE status = "published" ORDER BY created_at DESC LIMIT 1');
    if (!rows.length) return res.redirect('/blogs');
    const post = rows[0];
    post.created_at = new Date(post.created_at);
    res.render('pages/blog-post', { post });
  } catch (e) {
    console.error('/blog-post error:', e.message);
    res.redirect('/blogs');
  }
});

app.get('/blogs/:slug', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM blogs WHERE slug = ? AND status = "published"', [req.params.slug]);
    if (!rows.length) return res.status(404).render('pages/404', {});
    const post = rows[0];
    post.created_at = new Date(post.created_at);
    await pool.query('UPDATE blogs SET views = views + 1 WHERE id = ?', [post.id]);
    res.render('pages/blog-post', { post });
  } catch (e) {
    console.error('Blog post error:', e.message);
    res.status(404).render('pages/404', {});
  }
});

// ---- Projects / Portfolio (dynamic from database) ----
app.get(['/projects', '/projects.html'], async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, title, category, description, cover_image, video_url, created_at FROM projects WHERE status = "active" ORDER BY created_at DESC');
    rows.forEach(p => {
      p.videoMime = '';
      p.poster = p.cover_image || '';
      if (p.video_url) {
        var m = String(p.video_url).match(/\.(mp4|webm|ogg|mov)$/i);
        p.videoMime = m ? 'video/' + m[1].toLowerCase() : 'video/mp4';
      }
    });
    res.render('pages/projects', { projects: rows });
  } catch (e) {
    console.error('Projects page error:', e.message);
    res.render('pages/projects', { projects: [] });
  }
});

app.get('/projects/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM projects WHERE id = ? AND status = "active"', [req.params.id]);
    if (!rows.length) return res.status(404).render('pages/404', {});
    const project = rows[0];
    project.videoPoster = project.video_url ? (project.cover_image || '') : '';
    project.videoMime = '';
    project.videoType = '';
    if (project.video_url) {
      const m = String(project.video_url).match(/\.(mp4|webm|ogg|mov)$/i);
      project.videoType = m ? m[1].toLowerCase() : 'mp4';
      project.videoMime = 'video/' + project.videoType;
    }
    res.render('pages/project-detail', { project });
  } catch (e) {
    console.error('Project detail error:', e.message);
    res.status(404).render('pages/404', {});
  }
});

// ---- Static EJS pages ----
pages.forEach((page) => {
  if (page === 'index') return;
  app.get([`/${page}`, `/${page}.html`], (req, res) => {
    res.render(`pages/${page}`, {});
  });
});

// =========================================================
//  ADMIN - auth
// =========================================================
app.get('/admin/login', (req, res) => {
  if (req.session && req.session.adminId) return res.redirect('/admin/dashboard');
  res.render('admin/login', {});
});

app.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).render('admin/login', { error: 'Please enter username and password.' });
  }
  try {
    const [rows] = await pool.query('SELECT * FROM admins WHERE username = ?', [username.trim()]);
    if (!rows.length) return res.status(401).render('admin/login', { error: 'Invalid username or password.' });

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) return res.status(401).render('admin/login', { error: 'Invalid username or password.' });

    req.session.adminId = admin.id;
    res.redirect('/admin/dashboard');
  } catch (e) {
    console.error('Login error:', e.message);
    res.status(500).render('admin/login', { error: 'Login failed. Try again.' });
  }
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// ---- Protect all /admin routes after login/logout ----
app.use('/admin', requireAdmin);

app.get('/admin/change-password', loadAdmin, (req, res) => {
  res.render('admin/change-password', { success: req.session.success });
  req.session.success = null;
});

app.post('/admin/change-password', loadAdmin, async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM admins WHERE id = ?', [req.session.adminId]);
    if (!rows.length) return res.status(400).render('admin/change-password', { error: 'Admin not found.' });

    const admin = rows[0];
    const match = await bcrypt.compare(current_password || '', admin.password_hash);
    if (!match) return res.status(400).render('admin/change-password', { error: 'Current password is incorrect.' });

    if (!new_password || new_password.length < 6) {
      return res.status(400).render('admin/change-password', { error: 'New password must be at least 6 characters.' });
    }
    if (new_password !== confirm_password) {
      return res.status(400).render('admin/change-password', { error: 'New password and confirmation do not match.' });
    }

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE admins SET password_hash = ? WHERE id = ?', [hash, req.session.adminId]);
    req.session.success = 'Password updated successfully!';
    res.redirect('/admin/change-password');
  } catch (e) {
    console.error('Change password error:', e.message);
    res.status(500).render('admin/change-password', { error: 'Failed to update password. Try again.' });
  }
});

app.get('/admin/staff', loadAdmin, requireSuperAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, username, full_name, email, created_at FROM admins ORDER BY created_at ASC');
    res.render('admin/staff', { staff: rows, success: req.session.success });
    req.session.success = null;
  } catch (e) {
    console.error('Staff list error:', e.message);
    res.status(500).render('admin/staff', { staff: [], error: 'Failed to load staff.' });
  }
});

app.post('/admin/staff/add', loadAdmin, requireSuperAdmin, async (req, res) => {
  const { full_name, username, email, password } = req.body;
  if (!full_name || !username || !email || !password) {
    return res.status(400).render('admin/staff', { staff: [], error: 'All fields are required.' });
  }
  if (password.length < 6) {
    return res.status(400).render('admin/staff', { staff: [], error: 'Password must be at least 6 characters.' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO admins (username, full_name, email, password_hash) VALUES (?,?,?,?)',
      [username.trim(), full_name.trim(), email.trim(), hash]
    );
    req.session.success = 'Staff member added successfully. They can log in now.';
    res.redirect('/admin/staff');
  } catch (e) {
    console.error('Staff add error:', e.message);
    const [rows] = await pool.query('SELECT id, username, full_name, email, created_at FROM admins ORDER BY created_at ASC');
    res.status(400).render('admin/staff', {
      staff: rows,
      error: e.code === 'ER_DUP_ENTRY' ? 'Username or email already exists.' : 'Failed to add staff member.'
    });
  }
});

app.post('/admin/staff/:id/delete', loadAdmin, requireSuperAdmin, async (req, res) => {
  if (parseInt(req.params.id) === req.session.adminId) {
    req.session.success = 'You cannot delete your own account.';
    return res.redirect('/admin/staff');
  }
  try {
    await pool.query('DELETE FROM admins WHERE id = ?', [req.params.id]);
    req.session.success = 'Staff member deleted.';
  } catch (e) {
    console.error('Staff delete error:', e.message);
    req.session.success = 'Failed to delete staff member.';
  }
  res.redirect('/admin/staff');
});

//
//  ADMIN - DASHBOARD
//
app.get('/admin/dashboard', loadAdmin, async (req, res) => {
  try {
    const [blogs] = await pool.query('SELECT COUNT(*) AS c FROM blogs');
    const [projects] = await pool.query('SELECT COUNT(*) AS c FROM projects');
    const [inquiries] = await pool.query('SELECT COUNT(*) AS c FROM inquiries');
    const [unread] = await pool.query('SELECT COUNT(*) AS c FROM inquiries WHERE is_viewed = 0');
    const [latestInquiries] = await pool.query(
      'SELECT id, name, email, subject, tracking_code, is_viewed, created_at FROM inquiries ORDER BY created_at DESC LIMIT 8'
    );
    latestInquiries.forEach(r => { r.created_at = new Date(r.created_at); });

    const weekStart = startOfWeek(new Date());
    const weekEnd = addDays(weekStart, 6);
    const startISO = toISODate(weekStart);
    const endISO = toISODate(weekEnd);

    const isSuper = req.admin.role === 'super_admin';

    const [taskStats] = await pool.query(
      `SELECT COUNT(*) AS total, COALESCE(SUM(status = 'completed'), 0) AS done
       FROM tasks WHERE due_date BETWEEN ? AND ?${isSuper ? '' : ' AND staff_id = ?'}`,
      isSuper ? [startISO, endISO] : [startISO, endISO, req.admin.id]
    );

    const [weekTasks] = await pool.query(
      `SELECT t.id, t.title, t.description, t.due_date, t.priority, t.status, t.staff_id,
              a.full_name AS assigned_to
       FROM tasks t
       LEFT JOIN admins a ON a.id = t.staff_id
       WHERE t.due_date BETWEEN ? AND ?${isSuper ? '' : ' AND t.staff_id = ?'}
       ORDER BY t.due_date ASC, t.created_at ASC`,
      isSuper ? [startISO, endISO] : [startISO, endISO, req.admin.id]
    );
    weekTasks.forEach(t => { t.due = new Date(t.due_date); t.canEdit = isSuper || t.staff_id === req.admin.id; });

    let assignTargets = [];
    if (isSuper) {
      const [staffRows] = await pool.query('SELECT id, username, full_name FROM admins WHERE role = "staff" ORDER BY full_name ASC');
      assignTargets = staffRows;
    }

    const dashDays = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      dashDays.push({ iso: toISODate(d), label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) });
    }

    res.render('admin/dashboard', {
      stats: {
        blogs: blogs[0].c,
        projects: projects[0].c,
        inquiries: inquiries[0].c,
        unread: unread[0].c,
        tasksThisWeek: taskStats[0].total,
        tasksDone: taskStats[0].done,
        pendingLeaves: req.pendingLeaveCount || 0
      },
      latestInquiries,
      weekTasks,
      assignTargets,
      dashDays,
      weekStartISO: startISO,
      success: req.session.success,
      error: req.query.error
    });
    req.session.success = null;
  } catch (e) {
    console.error('Dashboard error:', e.message);
    res.status(500).render('admin/dashboard', { error: 'Failed to load dashboard.' });
  }
});

// =========================================================
//  ADMIN - TASK SCHEDULE (weekly staff assignments)
// =========================================================
function getWeekStart(q) {
  const base = q && q.start ? new Date(q.start + 'T00:00:00') : new Date();
  return isNaN(base.getTime()) ? startOfWeek(new Date()) : startOfWeek(base);
}

app.get('/admin/tasks', loadAdmin, async (req, res) => {
  try {
    const weekStart = getWeekStart(req.query);
    const weekEnd = addDays(weekStart, 6);
    const startISO = toISODate(weekStart);
    const endISO = toISODate(weekEnd);
    const prevISO = toISODate(addDays(weekStart, -7));
    const nextISO = toISODate(addDays(weekStart, 7));
    const thisISO = toISODate(startOfWeek(new Date()));
    const isSuper = req.admin.role === 'super_admin';

    const [staffRows] = await pool.query('SELECT id, username, full_name FROM admins WHERE role = "staff" ORDER BY full_name ASC');
    const rotaStaff = isSuper ? staffRows : staffRows.filter(s => s.id === req.admin.id);

    const [tasks] = await pool.query(
      `SELECT t.*, a.full_name AS assigned_to, a.username AS assigned_username,
              c.full_name AS assigned_by_name
       FROM tasks t
       LEFT JOIN admins a ON a.id = t.staff_id
       LEFT JOIN admins c ON c.id = t.created_by
       WHERE t.due_date BETWEEN ? AND ?${isSuper ? '' : ' AND t.staff_id = ?'}
       ORDER BY t.due_date ASC, t.priority DESC, t.created_at ASC`,
      isSuper ? [startISO, endISO] : [startISO, endISO, req.admin.id]
    );
    tasks.forEach(t => {
      t.due = new Date(t.due_date);
      t.canEdit = isSuper || t.staff_id === req.admin.id || t.created_by === req.admin.id;
    });

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const today = new Date();
      days.push({
        iso: toISODate(d),
        weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
        monthDay: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isToday: toISODate(d) === toISODate(today)
      });
    }

    const tasksByDay = {};
    days.forEach(day => {
      tasksByDay[day.iso] = tasks.filter(t => toISODate(t.due) === day.iso);
    });

    const currentQuery = req.query.start ? '?start=' + req.query.start : '';
    const pageUrl = '/admin/tasks' + currentQuery;

    res.render('admin/tasks', {
      tasks,
      rotaStaff,
      assignTargets: staffRows,
      days,
      tasksByDay,
      weekStartISO: startISO,
      weekEndISO: endISO,
      weekLabel: weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) + ' – ' + weekEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      prevWeek: prevISO,
      nextWeek: nextISO,
      thisWeek: thisISO,
      pageUrl,
      isSuper,
      priorityLabel: TASK_PRIORITY,
      priorityClass: TASK_PRIORITY_CLASS,
      statusLabel: TASK_STATUS,
      statusClass: TASK_STATUS_CLASS,
      success: req.session.success,
      error: req.query.error
    });
    req.session.success = null;
  } catch (e) {
    console.error('Tasks page error:', e.message);
    res.status(500).render('admin/tasks', {
      tasks: [], rotaStaff: [], assignTargets: [], days: [], tasksByDay: {},
      weekLabel: null, prevWeek: '', nextWeek: '', thisWeek: '', pageUrl: '/admin/tasks',
      isSuper: req.admin.role === 'super_admin',
      priorityLabel: TASK_PRIORITY, priorityClass: TASK_PRIORITY_CLASS,
      statusLabel: TASK_STATUS, statusClass: TASK_STATUS_CLASS,
      success: req.session.success, error: 'Failed to load the task schedule.'
    });
    req.session.success = null;
  }
});

function taskBack(req) {
  const raw = req.body.back || req.query.back || '/admin/tasks';
  return (typeof raw === 'string' && raw.startsWith('/admin/')) ? raw : '/admin/tasks';
}

app.post('/admin/tasks/add', loadAdmin, requireSuperAdmin, async (req, res) => {
  const back = taskBack(req);
  const { staff_id, title, description, due_date, priority } = req.body;
  if (!staff_id || !title || !due_date) {
    return res.redirect(back + (back.includes('?') ? '&' : '?') + 'error=Assignee, title and due date are required.');
  }
  try {
    const [st] = await pool.query('SELECT id, role FROM admins WHERE id = ?', [staff_id]);
    if (!st.length || st[0].role !== 'staff') {
      return res.redirect(back + (back.includes('?') ? '&' : '?') + 'error=Please choose a valid staff member.');
    }
    await pool.query(
      'INSERT INTO tasks (created_by, staff_id, title, description, due_date, priority) VALUES (?,?,?,?,?,?)',
      [req.admin.id, staff_id, title.trim(), description || null, due_date, ['low', 'medium', 'high'].includes(priority) ? priority : 'medium']
    );
    req.session.success = 'Task assigned successfully.';
    res.redirect(back);
  } catch (e) {
    console.error('Task add error:', e.message);
    res.redirect(back + (back.includes('?') ? '&' : '?') + 'error=Failed to assign task.');
  }
});

app.post('/admin/tasks/:id/status', loadAdmin, async (req, res) => {
  const back = taskBack(req);
  const status = req.body.status;
  if (!['pending', 'in_progress', 'completed'].includes(status)) return res.redirect(back);
  try {
    const [rows] = await pool.query('SELECT id, staff_id, created_by FROM tasks WHERE id = ?', [req.params.id]);
    if (!rows.length) {
      req.session.success = 'Task not found.';
      return res.redirect(back);
    }
    const task = rows[0];
    const allowed = req.admin.role === 'super_admin' || task.staff_id === req.admin.id || task.created_by === req.admin.id;
    if (!allowed) {
      req.session.success = 'You do not have permission to update this task.';
      return res.redirect(back);
    }
    await pool.query(
      'UPDATE tasks SET status = ?, completed_at = IF(? = "completed", NOW(), NULL), updated_at = NOW() WHERE id = ?',
      [status, status, req.params.id]
    );
    req.session.success = 'Task status updated.';
  } catch (e) {
    console.error('Task status error:', e.message);
    req.session.success = 'Failed to update task status.';
  }
  res.redirect(back);
});

app.post('/admin/tasks/:id/delete', loadAdmin, requireSuperAdmin, async (req, res) => {
  const back = taskBack(req);
  try {
    await pool.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    req.session.success = 'Task deleted.';
  } catch (e) {
    console.error('Task delete error:', e.message);
    req.session.success = 'Failed to delete task.';
  }
  res.redirect(back);
});

// =========================================================
//  ADMIN - LEAVE MANAGEMENT
// =========================================================
app.get('/admin/leaves', loadAdmin, async (req, res) => {
  try {
    const isSuper = req.admin.role === 'super_admin';
    let leaves;
    if (isSuper) {
      [leaves] = await pool.query(
        `SELECT l.*, a.full_name AS staff_name, a.username AS staff_username,
                r.full_name AS reviewer_name
         FROM leaves l
         LEFT JOIN admins a ON a.id = l.staff_id
         LEFT JOIN admins r ON r.id = l.reviewed_by
         ORDER BY (l.status = 'pending') DESC, l.created_at DESC`
      );
    } else {
      [leaves] = await pool.query(
        `SELECT l.*, a.full_name AS staff_name, r.full_name AS reviewer_name
         FROM leaves l
         LEFT JOIN admins a ON a.id = l.staff_id
         LEFT JOIN admins r ON r.id = l.reviewed_by
         WHERE l.staff_id = ?
         ORDER BY l.created_at DESC`,
        [req.admin.id]
      );
    }
    leaves.forEach(v => {
      v.start = new Date(v.start_date);
      v.end = new Date(v.end_date);
      v.reviewed_at = v.reviewed_at ? new Date(v.reviewed_at) : null;
    });

    let pendingTotal = 0, approvedTotal = 0, rejectedTotal = 0;
    if (isSuper) {
      const [s] = await pool.query('SELECT status, COUNT(*) AS c FROM leaves GROUP BY status');
      s.forEach(row => {
        if (row.status === 'pending') pendingTotal = row.c;
        if (row.status === 'approved') approvedTotal = row.c;
        if (row.status === 'rejected') rejectedTotal = row.c;
      });
    } else {
      pendingTotal = req.pendingLeaveCount || 0;
    }

    res.render('admin/leaves', {
      leaves,
      isSuper,
      pendingTotal,
      approvedTotal,
      rejectedTotal,
      leaveTypeLabel: LEAVE_TYPES,
      leaveStatusLabel: LEAVE_STATUS,
      leaveStatusClass: LEAVE_STATUS_CLASS,
      success: req.session.success,
      error: req.query.error
    });
    req.session.success = null;
  } catch (e) {
    console.error('Leaves page error:', e.message);
    res.status(500).render('admin/leaves', {
      leaves: [], isSuper: req.admin.role === 'super_admin',
      pendingTotal: 0, approvedTotal: 0, rejectedTotal: 0,
      leaveTypeLabel: LEAVE_TYPES, leaveStatusLabel: LEAVE_STATUS, leaveStatusClass: LEAVE_STATUS_CLASS,
      success: req.session.success, error: 'Failed to load leave requests.'
    });
    req.session.success = null;
  }
});

app.post('/admin/leaves/request', loadAdmin, async (req, res) => {
  const { leave_type, start_date, end_date, reason } = req.body;
  if (!leave_type || !start_date || !end_date || !Object.prototype.hasOwnProperty.call(LEAVE_TYPES, leave_type)) {
    return res.redirect('/admin/leaves?error=Please select leave type and dates.');
  }
  const start = new Date(start_date + 'T00:00:00');
  const end = new Date(end_date + 'T00:00:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return res.redirect('/admin/leaves?error=End date cannot be before start date.');
  }
  const days = Math.round((end - start) / 86400000) + 1;
  try {
    await pool.query(
      'INSERT INTO leaves (staff_id, leave_type, start_date, end_date, days, reason) VALUES (?,?,?,?,?,?)',
      [req.admin.id, leave_type, start_date, end_date, days, reason ? reason.trim() : null]
    );
    req.session.success = 'Leave request submitted. Awaiting approval.';
    res.redirect('/admin/leaves');
  } catch (e) {
    console.error('Leave request error:', e.message);
    res.redirect('/admin/leaves?error=Failed to submit leave request.');
  }
});

app.post('/admin/leaves/:id/approve', loadAdmin, requireSuperAdmin, async (req, res) => {
  try {
    await pool.query(
      'UPDATE leaves SET status = "approved", reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      [req.admin.id, req.params.id]
    );
    req.session.success = 'Leave request approved.';
  } catch (e) {
    console.error('Leave approve error:', e.message);
    req.session.success = 'Failed to approve request.';
  }
  res.redirect('/admin/leaves');
});

app.post('/admin/leaves/:id/reject', loadAdmin, requireSuperAdmin, async (req, res) => {
  try {
    await pool.query(
      'UPDATE leaves SET status = "rejected", reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      [req.admin.id, req.params.id]
    );
    req.session.success = 'Leave request rejected.';
  } catch (e) {
    console.error('Leave reject error:', e.message);
    req.session.success = 'Failed to reject request.';
  }
  res.redirect('/admin/leaves');
});

app.post('/admin/leaves/:id/delete', loadAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT staff_id, status FROM leaves WHERE id = ?', [req.params.id]);
    if (!rows.length) {
      req.session.success = 'Leave request not found.';
      return res.redirect('/admin/leaves');
    }
    const allowed = req.admin.role === 'super_admin' || (rows[0].staff_id === req.admin.id && rows[0].status === 'pending');
    if (!allowed) {
      req.session.success = 'You can only cancel your own pending leave requests.';
      return res.redirect('/admin/leaves');
    }
    await pool.query('DELETE FROM leaves WHERE id = ?', [req.params.id]);
    req.session.success = rows[0].status === 'pending' ? 'Leave request cancelled.' : 'Leave record deleted.';
  } catch (e) {
    console.error('Leave delete error:', e.message);
    req.session.success = 'Failed to delete request.';
  }
  res.redirect('/admin/leaves');
});

// =========================================================
//  ADMIN - BLOGS CRUD
// =========================================================
app.get('/admin/blogs', loadAdmin, async (req, res) => {
  try {
    const [blogs] = await pool.query('SELECT id, title, status, created_at FROM blogs ORDER BY created_at DESC');
    blogs.forEach(b => { b.created_at = new Date(b.created_at); });
    res.render('admin/blogs', { blogs, success: req.session.success });
    req.session.success = null;
  } catch (e) {
    console.error('Blogs list error:', e.message);
    res.status(500).render('admin/blogs', { error: 'Failed to load blogs.' });
  }
});

app.get('/admin/blogs/new', loadAdmin, (req, res) => {
  res.render('admin/blog-form', { blog: null });
});

app.post('/admin/blogs/new', loadAdmin, blogUpload.fields([{ name: 'cover_image', maxCount: 1 }, { name: 'video_file', maxCount: 1 }]), async (req, res) => {
  const { title, excerpt, content, status, category, video_url: videoUrlInput } = req.body;
  if (!title || !content) {
    return res.status(400).render('admin/blog-form', { blog: null, error: 'Title and content are required.' });
  }
  const coverImage = req.files && req.files['cover_image'] ? '/uploads/' + req.files['cover_image'][0].filename : null;
  let videoUrl = null;
  if (req.files && req.files['video_file'] && req.files['video_file'][0]) {
    videoUrl = '/uploads/' + req.files['video_file'][0].filename;
  } else if (videoUrlInput && videoUrlInput.trim()) {
    videoUrl = videoUrlInput.trim();
  }
  try {
    await pool.query(
      'INSERT INTO blogs (admin_id, title, slug, category, excerpt, content, cover_image, video_url, status) VALUES (?,?,?,?,?,?,?,?,?)',
      [req.session.adminId, title.trim(), slugify(title), category || null, excerpt || null, content, coverImage, videoUrl, status || 'published']
    );
    req.session.success = 'Blog published successfully.';
    res.redirect('/admin/blogs');
  } catch (e) {
    console.error('Blog create error:', e.message);
    res.status(500).render('admin/blog-form', { blog: null, error: 'Failed to save blog.' });
  }
});

app.get('/admin/blogs/:id/edit', loadAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM blogs WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.redirect('/admin/blogs');
    res.render('admin/blog-form', { blog: rows[0] });
  } catch (e) {
    console.error('Blog edit get error:', e.message);
    res.redirect('/admin/blogs');
  }
});

app.post('/admin/blogs/:id/edit', loadAdmin, blogUpload.fields([{ name: 'cover_image', maxCount: 1 }, { name: 'video_file', maxCount: 1 }]), async (req, res) => {
  const { title, excerpt, content, status, category, video_url: videoUrlInput } = req.body;
  if (!title || !content) {
    return res.status(400).render('admin/blog-form', { blog: { id: req.params.id, title, category, excerpt, content, status }, error: 'Title and content are required.' });
  }
  try {
    const [existing] = await pool.query('SELECT cover_image, video_url FROM blogs WHERE id = ?', [req.params.id]);
    const coverImage = req.files && req.files['cover_image'] && req.files['cover_image'][0]
      ? '/uploads/' + req.files['cover_image'][0].filename
      : (existing[0] ? existing[0].cover_image : null);

    let videoUrl;
    if (req.files && req.files['video_file'] && req.files['video_file'][0]) {
      videoUrl = '/uploads/' + req.files['video_file'][0].filename;
    } else if (videoUrlInput && videoUrlInput.trim()) {
      videoUrl = videoUrlInput.trim();
    } else if (videoUrlInput === '' || videoUrlInput === undefined) {
      videoUrl = existing[0] ? existing[0].video_url : null;
    } else {
      videoUrl = existing[0] ? existing[0].video_url : null;
    }

    await pool.query(
      'UPDATE blogs SET title=?, slug=?, category=?, excerpt=?, content=?, cover_image=?, video_url=?, status=?, updated_at=NOW() WHERE id=?',
      [title.trim(), slugify(title), category || null, excerpt || null, content, coverImage, videoUrl, status || 'published', req.params.id]
    );
    req.session.success = 'Blog updated successfully.';
    res.redirect('/admin/blogs');
  } catch (e) {
    console.error('Blog edit error:', e.message);
    res.status(500).render('admin/blog-form', { blog: { id: req.params.id, title, category, excerpt, content, status }, error: 'Failed to update blog.' });
  }
});

app.post('/admin/blogs/:id/delete', loadAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM blogs WHERE id = ?', [req.params.id]);
    req.session.success = 'Blog deleted.';
  } catch (e) {
    console.error('Blog delete error:', e.message);
    req.session.success = 'Failed to delete blog.';
  }
  res.redirect('/admin/blogs');
});

// =========================================================
//  ADMIN - PROJECTS CRUD
// =========================================================
app.get('/admin/projects', loadAdmin, async (req, res) => {
  try {
    const [projects] = await pool.query('SELECT id, title, category, client, status, created_at FROM projects ORDER BY created_at DESC');
    projects.forEach(p => { p.created_at = new Date(p.created_at); });
    res.render('admin/projects', { projects, success: req.session.success });
    req.session.success = null;
  } catch (e) {
    console.error('Projects list error:', e.message);
    res.status(500).render('admin/projects', { error: 'Failed to load projects.' });
  }
});

app.get('/admin/projects/new', loadAdmin, (req, res) => {
  res.render('admin/project-form', { project: null });
});

app.post('/admin/projects/new', loadAdmin, projectUpload.fields([{ name: 'cover_image', maxCount: 1 }, { name: 'video_file', maxCount: 1 }]), async (req, res) => {
  const { title, category, client, description, link, status, video_url: videoUrlInput } = req.body;
  if (!title || !category || !description) {
    return res.status(400).render('admin/project-form', { project: null, error: 'Title, category and description are required.' });
  }
  const coverImage = req.files && req.files['cover_image'] && req.files['cover_image'][0] ? '/uploads/' + req.files['cover_image'][0].filename : null;
  let videoUrl = req.files && req.files['video_file'] && req.files['video_file'][0]
    ? '/uploads/' + req.files['video_file'][0].filename
    : (videoUrlInput && videoUrlInput.trim() ? videoUrlInput.trim() : null);
  try {
    await pool.query(
      'INSERT INTO projects (admin_id, title, category, client, description, cover_image, video_url, link, status) VALUES (?,?,?,?,?,?,?,?,?)',
      [req.session.adminId, title.trim(), category.trim(), client || null, description, coverImage, videoUrl, link || null, status || 'active']
    );
    req.session.success = 'Project added successfully.';
    res.redirect('/admin/projects');
  } catch (e) {
    console.error('Project create error:', e.message);
    res.status(500).render('admin/project-form', { project: null, error: 'Failed to save project.' });
  }
});

app.get('/admin/projects/:id/edit', loadAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.redirect('/admin/projects');
    res.render('admin/project-form', { project: rows[0] });
  } catch (e) {
    console.error('Project edit get error:', e.message);
    res.redirect('/admin/projects');
  }
});

app.post('/admin/projects/:id/edit', loadAdmin, projectUpload.fields([{ name: 'cover_image', maxCount: 1 }, { name: 'video_file', maxCount: 1 }]), async (req, res) => {
  const { title, category, client, description, link, status, video_url: videoUrlInput } = req.body;
  if (!title || !category || !description) {
    return res.status(400).render('admin/project-form', { project: { id: req.params.id, title, category, client, description, link, status }, error: 'Title, category and description are required.' });
  }
  try {
    const [existing] = await pool.query('SELECT cover_image, video_url FROM projects WHERE id = ?', [req.params.id]);
    const coverImage = req.files && req.files['cover_image'] && req.files['cover_image'][0]
      ? '/uploads/' + req.files['cover_image'][0].filename
      : (existing[0] ? existing[0].cover_image : null);
    let videoUrl;
    if (req.files && req.files['video_file'] && req.files['video_file'][0]) {
      videoUrl = '/uploads/' + req.files['video_file'][0].filename;
    } else if (videoUrlInput && videoUrlInput.trim()) {
      videoUrl = videoUrlInput.trim();
    } else {
      videoUrl = existing[0] ? existing[0].video_url : null;
    }

    await pool.query(
      'UPDATE projects SET title=?, category=?, client=?, description=?, cover_image=?, video_url=?, link=?, status=?, updated_at=NOW() WHERE id=?',
      [title.trim(), category.trim(), client || null, description, coverImage, videoUrl, link || null, status || 'active', req.params.id]
    );
    req.session.success = 'Project updated successfully.';
    res.redirect('/admin/projects');
  } catch (e) {
    console.error('Project edit error:', e.message);
    res.status(500).render('admin/project-form', { project: { id: req.params.id, title, category, client, description, link, status }, error: 'Failed to update project.' });
  }
});

app.post('/admin/projects/:id/delete', loadAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM projects WHERE id = ?', [req.params.id]);
    req.session.success = 'Project deleted.';
  } catch (e) {
    console.error('Project delete error:', e.message);
    req.session.success = 'Failed to delete project.';
  }
  res.redirect('/admin/projects');
});

// =========================================================
//  ADMIN - INQUIRIES
// =========================================================
app.get('/admin/inquiries', loadAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM inquiries ORDER BY is_viewed ASC, created_at DESC');
    rows.forEach(r => { r.created_at = new Date(r.created_at); r.replied_at = r.replied_at ? new Date(r.replied_at) : null; });
    res.render('admin/inquiries', { inquiries: rows, success: req.session.success });
    req.session.success = null;
  } catch (e) {
    console.error('Inquiries list error:', e.message);
    res.status(500).render('admin/inquiries', { error: 'Failed to load inquiries.' });
  }
});

app.get('/admin/inquiries/:id', loadAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM inquiries WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.redirect('/admin/inquiries');
    const inq = rows[0];
    inq.created_at = new Date(inq.created_at);
    inq.replied_at = inq.replied_at ? new Date(inq.replied_at) : null;
    if (!inq.is_viewed) {
      await pool.query('UPDATE inquiries SET is_viewed = 1 WHERE id = ?', [inq.id]);
      inq.is_viewed = 1;
    }
    res.render('admin/inquiry-detail', { inquiry: inq, success: req.session.success });
    req.session.success = null;
  } catch (e) {
    console.error('Inquiry detail error:', e.message);
    res.redirect('/admin/inquiries');
  }
});

app.post('/admin/inquiries/:id/reply', loadAdmin, async (req, res) => {
  const reply = (req.body.reply || '').trim();
  try {
    if (reply) {
      await pool.query('UPDATE inquiries SET reply = ?, replied_at = NOW(), is_viewed = 1 WHERE id = ?', [reply, req.params.id]);
      req.session.success = 'Reply sent. The client can now see it from the Track Inquiry page.';
    }
  } catch (e) {
    console.error('Inquiry reply error:', e.message);
    req.session.success = 'Failed to send reply.';
  }
  res.redirect('/admin/inquiries/' + req.params.id);
});

// ---- 404 ----
app.use((req, res) => {
  res.status(404).render('pages/404', {});
});

app.listen(PORT, () => {
  console.log(`UzaFasta Group running at http://localhost:${PORT}`);
  console.log(`Admin panel at http://localhost:${PORT}/admin/login`);
});