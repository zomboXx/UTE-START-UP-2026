{
  const reviewWall = document.getElementById('review-wall');
  const motion = window.matchMedia('(prefers-reduced-motion: no-preference)');
  const mobile = window.matchMedia('(max-width: 620px)');
  const copies = [...reviewWall.querySelectorAll('.review-stack')].map((stack) => {
    const copy = stack.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.dataset.copy = '';
    copy.inert = true;
    stack.after(copy);
    return copy;
  });
  let visible = !('IntersectionObserver' in window);

  function syncMotion() {
    const moving = motion.matches;
    reviewWall.toggleAttribute('data-motion', moving);
    reviewWall.toggleAttribute('data-playing', moving && visible);
    for (const copy of copies) copy.hidden = !moving;
  }

  function syncKeyboardAccess() {
    if (mobile.matches) {
      reviewWall.tabIndex = 0;
      reviewWall.setAttribute('role', 'region');
      reviewWall.setAttribute('aria-label', 'Các cột tính năng');
    } else {
      reviewWall.removeAttribute('tabindex');
      reviewWall.removeAttribute('role');
      reviewWall.removeAttribute('aria-label');
    }
  }

  motion.addEventListener('change', syncMotion);
  mobile.addEventListener('change', syncKeyboardAccess);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      syncMotion();
    }).observe(reviewWall);
  }

  syncMotion();
  syncKeyboardAccess();
}
