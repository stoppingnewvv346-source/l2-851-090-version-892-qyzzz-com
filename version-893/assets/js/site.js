(() => {
  const menuButton = document.querySelector('[data-menu-toggle]');
  const mainNav = document.querySelector('[data-main-nav]');

  if (menuButton && mainNav) {
    menuButton.addEventListener('click', () => {
      mainNav.classList.toggle('is-open');
    });
  }

  const carousel = document.querySelector('[data-hero-carousel]');
  if (carousel) {
    const slides = Array.from(carousel.querySelectorAll('[data-hero-slide]'));
    const dots = Array.from(carousel.querySelectorAll('[data-hero-dot]'));
    let activeIndex = 0;

    const setActive = (index) => {
      activeIndex = (index + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => {
        slide.classList.toggle('is-active', slideIndex === activeIndex);
      });
      dots.forEach((dot, dotIndex) => {
        dot.classList.toggle('is-active', dotIndex === activeIndex);
      });
    };

    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => setActive(index));
    });

    if (slides.length > 1) {
      window.setInterval(() => setActive(activeIndex + 1), 5200);
    }
  }

  const filterPanel = document.querySelector('[data-filter-panel]');
  const movieList = document.querySelector('[data-movie-list]');

  if (filterPanel && movieList) {
    const input = filterPanel.querySelector('[data-search-input]');
    const reset = filterPanel.querySelector('[data-filter-reset]');
    const count = filterPanel.querySelector('[data-filter-count]');
    const cards = Array.from(movieList.querySelectorAll('.movie-card'));
    const params = new URLSearchParams(window.location.search);
    const initialKeyword = params.get('q') || '';

    const normalize = (value) => String(value || '').trim().toLowerCase();

    const applyFilter = () => {
      const keyword = normalize(input.value);
      let visible = 0;

      cards.forEach((card) => {
        const haystack = normalize([
          card.dataset.title,
          card.dataset.region,
          card.dataset.year,
          card.dataset.genre,
          card.dataset.type,
          card.textContent,
        ].join(' '));
        const matched = keyword === '' || haystack.includes(keyword);
        card.classList.toggle('is-hidden-card', !matched);
        if (matched) {
          visible += 1;
        }
      });

      if (count) {
        count.textContent = keyword
          ? `匹配到 ${visible} 部影片`
          : `正在展示全部 ${cards.length} 部影片`;
      }
    };

    if (input) {
      input.value = initialKeyword;
      input.addEventListener('input', applyFilter);
      applyFilter();
    }

    if (reset && input) {
      reset.addEventListener('click', () => {
        input.value = '';
        applyFilter();
        input.focus();
      });
    }
  }
})();
