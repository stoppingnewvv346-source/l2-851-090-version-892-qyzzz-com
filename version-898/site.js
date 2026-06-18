
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const mobileBtn = $('[data-nav-toggle]');
  const nav = $('[data-site-nav]');
  if (mobileBtn && nav) {
    mobileBtn.addEventListener('click', () => nav.classList.toggle('is-open'));
    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target) && !mobileBtn.contains(e.target)) nav.classList.remove('is-open');
    });
  }

  $$('.js-current-year').forEach(el => el.textContent = new Date().getFullYear());

  // Generic card filtering

  const filterShells = $$('[data-filter-shell]');
  filterShells.forEach(filterShell => {
    const searchInput = $('[data-search-input]', filterShell);
    const categorySelect = $('[data-category-select]', filterShell);
    const sortSelect = $('[data-sort-select]', filterShell);
    const cards = $$('.filter-card', filterShell);

    if (!searchInput && !categorySelect && !sortSelect) return;

    const applyFilters = () => {
      const term = (searchInput?.value || '').trim().toLowerCase();
      const categoryTerm = (categorySelect?.value || '').trim().toLowerCase();
      const sortTerm = (sortSelect?.value || '').trim();

      cards.forEach(card => {
        const hay = (card.dataset.search || '').toLowerCase();
        const okTerm = !term || hay.includes(term);
        const okType = !categoryTerm || (card.dataset.category || '').toLowerCase() === categoryTerm;
        card.classList.toggle('is-hidden', !(okTerm && okType));
      });

      if (sortTerm && sortTerm !== 'default') {
        const parent = cards[0]?.parentElement;
        if (!parent) return;
        const visibleCards = cards.filter(c => !c.classList.contains('is-hidden'));
        const hiddenCards = cards.filter(c => c.classList.contains('is-hidden'));
        const sorted = [...visibleCards].sort((a, b) => {
          const av = a.dataset[sortTerm] || '';
          const bv = b.dataset[sortTerm] || '';
          if (sortTerm === 'year' || sortTerm === 'score') return Number(bv) - Number(av);
          return String(av).localeCompare(String(bv), 'zh-Hans-CN');
        });
        [...sorted, ...hiddenCards].forEach(card => parent.appendChild(card));
      }
    };

    searchInput?.addEventListener('input', applyFilters);
    categorySelect?.addEventListener('change', applyFilters);
    sortSelect?.addEventListener('change', applyFilters);
  });

  // Hero carousel
  const carousel = $('[data-carousel]');
  if (carousel) {
    const track = $('[data-carousel-track]', carousel);
    const slides = $$('.slide', carousel);
    const dotsWrap = $('[data-carousel-dots]', carousel);
    const prev = $('[data-carousel-prev]', carousel);
    const next = $('[data-carousel-next]', carousel);
    let index = 0;
    let timer = null;

    const renderDots = () => {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = '';
      slides.forEach((_, i) => {
        const b = document.createElement('button');
        b.className = 'dot' + (i === index ? ' active' : '');
        b.type = 'button';
        b.setAttribute('aria-label', `切换到第 ${i + 1} 屏`);
        b.addEventListener('click', () => {
          index = i;
          update();
          restart();
        });
        dotsWrap.appendChild(b);
      });
    };

    const update = () => {
      if (track) track.style.transform = `translateX(${-index * 100}%)`;
      $$('.dot', dotsWrap || document).forEach((d, i) => d.classList.toggle('active', i === index));
    };

    const restart = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        index = (index + 1) % slides.length;
        update();
      }, 5500);
    };

    const move = (delta) => {
      index = (index + delta + slides.length) % slides.length;
      update();
      restart();
    };

    prev?.addEventListener('click', () => move(-1));
    next?.addEventListener('click', () => move(1));
    if (track && slides.length > 0) {
      renderDots();
      update();
      restart();
    }
  }

  // Detail player with HLS support
  const playerShells = $$('[data-player-shell]');
  playerShells.forEach(shell => {
    const video = $('video', shell);
    const playBtn = $('[data-play-btn]', shell);
    const source = shell.dataset.playUrl || '';
    let hls = null;
    let started = false;

    const bindSource = () => {
      if (!video || !source) return;
      if (video.src) return;
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = source;
      } else if (window.Hls && Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30
        });
        hls.loadSource(source);
        hls.attachMedia(video);
      } else {
        video.src = source;
      }
    };

    const start = async () => {
      bindSource();
      try {
        await video.play();
        started = true;
        shell.classList.add('is-playing');
      } catch (err) {
        // keep UI stable; browser may require a second gesture.
      }
    };

    playBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      start();
    });

    shell.addEventListener('click', (e) => {
      if (e.target.closest('button, a, select, input, textarea')) return;
      if (!started || video.paused) start();
    });

    bindSource();
    video?.addEventListener('play', () => shell.classList.add('is-playing'));
    video?.addEventListener('pause', () => shell.classList.remove('is-playing'));
    shell._hls = hls;
  });

  // Smooth in-view reveal for cards
  const revealItems = $$('.reveal');
  if ('IntersectionObserver' in window && revealItems.length) {
    revealItems.forEach(el => el.style.opacity = 0);
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.transition = 'opacity .5s ease, transform .5s ease';
          entry.target.style.opacity = 1;
          entry.target.style.transform = 'translateY(0)';
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealItems.forEach(el => {
      el.style.transform = 'translateY(14px)';
      io.observe(el);
    });
  }
})();
