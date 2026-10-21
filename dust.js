// ============================================================
//  dust.js — Explore-Wide Golden Sand Dust Particle Engine
//  Inspired by wind-blown sand/dust burst reference
//  Originates from bottom-left and sweeps to right & top-right
// ============================================================

(function () {
  'use strict';

  // Palette extracted from reference: Rich golden amber, glowing sand, ochre & bronze
  const DUST_PALETTE = [
    { r: 248, g: 215, b: 128 }, // Sunlit Golden Highlight
    { r: 236, g: 186, b: 88 },  // Radiant Amber
    { r: 224, g: 162, b: 68 },  // Golden Sand
    { r: 206, g: 136, b: 54 },  // Warm Ochre
    { r: 184, g: 108, b: 44 },  // Terracotta Amber
    { r: 152, g: 82,  b: 28 },  // Deep Bronze / Umber Granule
    { r: 255, g: 242, b: 195 }  // Sparkle Light Spec
  ];

  class ExploreDustSimulation {
    constructor() {
      this.canvas = document.getElementById('explore-dust-canvas');
      this.exploreView = document.getElementById('view-explore');

      if (!this.canvas) return;

      this.ctx = this.canvas.getContext('2d');
      this.width = 0;
      this.height = 0;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.particles = [];
      this.cloudPuffs = [];
      this.isRunning = false;
      this.animId = null;

      // Mouse interactive breeze
      this.mouse = { x: -9999, y: -9999, radius: 150 };

      // Scroll tracking for atmospheric parallax
      this.lastScrollY = window.scrollY || window.pageYOffset || 0;
      this.scrollVelocity = 0;

      this.initEvents();
      this.resize();
      this.initParticles();
      this.start();
    }

    initEvents() {
      window.addEventListener('resize', () => {
        this.resize();
        this.repositionParticles();
      });

      window.addEventListener('mousemove', (e) => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      });

      window.addEventListener('mouseleave', () => {
        this.mouse.x = -9999;
        this.mouse.y = -9999;
      });

      window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY || window.pageYOffset || 0;
        this.scrollVelocity = (currentScrollY - this.lastScrollY) * 0.12;
        this.lastScrollY = currentScrollY;
      }, { passive: true });

      // Pause when tab is hidden or Explore view is hidden
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stop();
        } else {
          this.checkAndResume();
        }
      });

      // Observe view-explore visibility changes (e.g. login / logout)
      if (this.exploreView && 'MutationObserver' in window) {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
              this.checkAndResume();
            }
          });
        });
        observer.observe(this.exploreView, { attributes: true });
      }
    }

    checkAndResume() {
      if (this.exploreView && !this.exploreView.classList.contains('hidden')) {
        this.start();
      } else {
        this.stop();
      }
    }

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;

      if (this.width === 0 || this.height === 0) return;

      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    initParticles() {
      this.particles = [];
      this.cloudPuffs = [];

      // Scale particle count based on screen width
      const count = Math.min(2400, Math.max(900, Math.floor(this.width * 1.55)));
      const puffCount = Math.min(50, Math.max(22, Math.floor(this.width / 28)));

      // 1. Create Volumetric Cloud Puffs (Dense billowing origin at bottom-left)
      for (let i = 0; i < puffCount; i++) {
        this.cloudPuffs.push(this.createCloudPuff(true));
      }

      // 2. Create Sand Dust Particles fanning out from bottom-left to right & top-right
      for (let i = 0; i < count; i++) {
        this.particles.push(this.createParticle(true));
      }
    }

    repositionParticles() {
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        if (p.x > this.width + 80 || p.y < -80) {
          Object.assign(p, this.createParticle(true));
        }
      }
    }

    createCloudPuff(initialSpread = false) {
      // Origin: Bottom-Left quadrant
      let x = -Math.random() * 80 - 20;
      let y = this.height * 0.78 + Math.random() * (this.height * 0.28);

      // Trajectory heading toward top-right and right
      const angle = -0.30 - Math.random() * 0.60; // -17 to -51 degrees
      const speed = 1.3 + Math.random() * 1.8;
      const vx = speed * Math.cos(angle);
      const vy = speed * Math.sin(angle);

      if (initialSpread) {
        // Pre-disperse along trajectory so screen is atmospheric from moment 0
        const t = Math.random() * 260;
        x += vx * t;
        y += vy * t;
      }

      const color = DUST_PALETTE[Math.floor(Math.random() * 4)];
      const radius = 40 + Math.random() * 65;
      const baseAlpha = 0.035 + Math.random() * 0.065;

      return {
        x,
        y,
        radius,
        baseAlpha,
        color,
        vx,
        vy,
        pulseSpeed: 0.008 + Math.random() * 0.012,
        pulsePhase: Math.random() * Math.PI * 2
      };
    }

    createParticle(initialSpread = false) {
      // ORIGIN: Bottom-left of page
      let x = -Math.random() * 80 - 10;
      let y = this.height * 0.72 + Math.random() * (this.height * 0.32);

      // TRAJECTORY: Going to right AND top-right
      // We partition particles across 3 dynamic wind streams:
      const streamType = Math.random();
      let angle;
      if (streamType < 0.45) {
        // Top-Right stream: steep diagonal heading straight to top-right
        angle = -0.65 - Math.random() * 0.40; // -37° to -60°
      } else if (streamType < 0.80) {
        // Mid-Right stream: sweeps across the center toward upper-right
        angle = -0.35 - Math.random() * 0.30; // -20° to -37°
      } else {
        // Lower-Right stream: fans across the lower half to right edge
        angle = -0.12 - Math.random() * 0.23; // -7° to -20°
      }

      // Speeds: fast foreground grains (parallax) to gentle airborne mists
      const speed = 3.2 + Math.random() * 4.6;
      const vx = speed * Math.cos(angle); // Always positive (moving right)
      const vy = speed * Math.sin(angle); // Always negative (moving upward)

      if (initialSpread) {
        // Pre-distribute along trajectory across viewport
        const travel = Math.random() * 320;
        x += vx * travel;
        y += vy * travel;
      }

      const color = DUST_PALETTE[Math.floor(Math.random() * DUST_PALETTE.length)];

      // Size distribution: fine mist (60%), medium sand grains (30%), larger glowing crystals (10%)
      const sizeRand = Math.random();
      let size;
      if (sizeRand < 0.60) {
        size = 0.8 + Math.random() * 1.0;
      } else if (sizeRand < 0.90) {
        size = 1.8 + Math.random() * 1.2;
      } else {
        size = 3.0 + Math.random() * 1.4;
      }

      // Elongate along direction of motion for wind-blown aerodynamic streak
      const stretch = 1.15 + Math.random() * 0.75;
      const baseAlpha = 0.25 + Math.random() * 0.55;

      return {
        x,
        y,
        vx,
        vy,
        angle,
        speed,
        waveAmp: 0.35 + Math.random() * 0.9,
        waveFreq: 0.003 + Math.random() * 0.002,
        wavePhase: Math.random() * Math.PI * 2,
        distTraveled: Math.random() * 400,
        size,
        stretch,
        color,
        baseAlpha,
        alpha: baseAlpha,
        twinkleRate: 0.02 + Math.random() * 0.05,
        twinklePhase: Math.random() * Math.PI * 2
      };
    }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.lastTime = performance.now();
      this.animate();
    }

    stop() {
      this.isRunning = false;
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
    }

    animate() {
      if (!this.isRunning) return;
      this.animId = requestAnimationFrame(() => this.animate());

      const now = performance.now();
      const dt = Math.min((now - this.lastTime) / 16.667, 2.5);
      this.lastTime = now;

      // Damp scroll velocity gradually
      this.scrollVelocity *= 0.92;

      this.ctx.clearRect(0, 0, this.width, this.height);

      // 1. Draw Volumetric Billowing Puffs (Originating at bottom-left)
      this.updateAndDrawPuffs(dt);

      // 2. Draw Sand Dust Particles (Sweeping to right & top-right)
      this.updateAndDrawParticles(dt);
    }

    updateAndDrawPuffs(dt) {
      const ctx = this.ctx;

      for (let i = 0; i < this.cloudPuffs.length; i++) {
        const puff = this.cloudPuffs[i];

        puff.x += puff.vx * dt;
        puff.y += (puff.vy - this.scrollVelocity * 0.4) * dt;

        puff.pulsePhase += puff.pulseSpeed * dt;
        const pulse = 1.0 + Math.sin(puff.pulsePhase) * 0.12;
        const curRadius = puff.radius * pulse;

        // Reset when drifted past right or top
        if (puff.x - curRadius > this.width + 60 || puff.y + curRadius < -60) {
          Object.assign(puff, this.createCloudPuff(false));
          continue;
        }

        const grad = ctx.createRadialGradient(
          puff.x, puff.y, 0,
          puff.x, puff.y, curRadius
        );
        const { r, g, b } = puff.color;
        const a = puff.baseAlpha;

        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${a * 1.25})`);
        grad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${a * 0.6})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(puff.x, puff.y, curRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    updateAndDrawParticles(dt) {
      const ctx = this.ctx;
      const mouseRadiusSq = this.mouse.radius * this.mouse.radius;

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];

        // Cursor interactive breeze
        if (this.mouse.x > -9000) {
          const dx = p.x - this.mouse.x;
          const dy = p.y - this.mouse.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < mouseRadiusSq && distSq > 1) {
            const dist = Math.sqrt(distSq);
            const force = (1.0 - dist / this.mouse.radius) * 2.2;
            p.x += (dx / dist) * force * 3.5 * dt;
            p.y += (dy / dist) * force * 3.0 * dt;
          }
        }

        // Perpendicular sinusoidal wave undulation for organic wind gusts
        p.distTraveled += p.speed * dt;
        const perpAngle = p.angle + Math.PI / 2;
        const wave = Math.sin(p.distTraveled * p.waveFreq + p.wavePhase) * p.waveAmp;

        p.x += (p.vx + Math.cos(perpAngle) * wave) * dt;
        p.y += (p.vy + Math.sin(perpAngle) * wave - this.scrollVelocity * 0.6) * dt;

        // Twinkle calculation
        p.twinklePhase += p.twinkleRate * dt;
        const twinkle = 0.72 + Math.sin(p.twinklePhase) * 0.28;
        p.alpha = Math.max(0.08, Math.min(1.0, p.baseAlpha * twinkle));

        // Respawn at bottom-left when exiting top or right edge
        if (p.x > this.width + 60 || p.y < -60) {
          const newP = this.createParticle(false);
          Object.assign(p, newP);
          continue;
        }

        const { r, g, b } = p.color;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.alpha})`;
        ctx.beginPath();

        // Stretched aerodynamic ellipse aligned with velocity angle
        ctx.ellipse(
          p.x,
          p.y,
          p.size * p.stretch,
          p.size * 0.82,
          p.angle,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
  }

  // Initialize when DOM is ready
  function initExploreDust() {
    new ExploreDustSimulation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExploreDust);
  } else {
    initExploreDust();
  }
})();
