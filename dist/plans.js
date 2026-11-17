import { formatVnd, loadPlanCatalog } from './plan-catalog.js';

const planList = document.getElementById('plan-list');

function createPlanCard(plan) {
  const card = document.createElement('article');
  card.className = plan.id === 'pro' ? 'plan-card plan-highlight' : 'plan-card';

  const heading = document.createElement('header');
  const name = document.createElement('h3');
  name.textContent = plan.name;
  heading.append(name);
  if (plan.audience) {
    const audience = document.createElement('p');
    audience.className = 'plan-audience';
    audience.textContent = plan.audience;
    heading.append(audience);
  }

  const price = document.createElement('p');
  price.className = 'plan-price';
  if (plan.pricePrefix) {
    const prefix = document.createElement('span');
    prefix.className = 'plan-price-prefix';
    prefix.textContent = plan.pricePrefix;
    price.append(prefix, ' ');
  }
  const amount = document.createElement('strong');
  amount.textContent = plan.monthlyAmount === 0 ? 'Miễn phí' : formatVnd(plan.monthlyAmount);
  price.append(amount);
  if (plan.priceUnit) {
    const unit = document.createElement('span');
    unit.className = 'plan-price-unit';
    unit.textContent = plan.priceUnit;
    price.append(' ', unit);
  }

  const description = document.createElement('p');
  description.className = 'plan-description';
  description.textContent = plan.description;

  const features = document.createElement('ul');
  for (const value of plan.features) {
    const item = document.createElement('li');
    item.textContent = value;
    features.append(item);
  }

  card.append(heading, price, description);
  if (plan.featuresTitle) {
    const title = document.createElement('h4');
    title.textContent = plan.featuresTitle;
    card.append(title);
  }
  card.append(features);

  const action = document.createElement('a');
  action.className = 'button';
  if (plan.id === 'free') {
    action.href = '#download';
    action.textContent = 'Dùng miễn phí';
  } else {
    const checkoutUrl = new URL('checkout/', plansScript);
    checkoutUrl.searchParams.set('plan', plan.id);
    action.href = checkoutUrl.href;
    action.textContent = 'Nâng cấp ngay';
  }
  card.append(action);

  return card;
}

const plansScript = new URL(import.meta.url);
loadPlanCatalog(plansScript, 'plans.json').then((plans) => {
  planList.replaceChildren(...plans.map(createPlanCard));
}).catch(() => {
  planList.textContent = 'Chưa tải được danh sách gói. Vui lòng tải lại trang.';
});
