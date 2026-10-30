// Public static snapshots. Relative URLs work under /REPOSITORY/ on GitHub Pages.
const STATIC_DATA_BASE = new URL('../data/', document.currentScript.src);
const STATIC_SITE_BASE = new URL('../', document.currentScript.src);
const staticDataCache = new Map();

function fetchStaticJson(filename) {
  if (window.location.protocol === 'file:') {
    return Promise.reject(new Error('Для просмотра запустите «Preview.cmd» или откройте сайт через GitHub Pages. Открытие HTML двойным щелчком не загружает каталог.'));
  }
  if (!staticDataCache.has(filename)) {
    const request = fetch(new URL(filename, STATIC_DATA_BASE)).then((response) => {
      if (!response.ok) throw new Error('Не удалось загрузить данные каталога. Обновите страницу.');
      return response.json();
    }).catch((error) => {
      staticDataCache.delete(filename);
      throw error;
    });
    staticDataCache.set(filename, request);
  }
  return staticDataCache.get(filename);
}

async function fetchProducts() {
  const products = await fetchStaticJson('products.json');
  return products.map((product) => ({
    ...product,
    photoUrl: new URL(product.photoUrl, STATIC_SITE_BASE).href,
    extraPhotoUrls: (product.extraPhotoUrls || []).map((url) => new URL(url, STATIC_SITE_BASE).href)
  }));
}

async function fetchCategoriesById() {
  const categories = await fetchStaticJson('categories.json');
  return { categories, byId: Object.fromEntries(categories.map((c) => [c.id, c.label])) };
}

async function fetchProductById(id) {
  const products = await fetchProducts();
  return products.find((product) => product.id === id) || null;
}

async function fetchBrandById(id) {
  const brands = await fetchStaticJson('brands.json');
  return brands.find((brand) => brand.id === id) || null;
}

async function runSiteTask(task) {
  try {
    await task();
  } catch (error) {
    let message = document.getElementById('data-load-error');
    if (!message) {
      message = document.createElement('p');
      message.id = 'data-load-error';
      message.className = 'placeholder-note';
      message.setAttribute('role', 'alert');
      document.querySelector('main').prepend(message);
    }
    message.textContent = error.message || 'Не удалось загрузить каталог.';
  }
}
