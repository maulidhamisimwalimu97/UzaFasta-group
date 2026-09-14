/* =====================================================
   UzaFasta - Shared Header (Topbar) & Footer
   Edit ONLY this file to change the topbar / footer
   on ALL pages. Loaded before theme.js on every page.
   ES5-safe: works even in older browsers (IE11/old Safari).
   ===================================================== */
(function () {
  var HEADER_HTML = [
    '<!--=== Start  Header Area  ===-->',
    '<header class="header-area header-four">',
    '<div class="header-navigation">',
    '<div class="container-fluid">',
    '<div class="primary-menu">',
    '<div class="site-branding">',
    '<a href="index.html" class="brand-logo"><img src="assets/images/innerpage/logo/logo-main.png" alt="Brand Logo"></a>',
    '</div>',
    '<div class="theme-nav-menu">',
    '<div class="theme-menu-top d-block d-xl-none">',
    '<div class="site-branding">',
    '<a href="index.html" class="brand-logo"><img src="assets/images/innerpage/logo/logo-main.png" alt="Brand Logo"></a>',
    '</div>',
    '</div>',
    '<nav class="main-menu">',
    '<ul>',
    '<li class="menu-item"><a href="index.html">Home</a></li>',
    '<li class="menu-item"><a href="about.html">About Us</a></li>',
    '<li class="menu-item"><a href="services.html">Services</a></li>',
    '<li class="menu-item"><a href="projects.html">Portfolio</a></li>',
    '<li class="menu-item"><a href="#">Our Process</a></li>',
    '<li class="menu-item"><a href="contact.html">Contact Us</a></li>',
    '</ul>',
    '</nav>',
    '<div class="theme-menu-bottom mt-50 d-block d-xl-none">',
    '<h5>Follow Us</h5>',
    '<ul class="social-link">',
    '<li><a href="#"><i class="fab fa-facebook-f"></i></a></li>',
    '<li><a href="#"><i class="fab fa-twitter"></i></a></li>',
    '<li><a href="#"><i class="fab fa-linkedin-in"></i></a></li>',
    '<li><a href="#"><i class="fab fa-youtube"></i></a></li>',
    '</ul>',
    '</div>',
    '</div>',
    '<div class="nav-right-item">',
    '<div class="navbar-toggler">',
    '<span></span>',
    '<span></span>',
    '<span></span>',
    '</div>',
    '</div>',
    '</div>',
    '</div>',
    '</div>',
    '</header><!--=== End  Header Area  ===-->'
  ].join('\n');

  var FOOTER_HTML = [
    '<footer class="main-footer uzafasta-footer">',
    '<div class="container">',
    '<div class="copyright-area">',
    '<div class="row">',
    '<div class="col-lg-12">',
    '<div class="copyright-text text-center">',
    '<p>&copy; <span class="uzafasta-year" id="uzafasta-year"></span> <a href="index.html" class="uzafasta-brand">Uzafasta Group</a>. All Rights Reserved.</p>',
    '</div>',
    '</div>',
    '</div>',
    '</div>',
    '</div>',
    '</footer>'
  ].join('\n');

  function inject(sel, html) {
    var els = document.querySelectorAll(sel);
    var i;
    for (i = 0; i < els.length; i++) {
      var holder = document.createElement('div');
      holder.style.display = 'none';
      holder.innerHTML = html;
      while (holder.firstChild) {
        els[i].parentNode.insertBefore(holder.firstChild, els[i]);
      }
      els[i].parentNode.removeChild(els[i]);
    }
  }

  function setYear() {
    var y = new Date().getFullYear();
    var els = document.querySelectorAll('#uzafasta-year');
    var i;
    for (i = 0; i < els.length; i++) {
      els[i].textContent = y;
    }
  }

  function run() {
    inject('[data-uzafasta="header"]', HEADER_HTML);
    inject('[data-uzafasta="footer"]', FOOTER_HTML);
    setYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();