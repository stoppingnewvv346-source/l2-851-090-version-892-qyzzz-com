
(function () {
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function initSearchForms() {
    qsa('[data-search-form]').forEach((form) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = qs('input[name="q"]', form);
        const q = (input && input.value ? input.value : '').trim();
        const url = new URL(form.action || location.origin + '/search.html', location.href);
        if (q) url.searchParams.set('q', q);
        location.href = url.pathname + url.search + url.hash;
      });
    });
  }

  function normalize(v) {
    return String(v || '').toLowerCase();
  }

  function initFilterBars() {
    qsa('[data-filter-bar]').forEach((bar) => {
      const gridId = bar.getAttribute('data-target');
      const grid = gridId ? document.getElementById(gridId) : null;
      if (!grid) return;

      const cards = qsa('[data-card]', grid);
      const input = qs('[data-filter-input]', bar);
      const tabs = qsa('[data-filter-tab]', bar);
      const counter = qs('[data-filter-count]', bar);

      const state = { q: '', group: 'all' };
      const url = new URL(location.href);
      const initialQ = (url.searchParams.get('q') || '').trim();
      if (input && initialQ) {
        input.value = initialQ;
        state.q = initialQ;
      }

      const groupAliases = {
        "电影": ["电影", "movie"],
        "剧": ["剧", "电视剧", "剧集", "网络剧", "真人剧", "TV"],
        "中国": ["中国", "大陆", "内地", "香港", "台湾", "澳门"],
        "日本": ["日本"],
        "韩国": ["韩国"],
        "欧美": ["欧美", "美国", "英国", "法国", "德国", "意大利", "西班牙", "澳大利亚", "加拿大", "俄罗斯"],
        "亚洲": ["亚洲", "日本", "韩国", "泰国", "印度", "新加坡", "马来", "越南", "菲律宾"],
      };

      const matchGroup = (card, group) => {
        if (group === 'all') return true;
        const title = normalize(card.getAttribute('data-title'));
        const region = normalize(card.getAttribute('data-region'));
        const type = normalize(card.getAttribute('data-type'));
        const genre = normalize(card.getAttribute('data-genre'));
        const groupName = normalize(card.getAttribute('data-group'));
        const aliases = groupAliases[group] || [group];
        return aliases.some((token) =>
          groupName.includes(normalize(token)) ||
          region.includes(normalize(token)) ||
          type.includes(normalize(token)) ||
          genre.includes(normalize(token)) ||
          title.includes(normalize(token))
        );
      };

      const apply = () => {
        const q = normalize(state.q);
        let visible = 0;

        cards.forEach((card) => {
          const title = normalize(card.getAttribute('data-title'));
          const region = normalize(card.getAttribute('data-region'));
          const type = normalize(card.getAttribute('data-type'));
          const genre = normalize(card.getAttribute('data-genre'));
          const tags = normalize(card.getAttribute('data-tags'));
          const summary = normalize(card.getAttribute('data-summary'));

          const matchQ =
            !q ||
            title.includes(q) ||
            region.includes(q) ||
            type.includes(q) ||
            genre.includes(q) ||
            tags.includes(q) ||
            summary.includes(q);

          const ok = matchQ && matchGroup(card, state.group);
          card.classList.toggle('hide', !ok);
          if (ok) visible += 1;
        });

        if (counter) counter.textContent = visible + ' 条结果';
      };

      if (input) {
        input.addEventListener('input', () => {
          state.q = input.value || '';
          apply();
        });
      }

      tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          tabs.forEach((t) => t.classList.remove('active'));
          tab.classList.add('active');
          state.group = tab.getAttribute('data-group') || 'all';
          apply();
        });
      });

      apply();
    });
  }

  function initPlayers() {
    qsa('[data-player]').forEach((shell) => {
      const video = qs('video', shell);
      const overlay = qs('[data-player-overlay]', shell);
      const playBtn = qs('[data-play-btn]', shell);
      const fullscreenBtn = qs('[data-fullscreen-btn]', shell);
      const muteBtn = qs('[data-mute-btn]', shell);
      const src = shell.getAttribute('data-src');

      if (!video || !src) return;
      video.preload = 'metadata';
      video.playsInline = true;

      const setOverlay = (hidden) => {
        if (!overlay) return;
        overlay.classList.toggle('is-hidden', hidden);
      };

      const setMuteLabel = () => {
        if (!muteBtn) return;
        muteBtn.textContent = video.muted ? '取消静音' : '静音';
      };

      function loadSource() {
        if (window.Hls && Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 90 });
          hls.loadSource(src);
          hls.attachMedia(video);
          hls.on(Hls.Events.ERROR, function (_, data) {
            if (data.fatal) {
              setOverlay(false);
            }
          });
          shell._hls = hls;
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = src;
        } else {
          setOverlay(false);
        }
      }

      loadSource();
      setMuteLabel();

      const startPlay = async (e) => {
        if (e) e.preventDefault();
        setOverlay(true);
        try {
          await video.play();
        } catch (err) {
          setOverlay(false);
        }
      };

      if (playBtn) playBtn.addEventListener('click', startPlay);
      if (overlay) overlay.addEventListener('click', startPlay);
      video.addEventListener('click', startPlay);
      video.addEventListener('play', () => setOverlay(true));
      video.addEventListener('pause', () => setOverlay(false));

      if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', async () => {
          const target = shell;
          if (document.fullscreenElement) {
            await document.exitFullscreen();
          } else if (target.requestFullscreen) {
            await target.requestFullscreen();
          }
        });
      }

      if (muteBtn) {
        muteBtn.addEventListener('click', () => {
          video.muted = !video.muted;
          setMuteLabel();
        });
      }
    });
  }

  function initBackToTop() {
    const btn = qs('[data-back-top]');
    if (!btn) return;
    const toggle = () => {
      btn.classList.toggle('hide', window.scrollY < 600);
    };
    window.addEventListener('scroll', toggle, { passive: true });
    toggle();
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  document.addEventListener('DOMContentLoaded', function () {
    initSearchForms();
    initFilterBars();
    initPlayers();
    initBackToTop();
  });
})();
