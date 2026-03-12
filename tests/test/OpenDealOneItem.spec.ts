import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

test('Откырть 1 сделку в дмс', async ({ page }) => {
  test.setTimeout(60000);
  
    // Устанавливаем большой размер окна
  await page.setViewportSize({ width: 1440, height: 900 });

  // 2. Открываем сайт
  await page.goto('https://dev.dropp.market/men');
  console.log('✅ Сайт открыт');
  
  // 3. Ищем и кликаем по иконке профиля/входа
  // Обычно это иконка человечка или кнопка "Войти"
  // КЛИКАЕМ ПО ИКОНКЕ ЧЕЛОВЕЧКА
  const userIcon = page.locator('div.HeaderMenu_customer__ymyVN').first();
  await userIcon.waitFor({ state: 'visible', timeout: 10000 });
  await userIcon.click();
  console.log('✅ Кликнули по иконке пользователя');
  
  // 4. Ждём появления формы входа
  await page.waitForSelector('input[type="email"], input[name="email"], input[name="login"]');
  console.log('✅ Форма авторизации загружена');
  
  // 5. Вводим email/телефон
  const loginField = page.locator('input[name="login"]');
  await loginField.waitFor({ state: 'visible', timeout: 10000 });
  await loginField.fill(process.env.DROPP_EMAIL || '');
  console.log('✅ Логин введён');
  
  // 6. Вводим пароль
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(process.env.DROPP_PASSWORD || '');
  console.log('✅ Пароль введён');
  
  // 7. Нажимаем кнопку входа
  const submitButton = page.locator('[data-test-id="popup-sign-in-button"]');
  await submitButton.click();
  console.log('✅ Нажали кнопку входа');
  
  // 8. Ждём успешной авторизации (появление имени пользователя или уход с формы)
  await page.waitForTimeout(3000); // даём время на обработку
  
  const userIcon1 = page.locator('div.HeaderMenu_customer__ymyVN').first();
  await userIcon1.waitFor({ state: 'visible', timeout: 10000 });
  await userIcon1.click();
  console.log('✅ Кликнули по иконке пользователя');

  // 9. Проверяем, что авторизация прошла
  
  const clickMyOrder = page.locator('[data-test-id="customer-dialog-link-button-1"]').first();
  await clickMyOrder.waitFor({state: 'visible', timeout: 10000});
  await clickMyOrder.click();
  console.log('✅ Перешли в мои заказы')
  
// Если первый в списке - самый новый
const firstOrderNumber = await page.locator('text=/ARBC-\\d{6}/').first().textContent();
const extractedNumber = firstOrderNumber?.match(/ARBC-\d{6}/)?.[0];
console.log(`🎯 Первый заказ в списке: ${firstOrderNumber?.match(/ARBC-\d{6}/)?.[0]}`);

// ===== СОХРАНЯЕМ НОМЕР В ПЕРЕМЕННУЮ =====
const savedOrderNumber = extractedNumber || '';

if (savedOrderNumber) {
  console.log(`📦 Номер заказа сохранён: ${savedOrderNumber}`);
}


  await page.goto('https://dev-dms.dropp.market/orders');
  console.log('✅ Сайт открыт');

  // Ввод логина
  const loginField2 = page.locator('input[name="email"]');
  await loginField2.waitFor({ state: 'visible', timeout: 10000 });
  await loginField2.fill(process.env.DMS_EMAIL || '');
  console.log('✅ Логин введён');

  // Ввод пароля
  const passwordInput2 = page.locator('input[type="password"]').first();
  await passwordInput2.fill(process.env.DMS_PASSWORD || '');
  console.log('✅ Пароль введён');

  // Вход
  const loginButton = page.locator('button[type="submit"]');
  await loginButton.click();
  console.log('✅ Нажали кнопку входа');
  
await page.locator(`a:has-text("${savedOrderNumber}")`).first().click();
console.log(`✅ Открыт заказ ${savedOrderNumber}`);

await page.locator(`a:has-text("${savedOrderNumber}-d01")`).first().click();

  // Ждём загрузки
  await page.waitForTimeout(2000);
});