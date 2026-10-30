// Форма нарочно никуда не отправляет данные — заявки от будущих
// поставщиков идут на почту (hello@klukvaconcept.store), не через сайт.
// Чтобы нажатие «Отправить» не перезагружало страницу молча, показываем
// сообщение и направляем к почте. Настоящая отправка — отдельная задача
// на будущее, если решим принимать заявки прямо через сайт.
function initPlacementForm() {
  const form = document.getElementById('apply-form');
  if (!form) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = document.getElementById('apply-form-message');
    message.textContent = 'Форма пока не подключена к отправке. Напишите, пожалуйста, на hello@klukvaconcept.store — адрес выше можно скопировать.';
  });
}

document.addEventListener('DOMContentLoaded', initPlacementForm);
