{
  const carousel = document.querySelector('.feedback-carousel');
  const track = carousel.querySelector('.feedback-track');
  const slides = [...track.children];
  const navigation = carousel.querySelector('.feedback-navigation');
  const counter = navigation.querySelector('.feedback-position');
  const motion = window.matchMedia('(prefers-reduced-motion: no-preference)');
  let current = 0;
  let direction = 1;
  let visible = !('IntersectionObserver' in window);
  let timer;

  function sizeSlide() {
    track.style.blockSize = slides[current].offsetHeight + 'px';
  }

  const observer = 'ResizeObserver' in window ? new ResizeObserver(sizeSlide) : null;

  function showSlide(index, announce = false) {
    current = index;
    track.setAttribute('aria-live', announce ? 'polite' : 'off');
    track.style.setProperty('--feedback-slide', index);
    counter.textContent = `${index + 1} / ${slides.length}`;
    observer?.disconnect();
    observer?.observe(slides[current]);
    sizeSlide();
    slides.forEach((slide, position) => {
      slide.setAttribute('aria-hidden', String(position !== index));
    });
  }

  function scheduleSlide() {
    clearTimeout(timer);
    if (!motion.matches || !visible || document.hidden || carousel.matches(':hover, :focus-within')) return;
    timer = setTimeout(() => {
      if (current === 0) direction = 1;
      if (current === slides.length - 1) direction = -1;
      showSlide(current + direction);
      scheduleSlide();
    }, Math.max(6500, slides[current].querySelector('blockquote').textContent.length / 15 * 1000));
  }

  if (slides.length > 1) {
    carousel.dataset.active = '';
    navigation.hidden = false;
    showSlide(0);
    if (!observer) window.addEventListener('resize', sizeSlide);
    for (const button of navigation.querySelectorAll('button')) {
      button.addEventListener('click', () => {
        const offset = Number(button.dataset.feedbackStep);
        showSlide((current + offset + slides.length) % slides.length, true);
        scheduleSlide();
      });
    }
    for (const event of ['pointerenter', 'pointerleave', 'focusin', 'focusout']) {
      carousel.addEventListener(event, () => setTimeout(scheduleSlide, 0));
    }
    motion.addEventListener('change', scheduleSlide);
    document.addEventListener('visibilitychange', scheduleSlide);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        scheduleSlide();
      }).observe(carousel);
    }
    scheduleSlide();
  }
}
