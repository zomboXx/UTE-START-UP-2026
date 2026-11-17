const vnd = new Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'});

export function formatVnd(amount) {
  return vnd.format(amount);
}

export async function loadPlanCatalog(script, path) {
  const url = new URL(path, script);
  url.search = script.search;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Plan catalog unavailable');
  return response.json();
}
