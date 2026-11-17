{
  const carousel = document.querySelector('.review-carousel');
  const slides = carousel.querySelector('.review-slides');
  const cards = [...slides.children];
  const controls = carousel.querySelector('.review-controls');
  const playButton = controls.querySelector('[data-review-play]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0;
  let direction = 1;
  let playing = !reducedMotion.matches;
  let visible = false;
  let timer;

  function showReview(index) {
    cards[active].hidden = true;
    active = index;
    cards[active].hidden = false;
  }

  function scheduleReview() {
    window.clearTimeout(timer);
    if (!playing || !visible || document.hidden || carousel.matches(':hover, :focus-within')) return;
    timer = window.setTimeout(() => {
      if (active === 0) direction = 1;
      if (active === cards.length - 1) direction = -1;
      slides.setAttribute('aria-live', 'off');
      showReview(active + direction);
      scheduleReview();
    }, 7000);
  }

  function setPlaying(enabled) {
    playing = enabled;
    playButton.textContent = playing ? 'Dừng' : 'Tự chạy';
    scheduleReview();
  }

  if (cards.length > 1) {
    controls.hidden = false;
    for (const button of controls.querySelectorAll('[data-review-step]')) {
      button.addEventListener('click', () => {
        setPlaying(false);
        slides.setAttribute('aria-live', 'polite');
        showReview((active + Number(button.dataset.reviewStep) + cards.length) % cards.length);
      });
    }
    playButton.addEventListener('click', () => setPlaying(!playing));
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) setPlaying(false);
    });
    for (const event of ['pointerenter', 'pointerleave', 'focusin', 'focusout']) {
      carousel.addEventListener(event, () => window.setTimeout(scheduleReview, 0));
    }
    document.addEventListener('visibilitychange', scheduleReview);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        scheduleReview();
      }).observe(carousel);
    } else {
      visible = true;
    }
    setPlaying(playing);
  }
}
