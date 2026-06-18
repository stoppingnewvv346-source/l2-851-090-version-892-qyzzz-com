(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function initNav() {
    const toggle = $('[data-mobile-toggle]');
    const links = $('[data-nav-links]');
    if (!toggle || !links) return;
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', links.classList.contains('open') ? 'true' : 'false');
    });
  }

  function initSearchForms() {
    $$('[data-search-form]').forEach((form) => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const input = $('input[name="q"]', form);
        const query = input ? input.value.trim() : '';
        const action = form.getAttribute('action') || '/search.html';
        const url = new URL(action, window.location.href);
        if (query) url.searchParams.set('q', query);
        window.location.href = url.pathname + url.search;
      });
    });
  }

  function setActiveSource(buttons, activeButton) {
    buttons.forEach((btn) => btn.classList.remove('active'));
    if (activeButton) activeButton.classList.add('active');
  }

  function initPlayer() {
    const shell = $('[data-player-shell]');
    const video = $('[data-player-video]');
    if (!shell || !video) return;

    const hlsSrc = shell.getAttribute('data-hls-src');
    const mp4Src = shell.getAttribute('data-mp4-src');
    const poster = shell.getAttribute('data-poster');
    const playBtn = $('[data-player-play]', shell);
    const tabs = $$('[data-source-tab]', shell);
    let hlsInstance = null;
    let currentKind = 'hls';

    if (poster) {
      video.setAttribute('poster', poster);
    }

    function destroyHls() {
      if (hlsInstance) {
        try { hlsInstance.destroy(); } catch (err) {}
        hlsInstance = null;
      }
    }

    function attachSource(kind) {
      currentKind = kind;
      destroyHls();

      if (kind === 'mp4' || !hlsSrc) {
        video.src = mp4Src || hlsSrc || '';
        video.load();
        return;
      }

      const canNativeHls = video.canPlayType('application/vnd.apple.mpegurl');
      if (canNativeHls) {
        video.src = hlsSrc;
        video.load();
        return;
      }

      if (window.Hls && window.Hls.isSupported()) {
        hlsInstance = new window.Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 30,
        });
        hlsInstance.loadSource(hlsSrc);
        hlsInstance.attachMedia(video);
        hlsInstance.on(window.Hls.Events.ERROR, function (_, data) {
          if (!data || !data.fatal) return;
          if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR || data.type === window.Hls.ErrorTypes.MEDIA_ERROR) {
            try { hlsInstance.recoverMediaError(); } catch (err) {}
          }
        });
      } else {
        video.src = mp4Src || hlsSrc || '';
        video.load();
      }
    }

    function playNow() {
      const promise = video.play();
      if (promise && typeof promise.catch === 'function') {
        promise.catch(() => {});
      }
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const kind = tab.getAttribute('data-source-tab') || 'hls';
        setActiveSource(tabs, tab);
        attachSource(kind);
        playNow();
      });
    });

    if (tabs.length) {
      const initial = tabs.find((tab) => tab.classList.contains('active')) || tabs[0];
      if (initial) {
        setActiveSource(tabs, initial);
        attachSource(initial.getAttribute('data-source-tab') || 'hls');
      } else {
        attachSource('hls');
      }
    } else {
      attachSource('hls');
    }

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        playNow();
      });
    }

    video.addEventListener('click', () => {
      playNow();
    });
  }

  function initBackToTop() {
    const btn = $('[data-back-to-top]');
    if (!btn) return;
    const onScroll = () => {
      btn.style.opacity = window.scrollY > 600 ? '1' : '0';
      btn.style.pointerEvents = window.scrollY > 600 ? 'auto' : 'none';
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  function renderPoster(movie, basePath = '') {
    const tags = (movie.tags || []).slice(0, 3).map((tag) => `<span class="tag accent">${escapeHtml(tag)}</span>`).join('');
    const url = basePath + `movie/movie-${movie.id}.html`;
    const posterTitle = escapeHtml(movie.title);
    const desc = escapeHtml(movie.oneLine || movie.summary || '');
    const region = escapeHtml(movie.region || '');
    const year = escapeHtml(String(movie.year || ''));
    const genre = escapeHtml(movie.genre || '');
    const styles = movie.posterStyle || '';
    return `
      <article class="movie-card" data-movie-card data-title="${escapeHtml((movie.title || '').toLowerCase())}" data-search="${escapeHtml([movie.title, movie.region, movie.genre, movie.oneLine, (movie.tags || []).join(' ')].join(' ').toLowerCase())}">
        <a class="movie-link" href="${url}">
          <div class="poster" style="${styles}">
            <div class="poster-inner">
              <div class="poster-meta">
                <span class="poster-badge">${year}</span>
                <span class="poster-badge">${region}</span>
              </div>
              <div>
                <h3 class="poster-title">${posterTitle}</h3>
                <div class="movie-tags">${tags}</div>
              </div>
            </div>
            <div class="poster-number">${escapeHtml(movie.id)}</div>
          </div>
          <div class="movie-body">
            <h3 class="movie-title">${posterTitle}</h3>
            <p class="movie-desc">${desc}</p>
            <div class="movie-tags">
              <span class="tag">${region}</span>
              <span class="tag">${genre}</span>
            </div>
          </div>
        </a>
      </article>
    `;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function initSearchPage() {
    const results = $('[data-search-results]');
    if (!results || !window.MOVIE_CATALOG) return;
    const form = $('[data-live-search]');
    const countLabel = $('[data-search-count]');
    const hint = $('[data-search-hint]');
    const queryInput = $('input[name="q"]', form || document);
    const url = new URL(window.location.href);
    const initialQuery = (url.searchParams.get('q') || '').trim();

    function filterCatalog(query) {
      const q = query.trim().toLowerCase();
      if (!q) {
        return window.MOVIE_CATALOG.slice(0, 24);
      }
      return window.MOVIE_CATALOG.filter((item) => item.searchText.includes(q)).slice(0, 120);
    }

    function render(query) {
      const items = filterCatalog(query);
      if (countLabel) {
        countLabel.textContent = `${items.length} 条结果`;
      }
      if (hint) {
        hint.textContent = query ? `关键词：${query}` : '输入影片标题、地区、类型或标签开始搜索';
      }
      results.innerHTML = items.length
        ? items.map((item) => renderPoster(item, '')).join('')
        : `<div class="search-empty">未找到相关视频，试试其他关键词或浏览全部视频。</div>`;
    }

    if (queryInput) queryInput.value = initialQuery;
    render(initialQuery);

    if (form) {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const query = (queryInput ? queryInput.value : '').trim();
        const url = new URL(window.location.href);
        if (query) url.searchParams.set('q', query); else url.searchParams.delete('q');
        history.replaceState({}, '', url.pathname + url.search);
        render(query);
      });
    }

    if (queryInput) {
      queryInput.addEventListener('input', () => render(queryInput.value));
    }
  }

  function initCurrentPageFiltering() {
    const filterInput = $('[data-inline-filter]');
    const cards = $$('[data-movie-card]');
    if (!filterInput || !cards.length) return;
    filterInput.addEventListener('input', () => {
      const q = filterInput.value.trim().toLowerCase();
      cards.forEach((card) => {
        const hay = card.getAttribute('data-search') || '';
        card.style.display = !q || hay.includes(q) ? '' : 'none';
      });
    });
  }

  function runAll() {
    initNav();
    initSearchForms();
    initPlayer();
    initBackToTop();
    initSearchPage();
    initCurrentPageFiltering();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAll);
  } else {
    runAll();
  }
})();
