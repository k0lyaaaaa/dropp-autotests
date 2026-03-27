import { test, expect, Page } from '@playwright/test';
import dotenv from 'dotenv';
import { AuthDMSFin } from './AuthDMSFin';
import { loginAsUser } from './auth';
import { SaveLastOrder, savedOrderNumber } from './saveLastOrder';
dotenv.config();

test('Создание возврата по последнему купленному заказу', async ({ page }) => {
  test.setTimeout(120000);
   
  // 1. Авторизация в UI
  await loginAsUser(page);

  // 2. Получаем номер последнего заказа
  await SaveLastOrder(page);
  console.log(`📦 Номер заказа из UI: ${savedOrderNumber}`);

  // 3. Авторизация в админке
  await AuthDMSFin(page);
  await page.waitForTimeout(3000);
  
  // 4. Поиск заказа
  const searchInput = page.locator('input[placeholder="Поиск"]');
  await searchInput.waitFor({ state: 'visible', timeout: 10000 });
  await searchInput.fill(savedOrderNumber);
  console.log('✅ Поиск: значение введено');

  const searchButton = page.locator('[data-testid="SearchIcon"]');
  await searchButton.waitFor({ state: 'visible', timeout: 10000 });
  await searchButton.click();
  console.log('✅ Поиск выполнен');

  // 5. Открываем заказ
  await page.locator(`a:has-text("${savedOrderNumber}")`).first().click();
  console.log(`✅ Открыт заказ ${savedOrderNumber}`);

  // 6. Открываем раздел Возвратов ДС
  const returnsSection = page.locator('button:has-text("Открыть раздел Возвратов ДС")').first();
  await returnsSection.click();
  console.log('✅ Открыт раздел Возвратов ДС');

  // 7. Ждём загрузки контейнера
  const refundContainer = page.locator('div[legend="Вернуть ДС потоварно"]').first();
  await refundContainer.waitFor({ state: 'visible', timeout: 10000 });
  console.log('✅ Контейнер возвратов загружен');

  // 8. Выбираем ПЕРВЫЙ АКТИВНЫЙ чекбокс (скроллим до конца и проверяем все)
console.log('🔍 Ищем активный чекбокс...');

let selectedIndex = -1;
let scrollAttempts = 0;
const maxScrollAttempts = 15; // увеличил, так как 14 товаров

// Сначала прокручиваем в самый низ, чтобы подгрузить все чекбоксы
console.log('🖱️ Прокручиваем таблицу до конца...');
await refundContainer.evaluate(el => el.scrollTop = el.scrollHeight);
await page.waitForTimeout(2000);

// Теперь собираем ВСЕ чекбоксы (должны быть все 14)
const allCheckboxes = await refundContainer.locator('input[name="select_row"]').all();
console.log(`📊 Всего чекбоксов после полной прокрутки: ${allCheckboxes.length}`);

// Проходим по всем и ищем активный
for (let i = 0; i < allCheckboxes.length; i++) {
  const checkbox = allCheckboxes[i];
  
  // Скроллим к чекбоксу
  await checkbox.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  
  const isDisabled = await checkbox.isDisabled();
  console.log(`🔍 Чекбокс #${i + 1}: disabled = ${isDisabled}`);
  
  if (!isDisabled) {
    // Кликаем по чекбоксу
    await checkbox.click({ force: true });
    await page.waitForTimeout(500);
    
    const isChecked = await checkbox.isChecked();
    if (isChecked) {
      selectedIndex = i + 1;
      console.log(`✅ Выбран активный чекбокс #${selectedIndex}`);
      break;
    }
  }
}

if (selectedIndex === -1) {
  throw new Error('❌ Не удалось выбрать активный чекбокс');
}

  // 9. Нажимаем кнопку "Заполнить заявку на возврат ДС"
  const fillButton = page.locator('button:has-text("Заполнить заявку на возврат ДС")').first();
  await fillButton.click();
  console.log('✅ Нажали кнопку "Заполнить заявку на возврат ДС"');
  await page.waitForTimeout(2000);

  // 10. Выбираем причину возврата (как в твоём коде — через selectOption)
  console.log('🔍 Выбираем причину возврата...');
  
  const reasonSelect = page.locator('.MuiSelect-select.css-ljcffu').first();
  await reasonSelect.scrollIntoViewIfNeeded();
  await reasonSelect.click();
  console.log('✅ Открыт список причин возврата');

  await page.waitForSelector('li[role="option"]', { timeout: 5000 });
  
  const firstOption = page.locator('li[role="option"]').first();
  const reasonText = await firstOption.textContent();
  await firstOption.click();
  console.log(`✅ Выбрана причина: ${reasonText?.trim()}`);
  await page.waitForTimeout(1000);

  // 11. Отправляем заявку менеджеру
  const sendButton = page.locator('button:has-text("Отправить заявку менеджеру")').first();
  await sendButton.click();
  console.log('✅ Отправлена заявка менеджеру');
  await page.waitForTimeout(2000);

  // 12. Подтверждаем заявку
  const confirmButton = page.locator('button:has-text("Подтвердить заявку")').first();
  await confirmButton.click();
  console.log('✅ Заявка подтверждена');
  await page.waitForTimeout(2000);

  // 13. Проводим возврат ДС
  const refundButton = page.locator('button:has-text("Провести возврат ДС")').first();
  await refundButton.click();
  console.log('✅ Проводим возврат ДС');
  await page.waitForTimeout(2000);

  // 14. Подтверждаем возврат
  const confirmRefund = page.locator('button:has-text("Подтвердить")').first();
  await confirmRefund.click();
  console.log('✅ Подтверждаем возврат ДС');
  await page.waitForTimeout(2000);

  console.log('🎉 Тест завершён!');
});