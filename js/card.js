async function renderCard() {
  const container = document.getElementById('card-detail');
  if (!container) return;

  const id = new URLSearchParams(window.location.search).get('id');
  const [product, { categories }] = await Promise.all([
    id ? fetchProductById(id) : Promise.resolve(null),
    fetchCategoriesById()
  ]);

  if (!product) {
    container.innerHTML = `
      <p>Карточка не найдена.</p>
      <p><a href="catalog.html">Вернуться в каталог</a></p>
    `;
    return;
  }

  recordRecentlyViewed(product.id);

  const priceLine = formatPrice(product) || 'Поставщик не указал цену';
  // Товар может стоять в нескольких разделах (решение владельца от
  // 15.10.2026) — показываем все, не только первый.
  const categoryLabels = (product.categories || [])
    .map((id) => (categories.find((c) => c.id === id) || {}).label)
    .filter(Boolean);
  const categoryLine = categoryLabels.length ? categoryLabels.join(', ') : 'Прочее';
  // Метку не показываем отдельно, если у этой же карточки уже есть
  // одноимённый раздел — иначе на экране одно и то же слово дважды.
  // Сами данные не трогаем, только то, что видно (решение владельца/
  // оркестратора от 15.10.2026).
  const categoryLabelsLower = new Set(categoryLabels.map((l) => l.toLowerCase()));
  const visibleTags = (product.tags || []).filter((t) => !categoryLabelsLower.has(t.toLowerCase()));

  // Публикация без ссылки на поставщика теперь не проходит проверку при
  // сохранении — но у уже существующих карточек, заведённых до неё, ссылки
  // может не быть. Мёртвую кнопку в никуда не рисуем: пробуем ссылку
  // бренда, а если и её нет — просто не показываем кнопку.
  let goUrl = product.supplierUrl;
  if (!goUrl) {
    const brand = await fetchBrandById(product.supplierId);
    goUrl = brand && brand.supplierUrl ? brand.supplierUrl : '';
  }
  // Ссылка опасна не текстом, а самим адресом — без проверки протокола
  // она могла бы вести не на сайт, а на выполнение кода (javascript:...).
  // Карточки старше этой проверки могли сохранить что угодно — проверяем
  // здесь, на месте использования, не полагаясь на то, что сервер уже
  // проверил при сохранении.
  const goButton = isHttpUrl(goUrl)
    ? html`<p><a class="button" href="${goUrl}" target="_blank" rel="noopener">Перейти на сайт поставщика</a></p>`
    : '<p class="placeholder-note">Демонстрационная карточка. Переход к поставщику появится в рабочей версии.</p>';

  // Постоянные поля (по ним позже можно будет фильтровать) и свободные
  // пары поставщика показываем одним общим блоком, сначала постоянные —
  // посетителю неважно, чем они различаются внутри. Пустое поле просто
  // не рисуем, а не показываем прочерком.
  const fixedSpecs = [
    ['Вес', product.weight],
    ['Размеры', product.dimensions],
    ['Срок изготовления', product.leadTime]
  ].filter(([, value]) => value);
  const freeSpecs = (product.attributes || []).filter((a) => a.name && a.value);
  const specItems = [
    ...fixedSpecs.map(([label, value]) => html`<li><strong>${label}:</strong> ${value}</li>`),
    ...freeSpecs.map((a) => html`<li><strong>${a.name}:</strong> ${a.value}</li>`)
  ];
  const specsBlock = specItems.length ? `<ul class="field-list">${specItems.join('')}</ul>` : '';

  // Листание фото — решение владельца от 15.10.2026, после того как
  // сначала попросил только «видно и открывается» (сделано раньше тем
  // же вечером), а потом увидел карточку с четырьмя фото и попросил
  // листать. Клик по превью меняет большое фото на месте, не открывает
  // новую вкладку. При двух и более фото — стрелки у большого снимка
  // (мышью и клавиатурой) плюс ряд превью; при одном фото или без него
  // — просто фото, без стрелок и превью, тыкать там не во что.
  const allPhotos = [product.photoUrl, ...(product.extraPhotoUrls || [])].filter((url) => isHttpUrl(url));
  let photoSectionHtml;
  if (allPhotos.length > 1) {
    const thumbsHtml = allPhotos.map((url, i) => html`
      <button type="button" class="extra-photo-thumb-button" onclick="gallerySetIndex(${i})" aria-label="Фото ${i + 1} из ${allPhotos.length}">
        <img class="extra-photo-thumb" src="${url}" alt="" loading="lazy" onerror="replaceWithPhotoPlaceholder(this, 'extra-photo-thumb', 'thumb')">
      </button>
    `).join('');
    photoSectionHtml = html`
      <div class="photo-gallery">
        <div class="photo-gallery-main">
          <img id="card-main-photo" class="detail-photo-img" src="${allPhotos[0]}" alt="${product.name || ''}" tabindex="0" onkeydown="handleGalleryKey(event)" onclick="openFullscreen()" onerror="replaceWithPhotoPlaceholder(this, 'detail-photo', 'full')">
          <button type="button" class="gallery-arrow gallery-arrow-prev" onclick="galleryStep(-1)" aria-label="Предыдущее фото">‹</button>
          <button type="button" class="gallery-arrow gallery-arrow-next" onclick="galleryStep(1)" aria-label="Следующее фото">›</button>
        </div>
        <div class="extra-photos">${raw(thumbsHtml)}</div>
      </div>
    `;
  } else {
    photoSectionHtml = photoBlock(product, 'detail-photo-img', 'detail-photo');
  }

  container.innerHTML = html`
    ${raw(photoSectionHtml)}
    <p class="card-brand"><a href="brand.html?id=${encodeURIComponent(product.supplierId)}">${product.brand}</a></p>
    <h1>${product.name}</h1>
    <ul class="field-list">
      <li><strong>Разделы:</strong> ${categoryLine}</li>
      <li><strong>Описание:</strong> ${product.description}</li>
      <li><strong>Автор, мастерская:</strong> ${product.author}</li>
      <li><strong>Материал, техника:</strong> ${product.material}</li>
      <li><strong>Цена:</strong> ${priceLine}</li>
      ${raw(visibleTags.length ? html`<li><strong>Метки поставщика:</strong> ${visibleTags.join(', ')}</li>` : '')}
    </ul>
    ${raw(specsBlock)}
    ${raw(goButton)}
  `;

  galleryPhotos = allPhotos;
  galleryIndex = 0;
  galleryRender();

  // Одно фото — своей кнопки открытия во весь экран в разметке нет
  // (photoBlock её не рисует, она используется и в сетке каталога, где
  // полноэкранный просмотр не нужен), вешаем клик отдельно, только
  // здесь и только когда фото реально есть.
  if (allPhotos.length === 1) {
    const singleImg = container.querySelector('.detail-photo-img');
    if (singleImg) singleImg.addEventListener('click', () => openFullscreen());
  }
}

