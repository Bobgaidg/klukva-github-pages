const THEME_KEY = 'klukva-theme'; // хранится 'light' или 'dark'; отсутствие ключа — «как в системе»

const THEME_SUN_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="5" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="1" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="23"/><line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/><line x1="4.2" y1="4.2" x2="6.3" y2="6.3"/><line x1="17.7" y1="17.7" x2="19.8" y2="19.8"/><line x1="4.2" y1="19.8" x2="6.3" y2="17.7"/><line x1="17.7" y1="6.3" x2="19.8" y2="4.2"/></g></svg>';
const THEME_MOON_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M21 12.5A9 9 0 1 1 11.5 3a7 7 0 0 0 9.5 9.5z"/></svg>';

const THEME_LABELS = {
  system: 'Тема: как в системе. Нажмите, чтобы выбрать светлую',
  light: 'Тема: светлая. Нажмите, чтобы выбрать тёмную',
  dark: 'Тема: тёмная. Нажмите, чтобы вернуть «как в системе»'
};

function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch (e) {
    return null;
  }
}

function setStoredTheme(value) {
  try {
    if (value) {
      localStorage.setItem(THEME_KEY, value);
    } else {
      localStorage.removeItem(THEME_KEY);
    }
  } catch (e) {
    // приватный режим или запрещённый доступ к хранилищу — просто не запоминаем выбор
  }
}

function currentThemeState() {
  const stored = getStoredTheme();
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

function nextThemeState(state) {
  if (state === 'system') return 'light';
  if (state === 'light') return 'dark';
  return 'system';
}

function applyThemeState(state) {
  if (state === 'light' || state === 'dark') {
    document.documentElement.setAttribute('data-theme', state);
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

// Сейчас тёмная — значит нажатие сделает светлее: показываем солнце.
// Сейчас светлая — показываем луну. Значок всегда про «что будет», а не «что сейчас».
function isEffectivelyDark() {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark') return true;
  if (attr === 'light') return false;
  return Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

function initThemeToggle() {
  applyThemeState(currentThemeState());

  const button = document.getElementById('theme-toggle');
  if (!button) return;

  const render = (state) => {
    const dark = isEffectivelyDark();
    button.innerHTML = dark ? THEME_SUN_SVG : THEME_MOON_SVG;
    button.classList.toggle('theme-toggle-sun', dark);
    button.classList.toggle('theme-toggle-moon', !dark);
    button.title = THEME_LABELS[state];
    button.setAttribute('aria-label', THEME_LABELS[state]);
  };
  render(currentThemeState());

  button.addEventListener('click', () => {
    const next = nextThemeState(currentThemeState());
    setStoredTheme(next === 'system' ? null : next);
    applyThemeState(next);
    render(next);
  });

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (currentThemeState() === 'system') render('system');
    });
  }
}

document.addEventListener('DOMContentLoaded', initThemeToggle);
