(() => {
  'use strict';

  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => [...p.querySelectorAll(s)];

  // ==============================
  // PAGE START
  // ==============================
  function startPage() {
    animateHero();
    initParticles();
    initScrollObservers();
    initScrollProgress();
    initSmoothScroll();
    initLazyScroll();
    initNav();
    initMobileMenu();
    initTyping();
    initParallax();
    initBackToTop();
  }

  function animateHero() {
    const els = $$('.hero [data-hero]');
    els.forEach((el, i) => {
      el.style.transition = `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${0.08 + i * 0.1}s, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${0.08 + i * 0.1}s`;
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });

    // Count-up stats
    setTimeout(() => {
      $$('.stat-number').forEach(el => {
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
    let w, h, particles = [];

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }

    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.0 + 0.3,
        dx: (Math.random() - 0.5) * 0.08,
        dy: (Math.random() - 0.5) * 0.08,
        o: Math.random() * 0.2 + 0.03,
      });
    }

    function draw() {
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
      requestAnimationFrame(draw);
    }
    draw();
  }

  // ==============================
  // SCROLL PROGRESS
  // ==============================
  function initScrollProgress() {
    const bar = $('#scrollProgress');
    if (!bar) return;
    function update() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = progress + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
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
