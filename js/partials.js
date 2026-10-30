// Общая защита от XSS для клиентской разметки (версия для сервера —
// в исходники/escape.js, логика та же, модули разные). Правило проекта
// с 12.10.2026: данные, которые ввёл человек (название товара,
// описание, метка, имя бренда и так далее), в HTML вставляются только
// через html`...` — тег сам экранирует каждую подстановку, автору
// конкретного места не нужно об этом помнить каждый раз заново. Уже
// готовый HTML (например, результат другого html`...`) оборачивается в
// raw(), чтобы не экранироваться дважды.
//
// Экранируются только &<>"' — кавычки-ёлочки, длинное тире, буква ё и
// кириллица как таковая под экранирование не попадают и на экране не
// меняются.
class SafeString {
  constructor(value) {
    this.value = value;
  }
}

function raw(value) {
  return new SafeString(String(value === null || value === undefined ? '' : value));
}

function escapeHtml(value) {
  if (value instanceof SafeString) return value.value;
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function html(strings, ...values) {
  return strings.reduce((acc, str, i) => (
    acc + str + (i < values.length ? escapeHtml(values[i]) : '')
  ), '');
}

// Ссылка на внешний сайт (кнопка «Перейти на сайт поставщика» и
// подобные) опасна не текстом, а самим адресом — без проверки протокола
// ссылка могла бы вести не на сайт, а на выполнение кода (javascript:...).
// Та же мысль, что уже применена к ссылкам на фото.
function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

const SITE_HEADER = `
  <a class="logo" href="index.html">Клюква</a>
  <nav>
    <a href="catalog.html">Каталог</a>
    <a href="placement.html">Для поставщиков</a>
    <button type="button" id="theme-toggle" class="theme-toggle"></button>
  </nav>
`;

// Канал один — владелец подтвердил 15.10.2026, подпись в единственном
// числе и точная. Ссылка — одна строка здесь, чтобы её было легко
// поменять, если каналов станет больше.
const SOCIAL_LINKS_HTML = '<a href="https://t.me/klukvaconceptstore" target="_blank" rel="noopener">телеграме</a>';

const SITE_FOOTER = `
  <p>Мы в ${SOCIAL_LINKS_HTML}.</p>
  <nav>
    <a href="privacy.html">Политика персональных данных</a>
    <a href="cookies.html">Политика cookie</a>
    <a href="cabinet-login.html">Кабинет поставщика</a>
    <a href="demo.html">О демонстрации</a>
  </nav>
`;

function renderPartials() {
  const header = document.getElementById('site-header');
  const footer = document.getElementById('site-footer');
  if (header) header.innerHTML = SITE_HEADER;
  if (footer) footer.innerHTML = SITE_FOOTER;
}

document.addEventListener('DOMContentLoaded', renderPartials);
