{
  const carousel = document.querySelector('.feedback-carousel');
  const track = carousel.querySelector('.feedback-track');
  const slides = [...track.children];
  const navigation = carousel.querySelector('.feedback-navigation');
  const motion = window.matchMedia('(prefers-reduced-motion: no-preference)');
  let current = 0;
  let direction = 1;
  let visible = !('IntersectionObserver' in window);
  let timer;

  function showSlide(index, announce = false) {
    current = index;
    track.setAttribute('aria-live', announce ? 'polite' : 'off');
    track.style.setProperty('--feedback-slide', index);
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
    }, 5500);
  }

  if (slides.length > 1) {
    carousel.dataset.active = '';
    navigation.hidden = false;
    showSlide(0);
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
