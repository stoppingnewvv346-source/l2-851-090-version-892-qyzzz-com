(function () {
  "use strict";

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $all(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function normalize(value) {
    return String(value || "").toLowerCase().trim();
  }

  function initMobileMenu() {
    var button = $("[data-menu-button]");
    var nav = $("[data-mobile-nav]");
    if (!button || !nav) {
      return;
    }

    button.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      document.body.classList.toggle("menu-open", open);
      button.setAttribute("aria-expanded", String(open));
    });
  }

  function initHeroSlider() {
    var slider = $("[data-hero-slider]");
    if (!slider) {
      return;
    }

    var slides = $all("[data-hero-slide]", slider);
    var dots = $all("[data-hero-dot]", slider);
    if (!slides.length) {
      return;
    }

    var active = 0;
    var timer = null;

    function go(next) {
      active = (next + slides.length) % slides.length;
      slides.forEach(function (slide, index) {
        slide.classList.toggle("active", index === active);
      });
      dots.forEach(function (dot, index) {
        dot.classList.toggle("active", index === active);
      });
    }

    dots.forEach(function (dot, index) {
      dot.addEventListener("click", function () {
        go(index);
        restart();
      });
    });

    function restart() {
      if (timer) {
        window.clearInterval(timer);
      }
      timer = window.setInterval(function () {
        go(active + 1);
      }, 5200);
    }

    go(0);
    restart();
  }

  function resultTemplate(item) {
    return [
      '<a class="search-result" href="' + item.url + '">',
      '  <img src="' + item.cover + '" alt="' + item.title + '封面" loading="lazy">',
      '  <span>',
      '    <strong>' + item.title + '</strong>',
      '    <span>' + item.year + ' · ' + item.region + ' · ' + item.category + '</span>',
      '  </span>',
      '</a>'
    ].join("");
  }

  function initSiteSearch() {
    var inputs = $all("[data-site-search]");
    if (!inputs.length || !window.MOVIE_INDEX) {
      return;
    }

    inputs.forEach(function (input) {
      var form = input.closest("form");
      var panel = form ? $("[data-search-panel]", form) : null;
      if (!panel) {
        return;
      }

      function render() {
        var q = normalize(input.value);
        if (!q) {
          panel.classList.remove("is-visible");
          panel.innerHTML = "";
          return;
        }

        var hits = window.MOVIE_INDEX.filter(function (item) {
          return normalize(item.title + " " + item.year + " " + item.region + " " + item.type + " " + item.genre + " " + item.tags + " " + item.category).indexOf(q) !== -1;
        }).slice(0, 16);

        panel.classList.add("is-visible");
        if (!hits.length) {
          panel.innerHTML = '<div class="search-empty">没有找到匹配影片，请换一个关键词。</div>';
          return;
        }
        panel.innerHTML = hits.map(resultTemplate).join("");
      }

      input.addEventListener("input", render);
      input.addEventListener("focus", render);
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var first = $(".search-result", panel);
        if (first) {
          window.location.href = first.getAttribute("href");
        }
      });
      document.addEventListener("click", function (event) {
        if (!form.contains(event.target)) {
          panel.classList.remove("is-visible");
        }
      });
    });
  }

  function initLocalFilters() {
    var blocks = $all("[data-filter-scope]");
    blocks.forEach(function (scope) {
      var input = $("[data-filter-search]", scope);
      var year = $("[data-filter-year]", scope);
      var type = $("[data-filter-type]", scope);
      var cards = $all(".movie-card", scope);
      var count = $("[data-filter-count]", scope);

      function update() {
        var q = normalize(input && input.value);
        var y = normalize(year && year.value);
        var t = normalize(type && type.value);
        var visible = 0;

        cards.forEach(function (card) {
          var haystack = normalize([
            card.dataset.title,
            card.dataset.year,
            card.dataset.type,
            card.dataset.region,
            card.dataset.genre,
            card.dataset.tags,
            card.dataset.category
          ].join(" "));
          var ok = true;
          if (q && haystack.indexOf(q) === -1) {
            ok = false;
          }
          if (y && normalize(card.dataset.year) !== y) {
            ok = false;
          }
          if (t && normalize(card.dataset.type).indexOf(t) === -1) {
            ok = false;
          }
          card.classList.toggle("is-hidden", !ok);
          if (ok) {
            visible += 1;
          }
        });

        if (count) {
          count.textContent = "当前显示 " + visible + " / " + cards.length + " 部";
        }
      }

      [input, year, type].forEach(function (element) {
        if (element) {
          element.addEventListener("input", update);
          element.addEventListener("change", update);
        }
      });
      update();
    });
  }

  function initPlayers() {
    $all("[data-video-player]").forEach(function (player) {
      var video = $("video", player);
      var button = $("[data-play-button]", player);
      var status = $("[data-player-status]", player);
      var src = player.getAttribute("data-src");
      var ready = false;
      var hlsInstance = null;

      function setStatus(message) {
        if (status) {
          status.textContent = message;
        }
      }

      function attachSource() {
        return new Promise(function (resolve) {
          if (ready) {
            resolve();
            return;
          }

          setStatus("正在加载高清播放源...");

          if (window.Hls && window.Hls.isSupported()) {
            hlsInstance = new window.Hls({
              enableWorker: true,
              lowLatencyMode: true
            });
            hlsInstance.loadSource(src);
            hlsInstance.attachMedia(video);
            hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, function () {
              ready = true;
              player.classList.add("is-ready");
              setStatus("播放源已就绪，正在播放。可使用播放器控制条调节进度、音量和全屏。");
              resolve();
            });
            hlsInstance.on(window.Hls.Events.ERROR, function (_, data) {
              if (data && data.fatal) {
                setStatus("视频加载失败，请刷新页面或稍后重试。");
              }
            });
            return;
          }

          if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = src;
            video.addEventListener("loadedmetadata", function () {
              ready = true;
              player.classList.add("is-ready");
              setStatus("播放源已就绪，正在播放。");
              resolve();
            }, { once: true });
            video.addEventListener("error", function () {
              setStatus("视频加载失败，请刷新页面或稍后重试。");
              resolve();
            }, { once: true });
            return;
          }

          video.src = src;
          ready = true;
          player.classList.add("is-ready");
          setStatus("已尝试直接加载 m3u8 播放源；当前浏览器如果无法播放，请使用支持 HLS 的浏览器。 ");
          resolve();
        });
      }

      function play() {
        attachSource().then(function () {
          var playPromise = video.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(function () {
              setStatus("浏览器阻止了自动播放，请再次点击播放按钮。");
            });
          }
        });
      }

      if (button) {
        button.addEventListener("click", play);
      }
      video.addEventListener("play", function () {
        player.classList.add("is-playing");
      });
      video.addEventListener("pause", function () {
        player.classList.remove("is-playing");
      });
      window.addEventListener("beforeunload", function () {
        if (hlsInstance) {
          hlsInstance.destroy();
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initMobileMenu();
    initHeroSlider();
    initSiteSearch();
    initLocalFilters();
    initPlayers();
  });
})();
