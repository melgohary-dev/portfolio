(() => {
  'use strict';

  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];

  // ==============================
  // PAGE START
  // ==============================
  function startPage() {
    animateHero();
    requestAnimationFrame(() => {
      initParticles();
      initScrollObservers();
      initLazyScroll();
      initSmoothScroll();
      initNav();
      initMobileMenu();
      initBackToTop();
      requestAnimationFrame(() => {
        initTyping();
        initParallax();
      });
    });
  }

  function animateHero() {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const els = $$('.hero [data-hero]');
    els.forEach((el, i) => {
      if (!reduced) el.style.transition = `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${0.08 + i * 0.1}s, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${0.08 + i * 0.1}s`;
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });

    const counters = $$('.stat-number');
    if (reduced) {
      counters.forEach(el => { el.textContent = el.dataset.count; });
      return;
    }

    setTimeout(() => {
      counters.forEach(el => {
        const target = parseInt(el.dataset.count);
        const duration = 1400;
        const start = performance.now();
        function tick(now) {
          const t = Math.min((now - start) / duration, 1);
          el.textContent = Math.round(target * t);
          if (t < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, 800);
  }

  // ==============================
  // PARTICLES
  // ==============================
  function initParticles() {
    const canvas = $('#particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, raf = 0, last = -1000, running = true, seeded = false;
    const particles = [];

    function seed() {
      const count = Math.min(40, Math.floor(w / 40));
      particles.length = 0;
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.0 + 0.3,
          dx: (Math.random() - 0.5) * 0.08,
          dy: (Math.random() - 0.5) * 0.08,
          o: Math.random() * 0.2 + 0.03,
        });
      }
    }

    const ro = new ResizeObserver((entries) => {
      w = canvas.width = Math.round(entries[0].contentRect.width);
      h = canvas.height = Math.round(entries[0].contentRect.height);
      seed();
      seeded = true;
    });
    ro.observe(canvas);

    function draw(now) {
      if (!seeded) {
        raf = requestAnimationFrame(draw);
        return;
      }
      if (now - last < 33) {
        raf = requestAnimationFrame(draw);
        return;
      }
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(249, 115, 22, ${p.o})`;
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > w) p.dx *= -1;
        if (p.y < 0 || p.y > h) p.dy *= -1;
      }
      if (running) raf = requestAnimationFrame(draw);
    }

    if (reduced) {
      requestAnimationFrame(() => draw(0));
      return;
    }
    document.addEventListener('visibilitychange', () => {
      running = !document.hidden;
      cancelAnimationFrame(raf);
      if (running) raf = requestAnimationFrame(draw);
    });
    raf = requestAnimationFrame(draw);
  }

  // ==============================
  // SMOOTH SCROLL
  // ==============================
  function smoothScrollTo(top, duration) {
    const start = window.scrollY;
    const diff = top - start;
    if (Math.abs(diff) < 1) return;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
      window.scrollTo(0, start + diff * ease);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function initSmoothScroll() {
    $$('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const id = anchor.getAttribute('href');
        if (id === '#') return;
        const target = $(id);
        if (!target) return;
        e.preventDefault();
        const navHeight = $('#nav')?.offsetHeight || 0;
        const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 10;
        smoothScrollTo(top, 600);
        history.pushState(null, '', id);
      });
    });
  }

  // ==============================
  // LAZY SCROLL REVEAL
  // ==============================
  function initLazyScroll() {
    const els = $$('[data-lazy]');
    if (!els.length) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('lazy-visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
    els.forEach(el => obs.observe(el));
  }

  // ==============================
  // SCROLL OBSERVERS
  // ==============================
  function initScrollObservers() {
    const revEls = $$('[data-reveal], [data-reveal-project], [data-reveal-timeline]');
    const revObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('revealed');
          revObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    revEls.forEach(el => revObs.observe(el));
  }

  // ==============================
  // NAV
  // ==============================
  function initNav() {
    const nav = $('#nav');
    const links = $$('.nav-links a, .mobile-menu-inner a');
    const sections = $$('section[id]');

    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 50);
    });

    const secObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const id = e.target.id;
          links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + id));
        }
      });
    }, { threshold: 0.3 });
    sections.forEach(s => secObs.observe(s));
  }

  // ==============================
  // MOBILE MENU
  // ==============================
  function initMobileMenu() {
    const hamburger = $('#hamburger');
    const mobileMenu = $('#mobileMenu');
    if (!hamburger || !mobileMenu) return;

    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });

    $$('.mobile-menu-inner a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // ==============================
  // TYPING EFFECT
  // ==============================
  function initTyping() {
    const el = $('#typingText');
    if (!el) return;
    const phrases = [
      'Senior Front-End Engineer',
      'Offline-First Architect',
      'Enterprise SaaS Developer',
      'React & Next.js Specialist',
      'Performance Obsessed',
    ];
    let phraseIdx = 0;
    let charIdx = 0;
    let deleting = false;

    function tick() {
      const current = phrases[phraseIdx];
      if (deleting) {
        el.textContent = current.substring(0, charIdx - 1);
        charIdx--;
      } else {
        el.textContent = current.substring(0, charIdx + 1);
        charIdx++;
      }

      let delay = deleting ? 35 : 70;

      if (!deleting && charIdx === current.length) {
        delay = 2200;
        deleting = true;
      } else if (deleting && charIdx === 0) {
        deleting = false;
        phraseIdx = (phraseIdx + 1) % phrases.length;
        delay = 400;
      }

      setTimeout(tick, delay);
    }

    setTimeout(tick, 800);
  }

  // ==============================
  // PARALLAX
  // ==============================
  function initParallax() {
    const images = $$('[data-parallax]');
    if (!images.length) return;

    function onScroll() {
      const vh = window.innerHeight;
      images.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > vh) return;
        const progress = (vh - rect.top) / (vh + rect.height);
        const offset = (progress - 0.5) * 20;
        const inner = el.querySelector('.project-image-inner');
        if (inner) inner.style.transform = `translateY(${offset}px)`;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ==============================
  // BACK TO TOP
  // ==============================
  function initBackToTop() {
    const btn = $('#backToTop');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 400);
    });
    btn.addEventListener('click', () => smoothScrollTo(0, 600));
  }

  // ==============================
  // INIT
  // ==============================
  window.addEventListener('DOMContentLoaded', startPage);
})();
