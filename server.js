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