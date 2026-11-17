if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      entry.target.dataset.revealState = entry.isIntersecting
        ? 'visible'
        : entry.boundingClientRect.bottom <= 0 ? 'above' : 'below';
    }
  });

  const objects = [
    '.hero-copy', '.hero-visual', '.principles', '.section-heading', '.feature',
    '.secondary-features article', '.approach-intro', '.steps article',
    '.team-heading', '.team-notebook', '.plans-head', '.download-heading',
    '.download-card', '.faq > div:first-child', '.faq-list details', '.closing',
  ];
  document.querySelectorAll(objects.join(',')).forEach((element) => observer.observe(element));

  const planList = document.getElementById('plan-list');
  if (planList) {
    const observePlans = () => {
      planList.querySelectorAll('.plan-card').forEach((card) => observer.observe(card));
    };
    new MutationObserver(observePlans).observe(planList, { childList: true });
    observePlans();
  }
}
