import { test, expect } from '@playwright/test';

test('Регистрация на dropp.market', async ({ page }) => {
  test.setTimeout(5000);

    // Устанавливаем большой размер окна
  await page.setViewportSize({ width: 1440, height: 900 });

  // Открываем сайт
  await page.goto('https://dropp.market/men');
  console.log('✅ Сайт открыт');

  // Переходим на иконку профиля
    const userIcon = page.locator('div.HeaderMenu_customer__ymyVN').first();
  await userIcon.waitFor({ state: 'visible', timeout: 10000 });
  await userIcon.click();
  console.log('✅ Кликнули по иконке пользователя');

  // Нажимаем на регистрацию
  const registerTab = page.locator('span:has-text("Создать аккаунт")');
  await registerTab.waitFor({ state: 'visible', timeout: 10000 });
  await registerTab.click();
  console.log('✅ Перешли на создание аккаунта');

  // Вводим номер телефона
 const phoneField = page.locator('input[name="phone"]');
 await phoneField.waitFor({ state: 'visible', timeout: 10000 });
 await phoneField.click();

// Вводим цифры по очереди
  const phoneNumber = '9991234567';
  for (const digit of phoneNumber) {
  await page.keyboard.type(digit);
  await page.waitForTimeout(100); // небольшая задержка
}
  
  // Вводим логин
 const randomNum = Math.floor(Math.random() * 1000000);
 console.log(`🎲 Случайное число: ${randomNum}`);

  const emailField = page.locator('input[placeholder="Введите почту"]');
  await emailField.waitFor({ state: 'visible', timeout: 10000 });
  await emailField.fill(`n.tolmachev+${randomNum}@dropp.market`);
  console.log('✅ Email введён');
  
  // Вводим пароль
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill('Kbpeymrf123@'); // ПАРОЛЬ
  console.log('✅ Пароль введён');

  // Кликаем зарегистрироваться
  const regButton = page.locator('[data-test-id="popup-sign-up-button"]');
  await regButton.click();
  console.log('✅ Нажали кнопку зарегистрироваться');
  
    await page.waitForTimeout(5000)
});