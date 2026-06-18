(function () {
  function ready(fn) {
    if (document.readyState !== 'loading') {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }

  function initMenu() {
    var button = document.querySelector('.menu-toggle');
    var panel = document.querySelector('.mobile-panel');
    if (!button || !panel) {
      return;
    }
    button.addEventListener('click', function () {
      var opened = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!opened));
      panel.hidden = opened;
    });
  }

  function initHero() {
    var slider = document.querySelector('[data-hero]');
    if (!slider) {
      return;
    }
    var slides = Array.prototype.slice.call(slider.querySelectorAll('.hero-slide'));
    var dots = Array.prototype.slice.call(slider.querySelectorAll('.hero-dot'));
    if (slides.length < 2) {
      return;
    }
    var current = 0;
    var timer = null;
    function show(index) {
      current = (index + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        slide.classList.toggle('active', i === current);
      });
      dots.forEach(function (dot, i) {
        dot.classList.toggle('active', i === current);
      });
    }
    function play() {
      timer = window.setInterval(function () {
        show(current + 1);
      }, 5200);
    }
    dots.forEach(function (dot, index) {
      dot.addEventListener('click', function () {
        window.clearInterval(timer);
        show(index);
        play();
      });
    });
    slider.addEventListener('mouseenter', function () {
      window.clearInterval(timer);
    });
    slider.addEventListener('mouseleave', play);
    show(0);
    play();
  }

  function initCategoryTools() {
    var grid = document.querySelector('.filterable-grid');
    if (!grid) {
      return;
    }
    var input = document.querySelector('.category-filter');
    var select = document.querySelector('.category-sort');
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.movie-card'));
    function applyFilter() {
      var q = input ? input.value.trim().toLowerCase() : '';
      cards.forEach(function (card) {
        var text = card.getAttribute('data-search') || '';
        card.style.display = text.indexOf(q) >= 0 ? '' : 'none';
      });
    }
    function applySort() {
      if (!select) {
        return;
      }
      var sorted = cards.slice();
      if (select.value === 'year-desc') {
        sorted.sort(function (a, b) {
          return Number(b.getAttribute('data-year')) - Number(a.getAttribute('data-year'));
        });
      } else if (select.value === 'year-asc') {
        sorted.sort(function (a, b) {
          return Number(a.getAttribute('data-year')) - Number(b.getAttribute('data-year'));
        });
      } else if (select.value === 'title-asc') {
        sorted.sort(function (a, b) {
          return String(a.getAttribute('data-title')).localeCompare(String(b.getAttribute('data-title')), 'zh-Hans-CN');
        });
      }
      sorted.forEach(function (card) {
        grid.appendChild(card);
      });
      applyFilter();
    }
    if (input) {
      input.addEventListener('input', applyFilter);
    }
    if (select) {
      select.addEventListener('change', applySort);
    }
  }

  function initSearchPage() {
    var input = document.getElementById('searchInput');
    var results = document.getElementById('searchResults');
    var summary = document.getElementById('searchSummary');
    if (!input || !results || !summary || !window.SEARCH_INDEX) {
      return;
    }
    var params = new URLSearchParams(window.location.search);
    var initial = params.get('q') || '';
    input.value = initial;
    function cardTemplate(item) {
      return '<article class="movie-card">' +
        '<a class="card-cover" href="' + item.url + '">' +
        '<img src="' + item.cover + '" alt="' + item.title.replace(/"/g, '&quot;') + '" loading="lazy">' +
        '<span class="card-play">▶</span><span class="card-badge">' + item.category + '</span>' +
        '</a><div class="card-body"><a href="' + item.url + '"><h3>' + item.title + '</h3></a>' +
        '<p>' + item.one + '</p><div class="card-meta"><span>' + item.year + '</span><span>' + item.type + '</span></div></div></article>';
    }
    function runSearch() {
      var q = input.value.trim().toLowerCase();
      if (!q) {
        summary.textContent = '请输入关键词开始搜索。';
        results.innerHTML = '';
        return;
      }
      var terms = q.split(/\s+/).filter(Boolean);
      var found = window.SEARCH_INDEX.filter(function (item) {
        var haystack = item.search;
        return terms.every(function (term) {
          return haystack.indexOf(term) >= 0;
        });
      }).slice(0, 120);
      summary.textContent = found.length ? '搜索结果' : '没有找到匹配影片';
      results.innerHTML = found.map(cardTemplate).join('');
    }
    input.addEventListener('input', runSearch);
    runSearch();
  }

  window.initMoviePlayer = function (videoId, coverId, source) {
    var video = document.getElementById(videoId);
    var cover = document.getElementById(coverId);
    if (!video || !source) {
      return;
    }
    var loaded = false;
    var hls = null;
    function load() {
      if (loaded) {
        return;
      }
      loaded = true;
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = source;
      } else if (window.Hls && window.Hls.isSupported()) {
        hls = new window.Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90
        });
        hls.loadSource(source);
        hls.attachMedia(video);
        hls.on(window.Hls.Events.ERROR, function (event, data) {
          if (!data || !data.fatal) {
            return;
          }
          if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            hls.destroy();
          }
        });
      } else {
        video.src = source;
      }
    }
    function begin() {
      load();
      if (cover) {
        cover.classList.add('is-hidden');
      }
      var attempt = video.play();
      if (attempt && typeof attempt.catch === 'function') {
        attempt.catch(function () {});
      }
    }
    if (cover) {
      cover.addEventListener('click', begin);
    }
    video.addEventListener('play', function () {
      if (cover) {
        cover.classList.add('is-hidden');
      }
    });
    video.addEventListener('click', function () {
      if (video.paused) {
        begin();
      }
    });
    window.addEventListener('pagehide', function () {
      if (hls) {
        hls.destroy();
      }
    });
  };

  ready(function () {
    initMenu();
    initHero();
    initCategoryTools();
    initSearchPage();
  });
}());
