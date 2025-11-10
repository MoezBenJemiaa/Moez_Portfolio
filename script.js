// Combined page behavior:
// - Hero scroll smoothing
// - Transition dot growth and project reveal
// - Intersection observers for reveal animations
// - Watermark start/stop control + CTA pulse
// - Mobile nav toggle + auto-close on resize/orientation
// - Respects prefers-reduced-motion
(function () {
  const header = document.querySelector('.site-header');
  const hero = document.querySelector('.hero');
  const progressEl = document.getElementById('progressSpace');
  const aboutSection = document.getElementById('about');
  const transitionEl = document.getElementById('projects-transition');
  const projectsSection = document.getElementById('projects');
  const dotEl = document.getElementById('growDot');
  const watermark = document.getElementById('watermark');
  const ctaCircle = document.querySelector('.cta-circle');
  const revealTargets = document.querySelectorAll('[data-reveal]');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile nav elements
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.querySelector('.main-nav');

  /* HERO scroll smoothing */
  const HERO_START_SCALE = 1.25;
  const HERO_END_SCALE = 0.98;
  const HERO_SHIFT_VW = -6;
  const HERO_EASE = 0.12;
  let targetHeroProgress = 0;
  let displayHeroProgress = 0;

  /* TRANSITION + DOT config */
  const BASE_DOT_SCALE = 0.12;
  const DOT_MAX_SCALE = 30;
  const DOT_GROWTH_EXP = 1.05;
  const DOT_STOP_AT = 0.72;
  const DOT_DELAY_PX = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--transition-top-gap')) || 140;
  const SHOW_PROJECTS_AT = 0.25;
  const THEME_DARK_AT = 0.45;

  let lastY = window.scrollY || 0;
  let tickingScroll = false;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* HERO functions */
  function computeHeroProgress(){
    const y = window.scrollY || 0;
    const h = Math.max(1, progressEl?.offsetHeight || 1);
    targetHeroProgress = clamp(y / h, 0, 1);
  }
  function applyHero(p){
    const scale = HERO_START_SCALE + (HERO_END_SCALE - HERO_START_SCALE) * p;
    const shift = HERO_SHIFT_VW * p;
    document.documentElement.style.setProperty('--hero-scale', scale.toFixed(4));
    document.documentElement.style.setProperty('--hero-shiftX', shift.toFixed(3) + 'vw');
  }

  /* TRANSITION progress & dot */
  function computeTransitionProgress(){
    if (!transitionEl) return 0;
    const rect = transitionEl.getBoundingClientRect();
    const height = rect.height || 1;
    if (rect.top > window.innerHeight) return 0;
    if (rect.bottom <= 0) return 1;
    const inside = clamp(window.innerHeight - rect.top, 0, height);
    const adjusted = Math.max(0, inside - DOT_DELAY_PX);
    return clamp(adjusted / (height - DOT_DELAY_PX), 0, 1);
  }
  function computeDotScale(progress){
    const effective = Math.min(progress, DOT_STOP_AT);
    const normalized = DOT_STOP_AT === 0 ? 0 : effective / DOT_STOP_AT;
    const curved = Math.pow(normalized, DOT_GROWTH_EXP);
    return BASE_DOT_SCALE + curved * DOT_MAX_SCALE;
  }
  function applyTransition(p){
    const scale = computeDotScale(p);
    const blur = (p * 2.5).toFixed(2) + 'px';
    document.documentElement.style.setProperty('--dot-scale', scale.toFixed(3));
    document.documentElement.style.setProperty('--dot-blur', blur);

    // Theme / hero hide only when white section reaches top (prevents hero peek-through)
    if (transitionEl){
      const rect = transitionEl.getBoundingClientRect();
      const whiteAtTop = rect.top <= 0;
      if (whiteAtTop && p > THEME_DARK_AT){
        document.body.style.backgroundColor = '#000';
        document.body.style.color = '#f2f2f5';
      } else {
        document.body.style.backgroundColor = '#fff';
        document.body.style.color = '#101010';
      }
      // Hide hero once we've passed the about bottom (strict)
      if (aboutSection){
        const aboutBottom = aboutSection.offsetTop + aboutSection.offsetHeight;
        if ((window.scrollY || 0) >= aboutBottom) hero?.classList.add('hero--hidden');
        else hero?.classList.remove('hero--hidden');
      }
    }

    // Show projects
    if (projectsSection){
      if (p >= SHOW_PROJECTS_AT) projectsSection.classList.add('show');
      else projectsSection.classList.remove('show');
    }
  }

  /* Intersection reveal observer (for CTA, footer blocks, project cards etc.) */
  function initRevealObserver(){
    if (prefersReduced){
      document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if (entry.isIntersecting){
          entry.target.classList.add('is-in');
        } else {
          entry.target.classList.remove('is-in');
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));
  }

  /* watermark control: start animation only when footer is visible (pause otherwise) */
  function initWatermarkObserver(){
    if (!watermark) return;
    if (prefersReduced){
      watermark.classList.remove('animate');
      return;
    }
    const footer = document.querySelector('.site-footer');
    if (!footer) return;
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if (entry.isIntersecting){
          watermark.classList.add('animate');
        } else {
          watermark.classList.remove('animate');
        }
      });
    }, { threshold: 0.05 });
    io.observe(footer);
  }

  /* CTA pulse on loop, but respect reduced motion */
  function initCtaPulse(){
    if (!ctaCircle) return;
    if (prefersReduced) return;
    ctaCircle.classList.add('pulse');
  }

  /* Mobile nav toggle behavior */
  function initMobileNav(){
    if (!navToggle || !mainNav) return;
    navToggle.addEventListener('click', ()=> {
      const open = mainNav.classList.toggle('main-nav--open');
      navToggle.setAttribute('aria-expanded', String(open));
      document.documentElement.classList.toggle('nav-open', open);
      document.body.classList.toggle('nav-open', open);
    });
    // close on link tap
    mainNav.querySelectorAll('a').forEach(a => a.addEventListener('click', ()=> {
      mainNav.classList.remove('main-nav--open');
      navToggle.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('nav-open');
      document.body.classList.remove('nav-open');
    }));
    // close on Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mainNav.classList.contains('main-nav--open')) {
        mainNav.classList.remove('main-nav--open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.documentElement.classList.remove('nav-open');
        document.body.classList.remove('nav-open');
      }
    });

    // Auto-close nav when resizing to desktop sizes or on orientation change
    const MOBILE_CLOSE_BREAKPOINT = 1200;
    function closeNavIfDesktop() {
      if (window.innerWidth > MOBILE_CLOSE_BREAKPOINT && mainNav.classList.contains('main-nav--open')) {
        mainNav.classList.remove('main-nav--open');
        navToggle.setAttribute('aria-expanded', 'false');
        document.documentElement.classList.remove('nav-open');
        document.body.classList.remove('nav-open');
      }
    }
    window.addEventListener('resize', closeNavIfDesktop, { passive: true });
    window.addEventListener('orientationchange', () => setTimeout(closeNavIfDesktop, 200));
  }

  /* Scroll handler + RAF loop */
  function onScroll(){
    if (prefersReduced) return;
    const y = window.scrollY || 0;
    if (y > lastY + 10 && y > 40) header?.classList.add('nav--hidden');
    else if (y < lastY - 10) header?.classList.remove('nav--hidden');
    header?.classList.toggle('nav--scrolled', y > 10);

    computeHeroProgress();
    applyTransition(computeTransitionProgress());

    lastY = y;
    tickingScroll = false;
  }
  window.addEventListener('scroll', () => {
    if (!tickingScroll){
      tickingScroll = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });

  window.addEventListener('resize', () => {
    computeHeroProgress();
    applyHero(displayHeroProgress);
    applyTransition(computeTransitionProgress());
  });

  function rafLoop(){
    if (!prefersReduced){
      displayHeroProgress += (targetHeroProgress - displayHeroProgress) * HERO_EASE;
      if (Math.abs(targetHeroProgress - displayHeroProgress) < 0.0005) displayHeroProgress = targetHeroProgress;
      applyHero(displayHeroProgress);
    }
    requestAnimationFrame(rafLoop);
  }

  /* Initialize everything */
  computeHeroProgress();
  applyHero(0);
  applyTransition(0);
  initRevealObserver();
  initWatermarkObserver();
  initCtaPulse();
  initMobileNav();
  rafLoop();

  // small accessibility enhancement: pause watermark on hover
  watermark?.addEventListener('mouseenter', ()=> watermark.classList.remove('animate'));
  watermark?.addEventListener('mouseleave', ()=> { if (!prefersReduced) watermark.classList.add('animate'); });

  // Book meeting - example behavior (moved here so all page script is together)
  document.getElementById('bookMeeting')?.addEventListener('click', function(){
    window.location.href = 'mailto:MoezBj27@gmail.com?subject=Book%20a%20meeting';
  });
})();