(function () {
    "use strict";

    function qs(selector, root) {
        return (root || document).querySelector(selector);
    }

    function qsa(selector, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(selector));
    }

    function normalizeText(value) {
        return String(value || "").toLowerCase().trim();
    }

    function buildMovieCard(movie) {
        var tags = Array.isArray(movie.tags) ? movie.tags.slice(0, 3) : [];
        var tagHtml = tags.map(function (tag) {
            return "<span>" + escapeHtml(tag) + "</span>";
        }).join("");

        return "" +
            "<a class=\"movie-card\" href=\"" + escapeHtml(movie.url) + "\">" +
            "<figure class=\"poster-wrap\">" +
            "<img src=\"" + escapeHtml(movie.poster) + "\" alt=\"" + escapeHtml(movie.title) + " 海报\" loading=\"lazy\">" +
            "<span class=\"poster-badge\">" + escapeHtml(movie.genre.split(/[，,、/／]/)[0] || movie.type) + "</span>" +
            "<span class=\"poster-meta\">" + escapeHtml(movie.year) + " · " + escapeHtml(movie.region) + "</span>" +
            "<span class=\"poster-play\" aria-hidden=\"true\">▶</span>" +
            "</figure>" +
            "<div class=\"movie-card-body\">" +
            "<h3>" + escapeHtml(movie.title) + "</h3>" +
            "<p>" + escapeHtml(movie.oneLine) + "</p>" +
            "<div class=\"tag-row\">" + tagHtml + "</div>" +
            "</div>" +
            "</a>";
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function setupMobileNav() {
        var button = qs("[data-mobile-menu-button]");
        var nav = qs("[data-mobile-nav]");
        if (!button || !nav) {
            return;
        }
        button.addEventListener("click", function () {
            nav.classList.toggle("open");
        });
    }

    function setupHeroSlider() {
        var slider = qs("[data-hero-slider]");
        if (!slider) {
            return;
        }
        var slides = qsa("[data-hero-slide]", slider);
        var dots = qsa("[data-hero-dot]", slider);
        var jumpers = qsa("[data-hero-jump]");
        var index = 0;
        var timer = null;

        function show(nextIndex) {
            index = (nextIndex + slides.length) % slides.length;
            slides.forEach(function (slide, slideIndex) {
                slide.classList.toggle("active", slideIndex === index);
            });
            dots.forEach(function (dot, dotIndex) {
                dot.classList.toggle("active", dotIndex === index);
            });
        }

        function start() {
            stop();
            timer = window.setInterval(function () {
                show(index + 1);
            }, 5200);
        }

        function stop() {
            if (timer) {
                window.clearInterval(timer);
            }
        }

        dots.forEach(function (dot) {
            dot.addEventListener("click", function () {
                show(Number(dot.getAttribute("data-hero-dot")) || 0);
                start();
            });
        });

        jumpers.forEach(function (link) {
            link.addEventListener("mouseenter", function () {
                show(Number(link.getAttribute("data-hero-jump")) || 0);
            });
        });

        slider.addEventListener("mouseenter", stop);
        slider.addEventListener("mouseleave", start);
        show(0);
        start();
    }

    function setupHeaderSearch() {
        qsa("[data-site-search-form]").forEach(function (form) {
            form.addEventListener("submit", function (event) {
                var input = qs("input[name='q']", form);
                if (!input || !input.value.trim()) {
                    event.preventDefault();
                    window.location.href = "search.html";
                }
            });
        });
    }

    function setupCategoryFilter() {
        var grid = qs("[data-filter-grid]");
        var searchInput = qs("[data-card-filter]");
        var yearSelect = qs("[data-year-filter]");
        var countEl = qs("[data-filter-count]");
        if (!grid || !searchInput || !yearSelect) {
            return;
        }
        var cards = qsa(".movie-card", grid);

        function filter() {
            var keyword = normalizeText(searchInput.value);
            var year = yearSelect.value;
            var visibleCount = 0;

            cards.forEach(function (card) {
                var haystack = normalizeText([
                    card.getAttribute("data-title"),
                    card.getAttribute("data-year"),
                    card.getAttribute("data-region"),
                    card.getAttribute("data-genre"),
                    card.getAttribute("data-tags")
                ].join(" "));
                var yearMatches = !year || card.getAttribute("data-year") === year;
                var keywordMatches = !keyword || haystack.indexOf(keyword) !== -1;
                var visible = yearMatches && keywordMatches;
                card.classList.toggle("is-hidden", !visible);
                if (visible) {
                    visibleCount += 1;
                }
            });

            if (countEl) {
                countEl.textContent = visibleCount + " 部";
            }
        }

        searchInput.addEventListener("input", filter);
        yearSelect.addEventListener("change", filter);
        filter();
    }

    function setupSearchPage() {
        var results = qs("[data-search-results]");
        var summary = qs("[data-search-summary]");
        var form = qs("[data-search-page-form]");
        if (!results || !summary || !window.MOVIE_INDEX) {
            return;
        }
        var params = new URLSearchParams(window.location.search);
        var query = params.get("q") || "";
        var input = qs("input[name='q']", form || document);
        if (input) {
            input.value = query;
        }

        if (!query.trim()) {
            return;
        }

        var normalizedQuery = normalizeText(query);
        var matched = window.MOVIE_INDEX.filter(function (movie) {
            var haystack = normalizeText([
                movie.title,
                movie.year,
                movie.region,
                movie.type,
                movie.genre,
                movie.category,
                movie.oneLine,
                Array.isArray(movie.tags) ? movie.tags.join(" ") : ""
            ].join(" "));
            return haystack.indexOf(normalizedQuery) !== -1;
        }).slice(0, 120);

        summary.textContent = "搜索 “" + query + "” ，找到 " + matched.length + " 条结果";
        if (matched.length === 0) {
            results.innerHTML = "<div class=\"article-card\"><h2>暂无结果</h2><p>请尝试更换关键词，或返回分类页浏览完整片库。</p></div>";
            return;
        }
        results.innerHTML = matched.map(buildMovieCard).join("");
    }

    function setupImageFallback() {
        document.addEventListener("error", function (event) {
            var target = event.target;
            if (target && target.tagName === "IMG") {
                target.classList.add("image-missing");
            }
        }, true);
    }

    document.addEventListener("DOMContentLoaded", function () {
        setupMobileNav();
        setupHeroSlider();
        setupHeaderSearch();
        setupCategoryFilter();
        setupSearchPage();
        setupImageFallback();
    });
}());
