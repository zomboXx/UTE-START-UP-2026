const plansSection = document.getElementById('plans');
const planList = document.getElementById('plan-list');
const billing = plansSection.querySelectorAll('[name="billing"]');

function renderPlans(plans) {
  const period = [...billing].find((input) => input.checked).value;
  planList.replaceChildren(...plans.map((plan) => {
    const card = document.createElement('article');
    card.className = 'plan-card';
    if (plan.id === 'focus') card.classList.add('plan-highlight');
    const addText = (tag, value, className) => {
      const element = document.createElement(tag);
      if (className) element.className = className;
      element.textContent = value;
      card.append(element);
      return element;
    };
    addText('span', plan.label, 'plan-tag');
    addText('h3', plan.name);
    addText('p', plan.description, 'plan-description');
    addText('p', plan[period], 'plan-price');
    const features = document.createElement('ul');
    for (const value of plan.features) {
      const item = document.createElement('li');
      item.textContent = value;
      features.append(item);
    }
    card.append(features);
    if (plan.id === 'starter') {
      const link = addText('a', 'Xem bản Android', 'button');
      link.href = '#download';
    } else {
      const button = addText('button', 'Xem thông tin gói', 'plan-action');
      button.type = 'button';
      button.addEventListener('click', () => {
        document.getElementById('plan-dialog-title').textContent = plan.name;
        document.getElementById('plan-dialog-price').textContent = plan[period] + ' · Giá tham khảo';
        document.getElementById('plan-dialog').showModal();
      });
    }
    return card;
  }));
}

fetch(new URL('plans.json', document.currentScript.src)).then((response) => {
  if (!response.ok) throw new Error('Plans unavailable');
  return response.json();
}).then((plans) => {
  renderPlans(plans);
  for (const input of billing) {
    input.disabled = false;
    input.addEventListener('change', () => renderPlans(plans));
  }
}).catch(() => {
  planList.textContent = 'Chưa tải được danh sách gói. Vui lòng tải lại trang.';
});
