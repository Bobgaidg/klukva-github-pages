async function renderBrandPage() {
  const header = document.getElementById('brand-header');
  if (!header) return;

  const brandId = new URLSearchParams(window.location.search).get('id');
  const [brand, products, { byId }] = await Promise.all([
    brandId ? fetchBrandById(brandId) : Promise.resolve(null),
    fetchProducts(),
    fetchCategoriesById()
  ]);

  if (!brand) {
    header.innerHTML = `
      <p>Бренд не найден.</p>
      <p><a href="catalog.html">Вернуться в каталог</a></p>
    `;
    return;
  }

  const workshopLine = [brand.workshop, brand.city].filter(Boolean).join(', ');

  // Ссылка опасна не текстом, а самим адресом — без проверки протокола
  // она могла бы вести не на сайт, а на выполнение кода (javascript:...),
  // та же мысль, что для ссылок на фото. Раньше эта страница вообще не
  // проверяла supplierUrl перед тем, как вставить его в href.
  const goButton = isHttpUrl(brand.supplierUrl)
    ? html`<p><a class="button" href="${brand.supplierUrl}" target="_blank" rel="noopener">Перейти на сайт поставщика</a></p>`
    : '';

  // Рассказа о бренде в данных нет — он не выдуман, страница остаётся без него.
  header.innerHTML = html`
    <h1>${brand.name}</h1>
    <p class="card-brand">${workshopLine}</p>
    ${raw(goButton)}
    ${raw(brand.description ? html`<p>${brand.description}</p>` : '')}
  `;

  const filtered = products.filter((p) => p.supplierId === brandId);
  const page = parseInt(new URLSearchParams(window.location.search).get('page'), 10) || 1;
  renderProductGrid(filtered, byId, page, (p) => `brand.html?id=${encodeURIComponent(brandId)}&page=${p}`);
}

document.addEventListener('DOMContentLoaded', () => runSiteTask(renderBrandPage));
