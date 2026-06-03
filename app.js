/* ============================================================
   SAAT.DEV — The Dive : interactions & animation engine
   ============================================================ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- BUBBLE / PARTICLE CANVAS ---------- */
  const canvas = document.getElementById('fx-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, dpr;
  let bubbles = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeBubble(initial) {
    const r = 0.6 + Math.random() * 3.2;
    return {
      x: Math.random() * W,
      y: initial ? Math.random() * H : H + 20,
      r: r,
      speed: 0.25 + r * 0.18 + Math.random() * 0.4,
      drift: (Math.random() - 0.5) * 0.4,
      sway: Math.random() * Math.PI * 2,
      swaySpd: 0.005 + Math.random() * 0.02,
      alpha: 0.12 + Math.random() * 0.35
    };
  }

  function initBubbles() {
    const count = Math.round(Math.min(90, (W * H) / 18000));
    bubbles = [];
    for (let i = 0; i < count; i++) bubbles.push(makeBubble(true));
  }

  let scrollFactor = 0; // 0 at top, 1 at bottom — used to fade particles deeper
  function drawBubbles() {
    ctx.clearRect(0, 0, W, H);
    for (const b of bubbles) {
      b.y -= b.speed;
      b.sway += b.swaySpd;
      b.x += b.drift + Math.sin(b.sway) * 0.3;
      if (b.y < -10) {
        Object.assign(b, makeBubble(false));
      }
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(103, 232, 249, ${b.alpha * (0.5 + scrollFactor * 0.5)})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.fillStyle = `rgba(34, 211, 238, ${b.alpha * 0.12})`;
      ctx.fill();
    }
    requestAnimationFrame(drawBubbles);
  }

  resize();
  initBubbles();
  if (!reduceMotion) requestAnimationFrame(drawBubbles);
  window.addEventListener('resize', () => { resize(); initBubbles(); });

  /* ---------- DEPTH DARKENING + GAUGE on scroll ---------- */
  const depthBg = document.getElementById('depth-bg');
  const gauge = document.querySelector('.gauge');
  const gaugeFill = document.querySelector('.gauge-fill');
  const gaugeKnob = document.querySelector('.gauge-knob');
  const gaugeRead = document.querySelector('.gauge-read .value');
  const lightRays = document.querySelector('.light-rays');
  const nav = document.querySelector('.nav');

  // surface -> abyss color stops
  function lerp(a, b, t) { return a + (b - a) * t; }
  function mix(c1, c2, t) {
    return `rgb(${Math.round(lerp(c1[0], c2[0], t))},${Math.round(lerp(c1[1], c2[1], t))},${Math.round(lerp(c1[2], c2[2], t))})`;
  }
  const top1 = [15, 42, 68],   top2 = [4, 16, 30];     // surface gradient
  const bot1 = [3, 10, 20],    bot2 = [1, 5, 11];      // abyss gradient

  const MAX_DEPTH = 3280; // meters at full scroll (Challenger-deep-ish vibe)

  function onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const t = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    scrollFactor = t;

    const a = mix(top1, bot1, t);
    const b = mix(top2, bot2, t);
    depthBg.style.background = `linear-gradient(180deg, ${a} 0%, ${b} 100%)`;

    // gauge
    const pct = (t * 100).toFixed(1) + '%';
    gaugeFill.style.height = pct;
    gaugeKnob.style.top = pct;
    if (gaugeRead) gaugeRead.textContent = Math.round(t * MAX_DEPTH).toLocaleString();

    // nav + rays fade with depth
    nav.classList.toggle('scrolled', window.scrollY > 40);
    if (lightRays) lightRays.style.opacity = String(Math.max(0, 0.55 - t * 1.4));
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // reveal gauge + rays after first paint
  setTimeout(() => {
    gauge && gauge.classList.add('on');
    lightRays && lightRays.classList.add('on');
  }, 700);

  /* ---------- MOUSE PARALLAX (hero depth layers) ---------- */
  const layers = document.querySelectorAll('[data-parallax]');
  if (!reduceMotion && layers.length) {
    let tx = 0, ty = 0, cx = 0, cy = 0;
    window.addEventListener('mousemove', (e) => {
      tx = (e.clientX / window.innerWidth - 0.5);
      ty = (e.clientY / window.innerHeight - 0.5);
    });
    (function loop() {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      layers.forEach(el => {
        const d = parseFloat(el.dataset.parallax);
        el.style.transform = `translate3d(${cx * d}px, ${cy * d}px, 0)`;
      });
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- SCROLL REVEAL ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.transitionDelay = (el.dataset.delay || (i % 2) * 0.08) + 's';
    io.observe(el);
  });

  /* ---------- 3D TILT + glow tracking on project cards ---------- */
  document.querySelectorAll('.card').forEach(card => {
    let raf = null;
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      card.style.setProperty('--mx', (px * 100) + '%');
      card.style.setProperty('--my', (py * 100) + '%');
      if (reduceMotion) return;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        const rotY = (px - 0.5) * 10;
        const rotX = (0.5 - py) * 10;
        card.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px)`;
        raf = null;
      });
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  /* ---------- smooth anchor offset for fixed nav ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });
})();
