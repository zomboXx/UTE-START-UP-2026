const planList = document.getElementById('plan-list');

function createPlanCard(plan) {
  const card = document.createElement('article');
  card.className = plan.id === 'focus' ? 'plan-card plan-highlight' : 'plan-card';

  const label = document.createElement('span');
  label.className = 'plan-tag';
  label.textContent = plan.label;

  const name = document.createElement('h3');
  name.textContent = plan.name;

  const description = document.createElement('p');
  description.className = 'plan-description';
  description.textContent = plan.description;

  const prices = document.createElement('dl');
  prices.className = 'plan-prices';
  for (const [period, heading] of [['monthly', 'Theo tháng'], ['annual', 'Theo năm']]) {
    const item = document.createElement('div');
    const term = document.createElement('dt');
    term.textContent = heading;
    const price = document.createElement('dd');
    price.textContent = plan[period] ?? 'Chưa công bố';
    price.classList.toggle('plan-price-pending', plan[period] == null);
    item.append(term, price);
    prices.append(item);
  }

  const features = document.createElement('ul');
  for (const value of plan.features) {
    const item = document.createElement('li');
    item.textContent = value;
    features.append(item);
  }

  card.append(label, name, description, prices, features);

  if (plan.id === 'starter') {
    const link = document.createElement('a');
    link.className = 'button';
    link.href = '#download';
    link.textContent = 'Xem bản Android';
    card.append(link);
  }

  return card;
}

fetch(new URL('plans.json', document.currentScript.src)).then((response) => {
  if (!response.ok) throw new Error('Plans unavailable');
  return response.json();
}).then((plans) => {
  planList.replaceChildren(...plans.map(createPlanCard));
}).catch(() => {
  planList.textContent = 'Chưa tải được danh sách gói. Vui lòng tải lại trang.';
});
