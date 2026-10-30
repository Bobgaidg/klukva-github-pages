function initCookieBanner() {
  const STORAGE_KEY = 'klukva-cookie-consent';
  let alreadyAccepted = false;
  try {
    alreadyAccepted = Boolean(localStorage.getItem(STORAGE_KEY));
  } catch (e) {
    return;
  }
  if (alreadyAccepted) return;

  const bar = document.createElement('div');
  bar.className = 'cookie-banner';
  bar.innerHTML = `
    <p>Сайт использует файлы cookie. Подробнее — <a href="cookies.html">политика cookie</a>.</p>
    <button type="button">Хорошо</button>
  `;

  // Баннер лежит поверх страницы (position: fixed) и иначе закрывает
  // подвал с его ссылками на политики — отступ снизу освобождает ему место.
  function reserveSpace() {
    document.body.style.paddingBottom = `${bar.offsetHeight}px`;
  }

  bar.querySelector('button').addEventListener('click', () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {
      // приватный режим или заблокировано — просто закрываем баннер
    }
    window.removeEventListener('resize', reserveSpace);
    document.body.style.paddingBottom = '';
    bar.remove();
  });

  document.body.appendChild(bar);
  reserveSpace();
  window.addEventListener('resize', reserveSpace);
}

document.addEventListener('DOMContentLoaded', initCookieBanner);
