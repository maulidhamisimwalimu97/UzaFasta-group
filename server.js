const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
}));

const year = new Date().getFullYear();

const pages = [
  'index',
  'index-2',
  'index-3',
  'about',
  'services',
  'service-details',
  'projects',
  'project-details',
  'blog-grid',
  'blog-standard',
  'blog-details',
  'contact',
  'faq',
  'pricing',
  'team',
  'team-details',
  '404'
];

app.get(['/', '/index', '/index.html'], (req, res) => {
  res.render('pages/index', { year });
});

const services = [
  {
    slug: 'digital-marketing',
    name: 'Digital Marketing',
    icon: 'fa-bullhorn',
    short: 'Grow your brand, reach the right audience, and turn social media into a powerful business channel.',
    tags: ['Social Media', 'SEO', 'Content', 'Ads'],
    thumb: '/assets/images/innerpage/service/svc-digital-marketing.jpg',
    introTitle: 'Marketing that puts your brand in front of the right customers.',
    intro: [
      'Uzafasta Group helps your business get found, get followed, and get customers. From social media management and search engine optimisation to paid advertising and content marketing, we build campaigns that deliver measurable results.',
      'We start by understanding who your customers are and where they spend time online. Then we craft content, run targeted ads, and optimise continuously to make sure every shilling of your marketing budget works harder for you.'
    ],
    highlights: [
      'Social Media Management & Content',
      'SEO & Google Ranking',
      'Paid Ads (Facebook, Instagram, Google)',
      'Email & WhatsApp Marketing'
    ],
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
    slug: 'web-design-development',
    name: 'Website Design & Development',
    icon: 'fa-code',
    short: 'Professional, responsive, and modern websites designed to represent your brand and help your business grow.',
    tags: ['Corporate', 'WordPress', 'Custom'],
    thumb: '/assets/images/innerpage/service/svc-web-development.jpg',
    introTitle: 'Websites that look great, load fast, and turn visitors into customers.',
    intro: [
      'Your website is your digital storefront. Uzafasta Group designs and builds modern, mobile-friendly websites for businesses, organisations, and institutions across Tanzania.',
      'Whether you need a corporate site, a landing page, or a full custom platform, we deliver clean designs, fast performance, and features that make it easy for your customers to find and contact you.'
    ],
    highlights: [
      'Corporate & Business Websites',
      'Custom Web Design (WordPress / HTML)',
      'Landing Pages & Portfolios',
      'Speed Optimisation & SEO Setup'
    ],
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
    slug: 'video-production',
    name: 'Video Production',
    icon: 'fa-video',
    short: 'We create engaging visual content that helps businesses tell their stories and connect with their audience.',
    tags: ['Promo Videos', 'Events', 'Photography'],
    thumb: '/assets/images/innerpage/service/svc-video-production.jpg',
    introTitle: 'Stories your audience will remember.',
    intro: [
      'Video is the most powerful way to connect with your audience. Uzafasta Group produces professional corporate videos, product promos, event coverage, and brand content that help your business stand out.',
      'From scripting and filming to editing and final delivery, our team handles everything so you get polished, share-ready content for your website, social media, and advertising.'
    ],
    highlights: [
      'Brand & Corporate Videos',
      'Product Promos & Adverts',
      'Event & Documentary Coverage',
      'Editing, Colouring & Motion Graphics'
    ],
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
    slug: 'graphic-design',
    name: 'Graphic Design',
    icon: 'fa-palette',
    short: 'Creative designs that make your brand recognizable, professional, and memorable.',
    tags: ['Logos', 'Branding', 'Print'],
    thumb: '/assets/images/innerpage/service/svc-graphic-design.jpg',
    introTitle: 'Design that makes your brand unforgettable.',
    intro: [
      'Great design builds trust. Uzafasta Group creates logos, brand identities, social media creatives, posters, banners, and print materials that give your business a professional, consistent look.',
      'We design with your audience in mind — combining creativity and strategy to make sure your brand is not only beautiful but also effective at attracting and keeping customers.'
    ],
    highlights: [
      'Logo & Brand Identity Design',
      'Social Media Creatives',
      'Business Cards, Flyers & Banners',
      'Packaging & Print Design'
    ],
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
    slug: 'ecommerce-solutions',
    name: 'E-Commerce Solutions',
    icon: 'fa-cart-plus',
    short: 'Take your business online with an e-commerce platform designed to help you sell and manage customers.',
    tags: ['Online Stores', 'Payments', 'Orders'],
    thumb: '/assets/images/innerpage/service/svc-ecommerce.jpg',
    introTitle: 'Sell online, 24 hours a day.',
    intro: [
      'Take your business online with a fast, secure online store. Uzafasta Group builds e-commerce platforms in Tanzania that let you showcase products, accept payments, and manage orders from one dashboard.',
      'We handle everything from product setup and payment integration (mobile money, cards) to delivery management — so you can start selling without the technical headache.'
    ],
    highlights: [
      'Online Store Development',
      'Mobile Money & Card Payments',
      'Order & Inventory Management',
      'Store Setup & Training'
    ],
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
    slug: 'software-development',
    name: 'Software Development',
    icon: 'fa-code-branch',
    short: 'Custom software solutions designed around your business processes and requirements.',
    tags: ['Web Apps', 'Mobile', 'POS'],
    thumb: '/assets/images/innerpage/service/svc-software-dev.jpg',
    introTitle: 'Software built around the way your business works.',
    intro: [
      'Every business is different, so off-the-shelf software does not always fit. Uzafasta Group builds custom web apps, mobile applications, and management systems tailored to your exact processes.',
      'From point-of-sale systems and booking platforms to inventory and HR solutions, we design software that saves you time, reduces errors, and helps your team work smarter.'
    ],
    highlights: [
      'Custom Web & Mobile Applications',
      'Point of Sale (POS) Systems',
      'Business & Management Systems',
      'System Integration & Automation'
    ],
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

app.use('/services/:slug', (req, res, next) => {
  const service = services.find(s => s.slug === req.params.slug);
  if (service) {
    return res.render('pages/service-detail', { year, service, services });
  }
  next();
});

pages.forEach((page) => {
  if (page === 'index') return;
  app.get([`/${page}`, `/${page}.html`], (req, res) => {
    res.render(`pages/${page}`, { year });
  });
});

app.use((req, res) => {
  res.render('pages/404', { year });
});

app.listen(PORT, () => {
  console.log(`UzaFasta Group running at http://localhost:${PORT}`);
});
