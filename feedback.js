{
  const viewport = document.querySelector('.feedback-viewport');
  const track = viewport.querySelector('.feedback-track');
  const empty = document.getElementById('feedback-empty');
  const rating = document.getElementById('feedback-rating');
  const script = new URL(document.currentScript.src);
  const local = ['127.0.0.1', 'localhost'].includes(location.hostname);
  const preview = local && new URLSearchParams(location.search).get('feedback') === 'preview';
  const dataUrl = new URL(preview ? 'feedback-preview.json' : 'feedback.json', script);
  dataUrl.search = script.search;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function createCard(review) {
    const card = element('article', 'feedback-slide');
    const profile = element('header', 'feedback-profile');
    const avatar = element('span', 'feedback-avatar');
    avatar.setAttribute('aria-hidden', 'true');
    const identity = element('div');
    identity.append(element('h3', null, review.displayName));
    if (review.username) identity.append(element('p', 'feedback-username', '@' + review.username));
    profile.append(avatar, identity);

    const meta = element('footer', 'feedback-meta');
    const descriptor = [review.age && review.age + ' tuổi', review.occupation].filter(Boolean).join(' · ');
    meta.append(element('span', null, descriptor), element('span', 'feedback-stars', '★ ' + review.rating + '/5 sao'));
    card.append(profile, element('blockquote', null, review.quote), meta);
    return card;
  }

  function showReviews(reviews) {
    if (!reviews.length) return;
    const group = element('div', 'feedback-group');
    group.append(...reviews.map(createCard));
    const copy = group.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.inert = true;
    track.append(group, copy);
    const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    rating.textContent = '★ ' + average.toLocaleString('vi-VN', {maximumFractionDigits: 1}) + ' / 5 · ' + reviews.length + ' phản hồi';
    rating.hidden = false;
    document.getElementById('feedback-preview-label').hidden = !preview;
    empty.hidden = true;
    viewport.hidden = false;

    function measure() {
      const width = group.offsetWidth;
      viewport.toggleAttribute('data-loop', reviews.length > 1 && width > viewport.clientWidth);
      viewport.style.setProperty('--feedback-duration', Math.max(24, width / 38) + 's');
    }

    measure();
    if ('ResizeObserver' in window) {
      const resize = new ResizeObserver(measure);
      resize.observe(group);
      resize.observe(viewport);
    } else {
      window.addEventListener('resize', measure);
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        viewport.toggleAttribute('data-visible', entry.isIntersecting);
      }).observe(viewport);
    } else {
      viewport.dataset.visible = '';
    }

    viewport.addEventListener('focusin', () => { viewport.dataset.manual = ''; });
    viewport.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'touch') viewport.dataset.manual = '';
    });
  }

  fetch(dataUrl).then((response) => {
    if (!response.ok) throw new Error('Feedback unavailable');
    return response.json();
  }).then((reviews) => {
    showReviews(reviews.filter((review) => typeof review.displayName === 'string' && typeof review.quote === 'string'
      && Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5));
  }).catch(() => {
    empty.textContent = 'Chưa tải được phản hồi.';
  });
}