// Состояние галереи — глобальное нарочно: разметка строится строкой
// (innerHTML), кнопки внутри неё вызывают эти функции через onclick,
// а не через добавленные после вставки обработчики. Тот же приём, что
// уже используется у photoBlock (onerror="replaceWithPhotoPlaceholder").
let galleryPhotos = [];
let galleryIndex = 0;

function galleryRender() {
  const img = document.getElementById('card-main-photo');
  if (img) img.src = galleryPhotos[galleryIndex];
  document.querySelectorAll('.extra-photo-thumb-button').forEach((btn, i) => {
    btn.classList.toggle('extra-photo-thumb-active', i === galleryIndex);
  });
  // Полноэкранный просмотр — то же состояние, тот же индекс: стрелки
  // там вызывают galleryStep, как и везде, а не свою отдельную логику.
  const fsImg = document.getElementById('photo-fullscreen-img');
  const fsOverlay = document.getElementById('photo-fullscreen');
  if (fsImg && fsOverlay && !fsOverlay.hidden) setFullscreenSrc(fsImg, galleryPhotos[galleryIndex]);
}

// Смена фото в полноэкранном просмотре — отдельная функция, не просто
// img.src = url, потому что перед новой попыткой нужно убрать текст
// прошлой ошибки: иначе после одной битой ссылки текст остался бы
// висеть поверх следующих, уже рабочих фото.
function setFullscreenSrc(img, url) {
  const errorNote = document.getElementById('photo-fullscreen-error');
  if (errorNote) errorNote.hidden = true;
  img.hidden = false;
  img.src = url;
}

// img.replaceWith(), как у остальных заглушек, здесь не годится —
// полноэкранный просмотр переиспользует один и тот же <img> на все
// фото галереи по id, удалить его значило бы потерять способ показать
// следующее фото после первой ошибки. Поэтому прячем картинку и
// показываем соседний текст, не трогая сам элемент.
function handleFullscreenPhotoError(img) {
  img.hidden = true;
  const errorNote = document.getElementById('photo-fullscreen-error');
  if (errorNote) errorNote.hidden = false;
}

// Фото во весь экран — решение владельца от 15.10.2026. Предупреждение
// о риске (на телефоне такое окно часто закрывают случайным движением)
// учтено не отказом от задачи, а тем, как сделан выход: крупный крестик,
// клик мимо картинки, клавиша Escape — три способа закрыть, ни один не
// требует попасть точно в маленькую кнопку.
function openFullscreen() {
  if (!galleryPhotos.length) return;
  const overlay = document.getElementById('photo-fullscreen');
  const img = document.getElementById('photo-fullscreen-img');
  if (!overlay || !img) return;
  setFullscreenSrc(img, galleryPhotos[galleryIndex]);
  overlay.querySelectorAll('.photo-fullscreen-arrow').forEach((btn) => {
    btn.hidden = galleryPhotos.length <= 1;
  });
  overlay.hidden = false;
  document.getElementById('photo-fullscreen-close').focus();
}

function closeFullscreen() {
  const overlay = document.getElementById('photo-fullscreen');
  if (overlay) overlay.hidden = true;
}

function initFullscreenViewer() {
  const overlay = document.getElementById('photo-fullscreen');
  const closeBtn = document.getElementById('photo-fullscreen-close');
  if (!overlay || !closeBtn) return;
  closeBtn.addEventListener('click', closeFullscreen);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeFullscreen();
  });
  document.addEventListener('keydown', (event) => {
    if (overlay.hidden) return;
    if (event.key === 'Escape') {
      closeFullscreen();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      galleryStep(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      galleryStep(1);
    }
  });
}

function gallerySetIndex(i) {
  if (!galleryPhotos.length) return;
  galleryIndex = (i + galleryPhotos.length) % galleryPhotos.length;
  galleryRender();
}

function galleryStep(delta) {
  gallerySetIndex(galleryIndex + delta);
}

function handleGalleryKey(event) {
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    galleryStep(-1);
  } else if (event.key === 'ArrowRight') {
    event.preventDefault();
    galleryStep(1);
  }
}

document.addEventListener('DOMContentLoaded', () => runSiteTask(renderCard));
document.addEventListener('DOMContentLoaded', initFullscreenViewer);
