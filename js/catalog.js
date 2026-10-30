const PAGE_SIZE = 24; // карточек на страницу каталога — меняется в одном месте
const HOME_ROWS = 3; // сколько рядов карточек показывать на главной
const HOME_MAX_CARDS = null; // жёсткий потолок карточек на главной (например, 12) — null выключает его

// Цена — либо одна фиксированная (просто число), либо вилка «от и до»
// (решение владельца от 12.10.2026). Верхняя граница необязательна:
// отсутствует — значит именно отсутствует, а не ноль (тот же класс
// ошибки, что мы сегодня трижды чинили на нижней границе).
function formatPrice(product) {
  if (!product.showPrice || product.priceFrom === null || product.priceFrom === undefined) return '';
  const from = product.priceFrom.toLocaleString('ru-RU');
  const hasRange = product.priceTo !== null && product.priceTo !== undefined && product.priceTo > product.priceFrom;
  if (hasRange) {
    return `от ${from} до ${product.priceTo.toLocaleString('ru-RU')} ₽`;
  }
  return `${from} ₽`;
}

// Ссылка на фото не проверяется на сервере тем, что по ней реально лежит
// изображение (это значило бы ходить туда от имени сервера) — только
// внешний вид ссылки (https). Настоящую неудачу (битая ссылка, не
// картинка на деле) ловит onerror в браузере. Два разных случая — не
// одна и та же заглушка: «фото не указано» — обычное дело, молчим;
// «ссылка была, но не сработала» — что-то сломалось, посетителю так и
// говорим и просим сообщить, а не молчим серым квадратом (решение
// владельца от 12.10.2026).
// Три места показывают битое фото по-разному, не одним и тем же текстом
// — решение от 15.10.2026, после того как владелец прислал снимок с
// наложением: длинная подпись из полноэкранной галереи заезжала под
// стрелки листания (их тогда не было, когда писали первый текст — два
// слоя сделали порознь, не подумав, что могут встретиться). mode:
// 'compact' — карточка в сетке каталога (без ссылки, своя обёртка уже
// ссылка); 'thumb' — маленькое превью в ряду под главным фото (просто
// короткий значок, там даже «Фото не загрузилось» не влезет); 'full' —
// везде, где места достаточно (страница товара, карточка с одним фото).
function replaceWithPhotoPlaceholder(img, placeholderClass, mode) {
  const placeholder = document.createElement('div');
  placeholder.className = placeholderClass + ' photo-error';
  if (mode === 'compact') {
    placeholder.textContent = 'Фото не загрузилось';
  } else if (mode === 'thumb') {
    placeholder.textContent = '✕ фото';
    placeholder.title = 'Фото не загрузилось';
  } else {
    // Точка и тире вокруг ссылки, не после неё — на узком экране (420px
    // внутри тесной галереи, за вычетом места под стрелки) фраза из
    // одного длинного предложения с тире переносилась посередине ссылки,
    // сиротливая точка повисала одна на своей строке. Два коротких
    // предложения переносятся предсказуемее — после ссылки ничего нет,
    // сиротеть нечему. Найдено 16.10.2026, проверено на 420px.
    placeholder.innerHTML = 'Фото не загрузилось. <a href="mailto:hello@klukvaconcept.store">Сообщите нам</a>';
  }
  img.replaceWith(placeholder);
}

function photoBlock(product, photoClass, placeholderClass, compact) {
  // Ссылка на фото уже проверена сервером (https://), но здесь —
  // повторно и явно: это атрибут src, и защита должна стоять на месте
  // использования, не полагаться на то, что где-то раньше уже проверили.
  if (!product.photoUrl || !isHttpUrl(product.photoUrl)) return html`<div class="${placeholderClass}">фото</div>`;
  const mode = compact ? 'compact' : 'full';
  return html`<img class="${photoClass}" src="${product.photoUrl}" alt="${product.name || ''}" loading="lazy" data-placeholder-class="${placeholderClass}" onerror="replaceWithPhotoPlaceholder(this, this.dataset.placeholderClass, '${mode}')">`;
}

