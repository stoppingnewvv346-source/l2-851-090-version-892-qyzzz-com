document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.querySelector("[data-mobile-toggle]");
  var nav = document.querySelector("[data-mobile-nav]");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      nav.classList.toggle("is-open");
    });
  }

  var query = new URLSearchParams(window.location.search).get("q");
  var searchInputs = document.querySelectorAll("[data-filter-search]");

  searchInputs.forEach(function (input) {
    if (query) {
      input.value = query;
    }
  });

  document.querySelectorAll("[data-filter-panel]").forEach(function (panel) {
    var grid = document.querySelector("[data-card-grid]");
    var empty = document.querySelector("[data-empty-result]");
    var search = panel.querySelector("[data-filter-search]");
    var year = panel.querySelector("[data-filter-year]");
    var region = panel.querySelector("[data-filter-region]");
    var sort = panel.querySelector("[data-sort]");

    if (!grid) {
      return;
    }

    var cards = Array.prototype.slice.call(grid.querySelectorAll("[data-card]"));
    var original = cards.slice();

    function apply() {
      var word = search ? search.value.trim().toLowerCase() : "";
      var selectedYear = year ? year.value : "";
      var selectedRegion = region ? region.value : "";
      var visible = 0;

      cards.forEach(function (card) {
        var text = (card.getAttribute("data-text") || "").toLowerCase();
        var okWord = !word || text.indexOf(word) !== -1;
        var okYear = !selectedYear || card.getAttribute("data-year") === selectedYear;
        var okRegion = !selectedRegion || card.getAttribute("data-region") === selectedRegion;
        var show = okWord && okYear && okRegion;
        card.classList.toggle("is-hidden", !show);
        if (show) {
          visible += 1;
        }
      });

      if (empty) {
        empty.classList.toggle("is-visible", visible === 0);
      }
    }

    function resort() {
      var value = sort ? sort.value : "default";
      var next = original.slice();

      if (value === "year-desc") {
        next.sort(function (a, b) {
          return (b.getAttribute("data-year") || "").localeCompare(a.getAttribute("data-year") || "");
        });
      }

      if (value === "year-asc") {
        next.sort(function (a, b) {
          return (a.getAttribute("data-year") || "").localeCompare(b.getAttribute("data-year") || "");
        });
      }

      if (value === "title") {
        next.sort(function (a, b) {
          return (a.getAttribute("data-title") || "").localeCompare(b.getAttribute("data-title") || "", "zh-Hans-CN");
        });
      }

      next.forEach(function (card) {
        grid.appendChild(card);
      });

      cards = next;
      apply();
    }

    [search, year, region].forEach(function (control) {
      if (control) {
        control.addEventListener("input", apply);
        control.addEventListener("change", apply);
      }
    });

    if (sort) {
      sort.addEventListener("change", resort);
    }

    apply();
  });

  var player = document.querySelector("[data-player]");

  if (player && window.__m3u8Source) {
    var video = player.querySelector("video");
    var button = player.querySelector("[data-play-button]");
    var hlsInstance = null;

    function attachSource() {
      if (!video) {
        return;
      }

      if (window.Hls && window.Hls.isSupported()) {
        hlsInstance = new window.Hls({ enableWorker: true });
        hlsInstance.loadSource(window.__m3u8Source);
        hlsInstance.attachMedia(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = window.__m3u8Source;
      }
    }

    function startPlayback() {
      if (!video) {
        return;
      }

      if (button) {
        button.classList.add("is-hidden");
      }

      video.controls = true;
      var playTask = video.play();

      if (playTask && typeof playTask.catch === "function") {
        playTask.catch(function () {
          if (button) {
            button.classList.remove("is-hidden");
          }
        });
      }
    }

    attachSource();

    if (button) {
      button.addEventListener("click", startPlayback);
    }

    if (video) {
      video.addEventListener("play", function () {
        if (button) {
          button.classList.add("is-hidden");
        }
      });

      video.addEventListener("pause", function () {
        if (button && video.currentTime === 0) {
          button.classList.remove("is-hidden");
        }
      });
    }

    window.addEventListener("beforeunload", function () {
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    });
  }
});
