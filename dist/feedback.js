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

  function createStars(value) {
    const stars = element('span', 'feedback-stars');
    stars.setAttribute('role', 'img');
    stars.setAttribute('aria-label', value.toLocaleString('vi-VN') + ' trên 5 sao');
    for (let position = 0; position < 5; position++) {
      const star = element('span', 'feedback-star', '★');
      star.setAttribute('aria-hidden', 'true');
      const fill = Math.max(0, Math.min(1, value - position)) * 100;
      star.style.setProperty('--star-fill', fill + '%');
      stars.append(star);
    }
    return stars;
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
    meta.append(element('span', null, descriptor), createStars(review.rating));
    card.append(profile, element('blockquote', null, review.quote), meta);
    return card;
  }

  function showReviews(reviews, illustrative) {
    if (!reviews.length) return;
    const group = element('div', 'feedback-group');
    group.append(...reviews.map(createCard));
    const copy = group.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.inert = true;
    track.append(group, copy);
    const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    const score = element('span', 'feedback-score', average.toLocaleString('vi-VN'));
    score.setAttribute('aria-hidden', 'true');
    rating.replaceChildren(score, createStars(average));
    rating.hidden = false;
    const label = document.getElementById('feedback-preview-label')
      ?? element('p', null, 'Phản hồi minh họa');
    label.id = 'feedback-preview-label';
    label.hidden = !illustrative;
    rating.after(label);
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

  }

  fetch(dataUrl).then((response) => {
    if (!response.ok) throw new Error('Feedback unavailable');
    return response.json();
  }).then((reviews) => {
    const valid = reviews.filter((review) => review && typeof review.displayName === 'string' && typeof review.quote === 'string'
      && Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5);
    const real = valid.filter((review) => review.illustrative !== true);
    showReviews(real.length ? real : valid, preview || !real.length);
  }).catch(() => {
    empty.textContent = 'Chưa tải được phản hồi.';
  });
}
