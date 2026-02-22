/* ═══════════════════════════════════════
   FIRST UNICORN INTERIORS — MAIN JS
   Nav, animations, forms, gallery, lightbox
═══════════════════════════════════════ */

(function() {
  'use strict';

  // ─── NAV: Transparent → Solid on scroll ─────────────
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 60);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ─── MOBILE MENU ────────────────────────────────────
  const hamburger = document.querySelector('.nav-hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const mobileOverlay = document.querySelector('.mobile-menu-overlay');

  function toggleMobile() {
    hamburger?.classList.toggle('open');
    mobileMenu?.classList.toggle('open');
    mobileOverlay?.classList.toggle('open');
    document.body.style.overflow = mobileMenu?.classList.contains('open') ? 'hidden' : '';
  }

  hamburger?.addEventListener('click', toggleMobile);
  mobileOverlay?.addEventListener('click', toggleMobile);
  mobileMenu?.querySelectorAll('a').forEach(a => a.addEventListener('click', toggleMobile));

  // ─── MEGA DROPDOWN (touch support) ──────────────────
  document.querySelectorAll('.nav-links > li').forEach(li => {
    const dropdown = li.querySelector('.nav-dropdown-menu');
    if (!dropdown) return;
    li.addEventListener('click', (e) => {
      if (window.innerWidth <= 1024) return;
      const link = li.querySelector(':scope > a');
      if (e.target === link || link?.contains(e.target)) {
        if (!dropdown.classList.contains('touch-open')) {
          e.preventDefault();
          document.querySelectorAll('.nav-dropdown-menu.touch-open').forEach(d => d.classList.remove('touch-open'));
          dropdown.classList.add('touch-open');
        }
      }
    });
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-links')) {
      document.querySelectorAll('.nav-dropdown-menu.touch-open').forEach(d => d.classList.remove('touch-open'));
    }
  });

  // ─── NUMBER COUNTER ANIMATION ──────────────────────
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const animateCounter = (el) => {
      const target = parseInt(el.getAttribute('data-count'), 10);
      const suffix = el.getAttribute('data-suffix') || '';
      const duration = 2000;
      const start = performance.now();
      const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.floor(target * eased) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    counters.forEach(c => counterObserver.observe(c));
  }

  // ─── SCROLL FADE-IN ANIMATIONS ─────────────────────
  const fadeEls = document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right');
  if (fadeEls.length) {
    const fadeObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          fadeObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    fadeEls.forEach(el => fadeObserver.observe(el));
  }

  // ─── PORTFOLIO FILTER ──────────────────────────────
  const filterBtns = document.querySelectorAll('.portfolio-filter');
  const portfolioItems = document.querySelectorAll('.portfolio-item');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');

      portfolioItems.forEach(item => {
        if (filter === 'all' || item.getAttribute('data-category') === filter) {
          item.style.display = '';
          item.style.opacity = '0';
          requestAnimationFrame(() => { item.style.opacity = '1'; });
        } else {
          item.style.opacity = '0';
          setTimeout(() => { item.style.display = 'none'; }, 300);
        }
      });
    });
  });

  // ─── FAQ ACCORDION ─────────────────────────────────
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const answer = item.querySelector('.faq-answer');
      const isOpen = item.classList.contains('open');

      // Close all others in same list
      item.closest('.faq-list')?.querySelectorAll('.faq-item.open').forEach(openItem => {
        if (openItem !== item) {
          openItem.classList.remove('open');
          openItem.querySelector('.faq-answer').style.maxHeight = '0';
        }
      });

      if (isOpen) {
        item.classList.remove('open');
        answer.style.maxHeight = '0';
      } else {
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  // ─── HORIZONTAL GALLERY (drag to scroll) ───────────
  document.querySelectorAll('.gallery-scroll').forEach(gallery => {
    let isDown = false, startX, scrollLeft;

    gallery.addEventListener('mousedown', (e) => {
      isDown = true;
      gallery.classList.add('dragging');
      startX = e.pageX - gallery.offsetLeft;
      scrollLeft = gallery.scrollLeft;
    });
    gallery.addEventListener('mouseleave', () => { isDown = false; gallery.classList.remove('dragging'); });
    gallery.addEventListener('mouseup', () => { isDown = false; gallery.classList.remove('dragging'); });
    gallery.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - gallery.offsetLeft;
      gallery.scrollLeft = scrollLeft - (x - startX) * 1.5;
    });
  });

  // ─── LIGHTBOX ──────────────────────────────────────
  const lightbox = document.querySelector('.lightbox');
  const lightboxImg = lightbox?.querySelector('img');
  let lightboxImages = [];
  let lightboxIndex = 0;

  function openLightbox(images, index) {
    lightboxImages = images;
    lightboxIndex = index;
    if (lightboxImg) lightboxImg.src = images[index];
    lightbox?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox?.classList.remove('open');
    document.body.style.overflow = '';
  }

  function navigateLightbox(dir) {
    lightboxIndex = (lightboxIndex + dir + lightboxImages.length) % lightboxImages.length;
    if (lightboxImg) lightboxImg.src = lightboxImages[lightboxIndex];
  }

  lightbox?.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
  lightbox?.querySelector('.lightbox-prev')?.addEventListener('click', () => navigateLightbox(-1));
  lightbox?.querySelector('.lightbox-next')?.addEventListener('click', () => navigateLightbox(1));
  lightbox?.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', (e) => {
    if (!lightbox?.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') navigateLightbox(-1);
    if (e.key === 'ArrowRight') navigateLightbox(1);
  });

  // Attach lightbox to gallery items
  document.querySelectorAll('.service-gallery, .portfolio-grid').forEach(container => {
    const items = container.querySelectorAll('[data-lightbox]');
    items.forEach((item, i) => {
      item.addEventListener('click', () => {
        const images = Array.from(items).map(el => el.getAttribute('data-lightbox'));
        openLightbox(images, i);
      });
    });
  });

  // ─── FORM → WHATSAPP ──────────────────────────────
  document.querySelectorAll('.quote-form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = data.get('name') || '';
      const phone = data.get('phone') || '';
      const service = data.get('service') || '';
      const community = data.get('community') || '';
      const message = data.get('message') || '';

      // Validate
      if (!name || !phone) {
        alert('Please fill in your name and phone number.');
        return;
      }

      const text = [
        `Hi, I'd like to discuss a project.`,
        ``,
        `Name: ${name}`,
        phone ? `Phone: ${phone}` : '',
        service ? `Service: ${service}` : '',
        community ? `Community: ${community}` : '',
        message ? `Details: ${message}` : '',
      ].filter(Boolean).join('\n');

      window.open(`https://wa.me/971526455121?text=${encodeURIComponent(text)}`, '_blank');
    });
  });

  // ─── LAZY LOAD IMAGES ──────────────────────────────
  if ('IntersectionObserver' in window) {
    const lazyImages = document.querySelectorAll('img[data-src]');
    const imgObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.getAttribute('data-src');
          img.removeAttribute('data-src');
          imgObserver.unobserve(img);
        }
      });
    }, { rootMargin: '200px' });
    lazyImages.forEach(img => imgObserver.observe(img));
  }

  // ─── SMOOTH SCROLL for anchor links ────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

})();
