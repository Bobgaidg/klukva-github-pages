// «Вы смотрели» — решение владельца от 15.10.2026, по просьбе
// оркестратора не через cookie, а через хранилище браузера: cookie
// уходят на сервер при каждом открытии любой страницы, то есть сайт
// начал бы знать, что смотрел каждый посетитель. localStorage до
// сервера не доходит вовсе — для витрины честнее, этой истории нам не
// нужно. Храним только список id просмотренных товаров, не больше
// восьми, самый новый первым.
const RECENTLY_VIEWED_KEY = 'klukva-recently-viewed';
const RECENTLY_VIEWED_MAX = 8;

// Обёрнуто в try/catch нарочно: приватный режим браузера, отключённое
// хранилище или заполненный лимит могут бросить исключение на любой
// операции — это не должно ломать саму страницу, самое худшее, что
// может случиться, это что раздел «Вы смотрели» не запомнит визит.
function recordRecentlyViewed(productId) {
  if (!productId) return;
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const filtered = Array.isArray(list) ? list.filter((id) => id !== productId) : [];
    filtered.unshift(productId);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(filtered.slice(0, RECENTLY_VIEWED_MAX)));
  } catch (e) {
    // тихо игнорируем — см. комментарий выше
  }
}

function readRecentlyViewedIds() {
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

// Товар, который посетитель смотрел месяц назад, мог за это время уйти
// в черновик (сняли сами, кончилась подписка) — localStorage этого не
// знает, браузер хранит только то, что записал тогда. Поэтому не
// доверяем списку как есть: берём свежий /api/products (он и так отдаёт
// только опубликованное) и показываем лишь то, что в нём действительно
// нашлось, в порядке просмотра. Раздела нет вовсе, если смотреть нечего
// — не пустая рамка с заголовком.
async function renderRecentlyViewed() {
  const section = document.getElementById('recently-viewed-section');
  const list = document.getElementById('recently-viewed-cards');
  if (!section || !list) return;

  const ids = readRecentlyViewedIds();
  if (!ids.length) return;

  const [products, { byId }] = await Promise.all([fetchProducts(), fetchCategoriesById()]);
  const byProductId = {};
  products.forEach((p) => { byProductId[p.id] = p; });

  const found = ids.map((id) => byProductId[id]).filter(Boolean).slice(0, RECENTLY_VIEWED_MAX);
  if (!found.length) return;

  list.innerHTML = found.map((p) => cardTemplate(p, byId)).join('');
  section.hidden = false;
}

document.addEventListener('DOMContentLoaded', () => runSiteTask(renderRecentlyViewed));
