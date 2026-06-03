/* ============================================================
   SAAT.DEV — Aether Flow particle engine
   ============================================================ */
(function () {
  'use strict';

  /* ---------- PARTICLE NETWORK CANVAS ---------- */
  const canvas = document.getElementById('fx-canvas');
  const ctx = canvas.getContext('2d');
  let W, H;
  let particles = [];
  const mouse = { x: null, y: null, radius: 200 };

  class Particle {
    constructor() {
      this.size = (Math.random() * 2) + 1;
      this.x = Math.random() * (W - this.size * 2) + this.size;
      this.y = Math.random() * (H - this.size * 2) + this.size;
      this.directionX = (Math.random() * 0.4) - 0.2;
      this.directionY = (Math.random() * 0.4) - 0.2;
      this.color = 'rgba(191, 128, 255, 0.8)';
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
      ctx.fillStyle = this.color;
      ctx.fill();
    }

    update() {
      if (this.x > W || this.x < 0) this.directionX = -this.directionX;
      if (this.y > H || this.y < 0) this.directionY = -this.directionY;

      if (mouse.x !== null) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius + this.size) {
          const fx = dx / dist;
          const fy = dy / dist;
          const force = (mouse.radius - dist) / mouse.radius;
          this.x -= fx * force * 5;
          this.y -= fy * force * 5;
        }
      }

      this.x += this.directionX;
      this.y += this.directionY;
      this.draw();
    }
  }

  function init() {
    particles = [];
    const count = Math.floor((H * W) / 9000);
    for (let i = 0; i < count; i++) particles.push(new Particle());
  }

  function connect() {
    const threshold = (W / 7) * (H / 7);
    for (let a = 0; a < particles.length; a++) {
      for (let b = a; b < particles.length; b++) {
        const dx = particles[a].x - particles[b].x;
        const dy = particles[a].y - particles[b].y;
        const dist2 = dx * dx + dy * dy;

        if (dist2 < threshold) {
          const opacity = 1 - (dist2 / 20000);

          let nearMouse = false;
          if (mouse.x !== null) {
            const dmx = particles[a].x - mouse.x;
            const dmy = particles[a].y - mouse.y;
            nearMouse = (dmx * dmx + dmy * dmy) < mouse.radius * mouse.radius;
          }

          ctx.strokeStyle = nearMouse
            ? `rgba(255, 255, 255, ${opacity})`
            : `rgba(200, 150, 255, ${opacity})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(particles[a].x, particles[a].y);
          ctx.lineTo(particles[b].x, particles[b].y);
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, W, H);
    particles.forEach(p => p.update());
    connect();
    requestAnimationFrame(animate);
  }

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    init();
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('mouseout', () => { mouse.x = null; mouse.y = null; });

  resize();
  animate();

  /* ---------- NAV scroll state ---------- */
  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  /* ---------- SCROLL REVEAL ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.transitionDelay = (el.dataset.delay || (i % 2) * 0.08) + 's';
    io.observe(el);
  });

  /* ---------- 3D TILT + glow on project cards ---------- */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.card').forEach(card => {
    let raf = null;
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      card.style.setProperty('--mx', (px * 100) + '%');
      card.style.setProperty('--my', (py * 100) + '%');
      if (reduceMotion || raf) return;
      raf = requestAnimationFrame(() => {
        const rotY = (px - 0.5) * 10;
        const rotX = (0.5 - py) * 10;
        card.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-4px)`;
        raf = null;
      });
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });

  /* ---------- smooth anchor scroll ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 70, behavior: 'smooth' });
    });
  });
})();