// Товар может стоять в нескольких разделах (решение владельца от
// 15.10.2026) — в тесной сетке каталога показываем только первый,
// остальные видны на странице товара и в кабинете, где места больше.
function cardInnerTemplate(product, categoriesById) {
  const firstCategoryId = (product.categories || [])[0];
  const categoryLabel = categoriesById && categoriesById[firstCategoryId] ? categoriesById[firstCategoryId] : '';
  return html`
    <a href="card.html?id=${encodeURIComponent(product.id || '')}">
      ${raw(photoBlock(product, 'card-photo-img', 'card-photo', true))}
      ${categoryLabel ? raw(html`<div class="card-category">${categoryLabel}</div>`) : ''}
      <div class="card-brand">${product.brand || ''}</div>
      <div class="card-name">${product.name || ''}</div>
      <div class="card-price">${formatPrice(product)}</div>
    </a>
  `;
}

function cardTemplate(product, categoriesById) {
  return `<li class="card">${cardInnerTemplate(product, categoriesById)}</li>`;
}


function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Сколько карточек реально помещается в ряд сейчас — сетка резиновая,
// на узком экране в ряду не три карточки, а две, на широком может быть и больше.
function currentColumnCount(grid) {
  const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean);
  return columns.length || 1;
}

async function renderHomeCards() {
  const list = document.getElementById('home-cards');
  if (!list) return;
  const emptyNote = document.getElementById('home-cards-empty');
  const [products, { byId }] = await Promise.all([fetchProducts(), fetchCategoriesById()]);

  // Пустой каталог — честное, но отдельное состояние: заголовок без
  // карточек под ним на первый взгляд не отличить от поломки. На
  // странице «Каталог» для этого уже есть #catalog-empty, здесь было
  // пусто без объяснения. Решение от 15.10.2026.
  if (emptyNote) emptyNote.hidden = products.length > 0;

  const render = () => {
    const columns = currentColumnCount(list);
    let count = columns * HOME_ROWS;
    if (HOME_MAX_CARDS) count = Math.min(count, HOME_MAX_CARDS);
    list.innerHTML = products.slice(0, count).map((p) => cardTemplate(p, byId)).join('');
  };
  render();
  window.addEventListener('resize', debounce(render, 200));
}

function clampPage(page, totalPages) {
  if (Number.isNaN(page) || page < 1) return 1;
  if (page > totalPages) return totalPages;
  return page;
}

function renderPagination(totalPages, currentPage, buildHref) {
  const nav = document.getElementById('pagination');
  if (!nav) return;
  if (totalPages <= 1) {
    nav.innerHTML = '';
    return;
  }
  const links = [];
  for (let page = 1; page <= totalPages; page += 1) {
    const isActive = page === currentPage;
    links.push(`<a href="${buildHref(page)}"${isActive ? ' class="active"' : ''}>${page}</a>`);
  }
  nav.innerHTML = links.join('');
}

// Общий рендер сетки карточек со страницами — используется и в каталоге,
// и на странице бренда, чтобы не заводить второй механизм разбивки.
function renderProductGrid(filtered, categoriesById, page, buildHref) {
  const list = document.getElementById('catalog-list');
  if (!list) return;
  const emptyNote = document.getElementById('catalog-empty');
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = clampPage(page, totalPages);

  if (filtered.length === 0) {
    if (emptyNote) emptyNote.hidden = false;
    list.innerHTML = '';
    renderPagination(0, 1, buildHref);
    return;
  }
  if (emptyNote) emptyNote.hidden = true;

  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  list.innerHTML = pageItems.map((p) => cardTemplate(p, categoriesById)).join('');
  renderPagination(totalPages, currentPage, buildHref);
}

// Строит ссылку на каталог из текущих category/q и того, что явно
// переопределяем. Смена категории или поиска всегда сбрасывает страницу
// на первую — просто потому, что page в overrides не передаётся.
function buildCatalogUrl(current, overrides) {
  const merged = Object.assign({}, current, overrides);
  const parts = [];
  if (merged.category) parts.push(`category=${encodeURIComponent(merged.category)}`);
  if (merged.q) parts.push(`q=${encodeURIComponent(merged.q)}`);
  if (merged.sort) parts.push(`sort=${encodeURIComponent(merged.sort)}`);
  if (merged.page && merged.page > 1) parts.push(`page=${merged.page}`);
  return parts.length ? `catalog.html?${parts.join('&')}` : 'catalog.html';
}

