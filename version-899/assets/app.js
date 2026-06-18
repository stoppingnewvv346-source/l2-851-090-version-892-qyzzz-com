(function () {
    function ready(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    ready(function () {
        initMobileMenu();
        initHero();
        initLocalFilters();
        initSearchPage();
        initPlayers();
        initImageFallback();
    });

    function initMobileMenu() {
        var button = document.querySelector('.mobile-menu-button');
        var nav = document.querySelector('.mobile-nav');
        if (!button || !nav) return;
        button.addEventListener('click', function () {
            var open = nav.classList.toggle('open');
            button.setAttribute('aria-expanded', open ? 'true' : 'false');
            button.textContent = open ? '×' : '☰';
        });
    }

    function initHero() {
        var hero = document.querySelector('[data-hero]');
        if (!hero) return;
        var slides = Array.prototype.slice.call(hero.querySelectorAll('[data-hero-slide]'));
        var dots = Array.prototype.slice.call(hero.querySelectorAll('[data-hero-dot]'));
        var prev = hero.querySelector('[data-hero-prev]');
        var next = hero.querySelector('[data-hero-next]');
        if (!slides.length) return;
        var index = 0;
        var timer = null;

        function show(nextIndex) {
            index = (nextIndex + slides.length) % slides.length;
            slides.forEach(function (slide, i) {
                slide.classList.toggle('active', i === index);
            });
            dots.forEach(function (dot, i) {
                dot.classList.toggle('active', i === index);
            });
        }

        function restart() {
            window.clearInterval(timer);
            timer = window.setInterval(function () {
                show(index + 1);
            }, 5200);
        }

        dots.forEach(function (dot, i) {
            dot.addEventListener('click', function () {
                show(i);
                restart();
            });
        });

        if (prev) {
            prev.addEventListener('click', function () {
                show(index - 1);
                restart();
            });
        }

        if (next) {
            next.addEventListener('click', function () {
                show(index + 1);
                restart();
            });
        }

        restart();
    }

    function initLocalFilters() {
        var input = document.querySelector('.filter-input');
        var select = document.querySelector('.filter-select');
        var cards = Array.prototype.slice.call(document.querySelectorAll('.filter-grid .movie-card'));
        var empty = document.querySelector('.empty-state');
        if (!cards.length || (!input && !select)) return;

        function apply() {
            var q = input ? input.value.trim().toLowerCase() : '';
            var year = select ? select.value : '';
            var visible = 0;
            cards.forEach(function (card) {
                var haystack = [
                    card.dataset.title,
                    card.dataset.region,
                    card.dataset.year,
                    card.dataset.type,
                    card.dataset.category,
                    card.dataset.tags
                ].join(' ').toLowerCase();
                var ok = (!q || haystack.indexOf(q) !== -1) && (!year || card.dataset.year === year);
                card.hidden = !ok;
                if (ok) visible += 1;
            });
            if (empty) empty.hidden = visible !== 0;
        }

        if (input) input.addEventListener('input', apply);
        if (select) select.addEventListener('change', apply);
    }

    function initSearchPage() {
        var data = window.MOVIE_SEARCH_DATA;
        var input = document.getElementById('site-search-input');
        var year = document.getElementById('site-search-year');
        var region = document.getElementById('site-search-region');
        var results = document.getElementById('search-results');
        var status = document.getElementById('search-status');
        if (!data || !input || !results) return;
        var params = new URLSearchParams(window.location.search);
        var initial = params.get('q') || '';
        input.value = initial;

        function render() {
            var q = input.value.trim().toLowerCase();
            var y = year ? year.value : '';
            var r = region ? region.value : '';
            var list = data.filter(function (item) {
                var haystack = [item.title, item.oneLine, item.region, item.year, item.type, item.category, item.tags].join(' ').toLowerCase();
                return (!q || haystack.indexOf(q) !== -1) && (!y || String(item.year) === y) && (!r || item.region === r);
            }).slice(0, 120);
            results.innerHTML = list.map(renderCard).join('');
            status.textContent = list.length ? '搜索结果' : '没有找到匹配影片';
        }

        function renderCard(item) {
            return '<article class="movie-card">' +
                '<a class="movie-card-link" href="./' + escapeHtml(item.file) + '">' +
                '<div class="poster-frame">' +
                '<img src="./' + escapeHtml(item.cover) + '" alt="' + escapeHtml(item.title) + '" loading="lazy" onerror="this.style.opacity=\'0\'">' +
                '<div class="poster-shade"><span class="play-badge">▶</span></div>' +
                '<span class="score-badge">★ ' + escapeHtml(item.score) + '</span>' +
                '<span class="duration-badge">' + escapeHtml(item.duration) + '</span>' +
                '</div>' +
                '<div class="movie-card-body">' +
                '<h3>' + escapeHtml(item.title) + '</h3>' +
                '<p>' + escapeHtml(item.oneLine) + '</p>' +
                '<div class="movie-meta-row"><span>' + escapeHtml(item.region) + ' · ' + escapeHtml(item.year) + '</span><span>' + escapeHtml(item.category) + '</span></div>' +
                '<div class="tag-row">' + item.tags.slice(0, 3).map(function (tag) { return '<span>' + escapeHtml(tag) + '</span>'; }).join('') + '</div>' +
                '</div>' +
                '</a>' +
                '</article>';
        }

        input.addEventListener('input', render);
        if (year) year.addEventListener('change', render);
        if (region) region.addEventListener('change', render);
        render();
    }

    function initPlayers() {
        var shells = Array.prototype.slice.call(document.querySelectorAll('[data-player]'));
        shells.forEach(function (shell) {
            var video = shell.querySelector('video');
            var overlay = shell.querySelector('.video-overlay');
            var message = shell.querySelector('.video-message');
            var source = shell.dataset.src;
            var hlsInstance = null;
            if (!video || !source) return;

            function showMessage(text) {
                if (!message) return;
                message.textContent = text;
                message.hidden = false;
            }

            function attachSource() {
                if (video.dataset.ready === '1') return;
                if (window.Hls && window.Hls.isSupported()) {
                    hlsInstance = new window.Hls({ enableWorker: true, lowLatencyMode: true });
                    hlsInstance.loadSource(source);
                    hlsInstance.attachMedia(video);
                    hlsInstance.on(window.Hls.Events.ERROR, function (event, data) {
                        if (!data || !data.fatal) return;
                        if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) {
                            showMessage('视频正在重新连接');
                            hlsInstance.startLoad();
                        } else if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR) {
                            showMessage('视频正在恢复播放');
                            hlsInstance.recoverMediaError();
                        } else {
                            showMessage('当前视频暂时无法播放');
                            hlsInstance.destroy();
                        }
                    });
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    video.src = source;
                } else {
                    video.src = source;
                }
                video.dataset.ready = '1';
            }

            function play() {
                attachSource();
                shell.classList.add('playing');
                var promise = video.play();
                if (promise && promise.catch) {
                    promise.catch(function () {
                        shell.classList.remove('playing');
                        showMessage('点击播放器继续播放');
                    });
                }
            }

            if (overlay) {
                overlay.addEventListener('click', play);
            }
            shell.addEventListener('click', function (event) {
                if (event.target === video || event.target === shell) {
                    play();
                }
            });
            video.addEventListener('play', function () {
                shell.classList.add('playing');
            });
            video.addEventListener('pause', function () {
                if (!video.ended) shell.classList.remove('playing');
            });
            video.addEventListener('error', function () {
                showMessage('当前视频暂时无法播放');
            });
            window.addEventListener('beforeunload', function () {
                if (hlsInstance) hlsInstance.destroy();
            });
        });
    }

    function initImageFallback() {
        document.querySelectorAll('img').forEach(function (img) {
            img.addEventListener('error', function () {
                img.style.opacity = '0';
            });
        });
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
})();
