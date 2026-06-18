(function () {
  function ready(fn) {
    if (document.readyState !== "loading") {
      fn();
    } else {
      document.addEventListener("DOMContentLoaded", fn);
    }
  }

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  ready(function () {
    var menuButton = document.querySelector("[data-menu-button]");
    var mobileNav = document.querySelector("[data-mobile-nav]");

    if (menuButton && mobileNav) {
      menuButton.addEventListener("click", function () {
        mobileNav.classList.toggle("is-open");
      });
    }

    document.querySelectorAll("[data-search-form]").forEach(function (form) {
      form.addEventListener("submit", function (event) {
        var input = form.querySelector("input[name='q']");
        if (!input || !input.value.trim()) {
          event.preventDefault();
          window.location.href = "./search.html";
        }
      });
    });

    var hero = document.querySelector("[data-hero]");
    if (hero) {
      var slides = Array.prototype.slice.call(hero.querySelectorAll("[data-hero-slide]"));
      var dots = Array.prototype.slice.call(hero.querySelectorAll("[data-hero-dot]"));
      var prev = hero.querySelector("[data-hero-prev]");
      var next = hero.querySelector("[data-hero-next]");
      var current = 0;
      var timer = null;

      function show(index) {
        if (!slides.length) {
          return;
        }
        current = (index + slides.length) % slides.length;
        slides.forEach(function (slide, i) {
          slide.classList.toggle("is-active", i === current);
        });
        dots.forEach(function (dot, i) {
          dot.classList.toggle("is-active", i === current);
        });
      }

      function start() {
        window.clearInterval(timer);
        timer = window.setInterval(function () {
          show(current + 1);
        }, 5600);
      }

      dots.forEach(function (dot) {
        dot.addEventListener("click", function () {
          show(Number(dot.getAttribute("data-hero-dot")) || 0);
          start();
        });
      });

      if (prev) {
        prev.addEventListener("click", function () {
          show(current - 1);
          start();
        });
      }

      if (next) {
        next.addEventListener("click", function () {
          show(current + 1);
          start();
        });
      }

      start();
    }

    document.querySelectorAll("[data-page-filter]").forEach(function (form) {
      var input = form.querySelector("[data-page-search]");
      var cards = Array.prototype.slice.call(document.querySelectorAll("[data-movie-card]"));

      function filter() {
        var q = normalize(input ? input.value : "");
        cards.forEach(function (card) {
          var haystack = normalize([
            card.getAttribute("data-title"),
            card.getAttribute("data-year"),
            card.getAttribute("data-region"),
            card.getAttribute("data-genre"),
            card.getAttribute("data-tags")
          ].join(" "));
          card.classList.toggle("is-hidden", q && haystack.indexOf(q) === -1);
        });
      }

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        filter();
      });

      if (input) {
        input.addEventListener("input", filter);
      }
    });

    var results = document.querySelector("[data-search-results]");
    var searchInput = document.querySelector("[data-search-input]");
    var searchHint = document.querySelector("[data-search-hint]");

    if (results && window.MOVIE_SEARCH_DATA) {
      var params = new URLSearchParams(window.location.search);
      var q = params.get("q") || "";
      if (searchInput) {
        searchInput.value = q;
      }

      function card(movie) {
        var tags = (movie.tags || []).slice(0, 3).map(function (tag) {
          return "<span>" + escapeHtml(tag) + "</span>";
        }).join("");
        return "<article class='movie-card'>" +
          "<a class='poster-link' href='./" + escapeHtml(movie.slug) + "' aria-label='" + escapeHtml(movie.title) + "'>" +
          "<img src='" + escapeHtml(movie.cover) + "' alt='" + escapeHtml(movie.title) + "' loading='lazy'>" +
          "<span class='poster-shade'></span><span class='play-chip'>▶</span></a>" +
          "<div class='movie-card-body'><a class='movie-title' href='./" + escapeHtml(movie.slug) + "'>" + escapeHtml(movie.title) + "</a>" +
          "<p class='movie-meta'><span>" + escapeHtml(movie.year) + "</span><span>" + escapeHtml(movie.region) + "</span><span>" + escapeHtml(movie.type) + "</span></p>" +
          "<p class='movie-desc'>" + escapeHtml(movie.oneLine) + "</p><div class='tag-row'>" + tags + "</div></div></article>";
      }

      function render(query) {
        var words = normalize(query).split(/\s+/).filter(Boolean);
        var matched = window.MOVIE_SEARCH_DATA.filter(function (movie) {
          if (!words.length) {
            return movie.id <= 36;
          }
          var haystack = normalize([
            movie.title,
            movie.region,
            movie.type,
            movie.year,
            movie.genre,
            (movie.tags || []).join(" "),
            movie.oneLine
          ].join(" "));
          return words.every(function (word) {
            return haystack.indexOf(word) !== -1;
          });
        }).slice(0, 96);

        if (searchHint) {
          searchHint.textContent = words.length ? "已按关键词整理出相关影片。" : "也可以直接浏览下方推荐影片。";
        }

        results.innerHTML = matched.length ? matched.map(card).join("") : "<div class='story-card'><h2>暂无匹配影片</h2><p>换个关键词看看。</p></div>";
      }

      render(q);

      if (searchInput) {
        searchInput.addEventListener("input", function () {
          render(searchInput.value);
        });
      }
    }
  });
})();
