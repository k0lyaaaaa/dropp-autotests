import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

test('Авторизация на dropp.market', async ({ page }) => {
  test.setTimeout(60000);
  
    // Устанавливаем большой размер окна
  await page.setViewportSize({ width: 1440, height: 900 });

  // 2. Открываем сайт
  await page.goto('https://dropp.market/men');
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
  
  console.log('\n🔍 Проверяем результат...');
  const logoutButton = page.locator('[data-test-id="customer-dialog-logout-button"]');
  await logoutButton.click();
  
  if (logoutButton) {
    console.log('АВТОРИЗАЦИЯ УСПЕШНА! Появилась кнопка выхода');
  } else {
    console.log('Авторизация не удалась');
    await page.screenshot({ path: 'login-failed.png' });
  }
  
  await page.waitForTimeout(2000);
});