// Чем ближе совпадение к названию, тем выше в списке — название важнее
// бренда, точное совпадение важнее частичного. Без запроса сортировать
// по совпадению нечем — список просто остаётся как был (score 0 у всех,
// сравнение устойчивое).
function relevanceScore(product, needle) {
  if (!needle) return 0;
  const name = (product.name || '').toLowerCase();
  const brand = (product.brand || '').toLowerCase();
  if (name === needle) return 5;
  if (name.startsWith(needle)) return 4;
  if (name.includes(needle)) return 3;
  if (brand.startsWith(needle)) return 2;
  if (brand.includes(needle)) return 1;
  return 0;
}

// Карточки без цены (поставщик решил не показывать) при сортировке по
// цене уходят в конец списка в любом направлении — им некуда встать
// между «дешевле» и «дороже» без цены вовсе.
function hasPrice(product) {
  return Boolean(product.showPrice) && product.priceFrom !== null && product.priceFrom !== undefined;
}

function priceComparator(direction) {
  return (a, b) => {
    const aHas = hasPrice(a);
    const bHas = hasPrice(b);
    if (!aHas && !bHas) return 0;
    if (!aHas) return 1;
    if (!bHas) return -1;
    return direction === 'asc' ? a.priceFrom - b.priceFrom : b.priceFrom - a.priceFrom;
  };
}

function sortProducts(products, sortKey, needle) {
  if (sortKey === 'price-asc') return [...products].sort(priceComparator('asc'));
  if (sortKey === 'price-desc') return [...products].sort(priceComparator('desc'));
  if (sortKey === 'relevance') {
    return [...products].sort((a, b) => relevanceScore(b, needle) - relevanceScore(a, needle));
  }
  return products;
}

function renderFilterBar(categories, current) {
  const nav = document.getElementById('category-filter');
  if (!nav) return;
  const links = [
    `<a href="${buildCatalogUrl(current, { category: undefined, page: undefined })}"${current.category ? '' : ' class="active"'}>Все</a>`
  ];
  categories.forEach((c) => {
    const isActive = c.id === current.category;
    const href = buildCatalogUrl(current, { category: c.id, page: undefined });
    links.push(html`<a href="${href}"${raw(isActive ? ' class="active"' : '')}>${c.label}</a>`);
  });
  nav.innerHTML = links.join('');
}

function initSearchForm(current) {
  const form = document.getElementById('catalog-search-form');
  if (!form) return;
  form.elements.q.value = current.q || '';
  form.elements.category.value = current.category || '';
  form.elements.sort.value = current.sort || '';
  // Сортировку применяют сразу по выбору, без отдельной кнопки — поиск
  // и категория через ту же форму остаются как были, менять их поведение
  // не нужно.
  form.elements.sort.addEventListener('change', () => form.submit());
}

async function renderCatalog() {
  const filterBar = document.getElementById('category-filter');
  if (!filterBar) return; // это не страница каталога (например, страница бренда)

  const params = new URLSearchParams(window.location.search);
  const current = {
    category: params.get('category') || '',
    q: params.get('q') || '',
    sort: params.get('sort') || '',
    page: parseInt(params.get('page'), 10) || 1
  };

  const [products, { categories, byId }] = await Promise.all([fetchProducts(), fetchCategoriesById()]);
  // Пустой раздел в фильтре — то же самое «нажал и ничего не нашёл»,
  // с которым мы весь вечер разбирались, только для целого раздела, не
  // для карточки. Причина пустоты не важна (новая метка ещё не набрала
  // карточек, раздел завёл администратор вручную, из раздела ушёл
  // последний товар) — в фильтре на витрине его просто не показываем,
  // пока в нём нет ни одной карточки. В админке и в выборе раздела у
  // поставщика пустые разделы по-прежнему видны — это другое место,
  // там пустой раздел не вводит в заблуждение. Решение от 15.10.2026.
  const nonEmptyCategories = categories.filter((c) => products.some((p) => (p.categories || []).includes(c.id)));
  renderFilterBar(nonEmptyCategories, current);
  initSearchForm(current);

  const needle = current.q.trim().toLowerCase();
  const filtered = products.filter((p) => {
    if (current.category && !(p.categories || []).includes(current.category)) return false;
    if (needle && !p.name.toLowerCase().includes(needle) && !p.brand.toLowerCase().includes(needle)) return false;
    return true;
  });
  const sorted = sortProducts(filtered, current.sort, needle);

  renderProductGrid(sorted, byId, current.page, (page) => buildCatalogUrl(current, { page }));
}

document.addEventListener('DOMContentLoaded', () => runSiteTask(renderCatalog));
document.addEventListener('DOMContentLoaded', () => runSiteTask(renderHomeCards));
