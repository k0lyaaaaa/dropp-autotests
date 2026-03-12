import { test, expect, Page } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

test('Откырть 1 сделку в дмс', async ({ page }) => {
  test.setTimeout(60000);
  
  // Устанавливаем большой размер окна
  await page.setViewportSize({ width: 1640, height: 900 });

  // Открываем сайт
  await page.goto('https://dev.dropp.market/men');
  console.log('✅ Сайт открыт');
  
  // Кликаем по иконке пользователя
  const userIcon = page.locator('div.HeaderMenu_customer__ymyVN').first();
  await userIcon.waitFor({ state: 'visible', timeout: 10000 });
  await userIcon.click();
  console.log('✅ Кликнули по иконке пользователя');
  
  // Ждём появления формы входа
  await page.waitForSelector('input[type="email"], input[name="email"], input[name="login"]');
  console.log('✅ Форма авторизации загружена');
  
  // Вводим логин
  const loginField = page.locator('input[name="login"]');
  await loginField.waitFor({ state: 'visible', timeout: 10000 });
  await loginField.fill(process.env.DROPP_EMAIL || '');
  console.log('✅ Логин введён');
  
  // Вводим пароль
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(process.env.DROPP_PASSWORD || '');
  console.log('✅ Пароль введён');
  
  // Нажимаем кнопку входа
  const submitButton = page.locator('[data-test-id="popup-sign-in-button"]');
  await submitButton.click();
  console.log('✅ Нажали кнопку входа');
  
  // Ждём успешной авторизации
  await page.waitForTimeout(3000);
  
  // Открываем меню пользователя
  const userMenu = page.locator('div.HeaderMenu_customer__ymyVN').first();
  await userMenu.waitFor({ state: 'visible', timeout: 10000 });
  await userMenu.click();
  console.log('✅ Кликнули по иконке пользователя');

  // Переходим в "Мои заказы"
  const myOrdersLink = page.locator('[data-test-id="customer-dialog-link-button-1"]').first();
  await myOrdersLink.waitFor({ state: 'visible', timeout: 10000 });
  await myOrdersLink.click();
  console.log('✅ Перешли в мои заказы');
  
  // Получаем номер первого заказа
  const firstOrderElement = page.locator('text=/ARBC-\\d{6}/').first();
  const firstOrderText = await firstOrderElement.textContent();
  const savedOrderNumber = firstOrderText?.match(/ARBC-\d{6}/)?.[0] || '';
  
  if (savedOrderNumber) {
    console.log(`📦 Номер заказа сохранён: ${savedOrderNumber}`);
  }

  // Переходим в админку
  await page.goto('https://dev-dms.dropp.market/orders');
  console.log('✅ Сайт админки открыт');

  // Авторизация в админке
  const adminLogin = page.locator('input[name="email"]');
  await adminLogin.waitFor({ state: 'visible', timeout: 10000 });
  await adminLogin.fill(process.env.DMS_EMAIL || '');
  console.log('✅ Логин админа введён');

  const adminPassword = page.locator('input[type="password"]').first();
  await adminPassword.fill(process.env.DMS_PASSWORD || '');
  console.log('✅ Пароль админа введён');

  const adminLoginButton = page.locator('button[type="submit"]');
  await adminLoginButton.click();
  console.log('✅ Вход в админку выполнен');
  
  // Открываем заказ
  await page.locator(`a:has-text("${savedOrderNumber}")`).first().click();
  console.log(`✅ Открыт заказ ${savedOrderNumber}`);

  // Открываем сделку
  await page.locator(`a:has-text("${savedOrderNumber}-d01")`).first().click();
  console.log(`✅ Открыта сделка ${savedOrderNumber}-d01`);

  // Ждём загрузки страницы сделки
  await page.waitForTimeout(2000);

  // ===== ФУНКЦИЯ ДЛЯ ВЫБОРА ОПЦИИ В СЕЛЕКТЕ =====
  async function selectOption(page: Page, selectIndex: number, optionText: string, description: string) {
    console.log(`   🔍 Выбираем ${description}...`);
    
    const currentSelects = page.locator('.MuiSelect-select.css-ljcffu');
    const currentCount = await currentSelects.count();
    console.log(`📊 Доступно селектов: ${currentCount}`);
    
    if (currentCount <= selectIndex) {
      throw new Error(`❌ Селект с индексом ${selectIndex} не найден`);
    }
    
    const select = currentSelects.nth(selectIndex);
    await select.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await select.click();
    console.log(`✅ Открыли селект #${selectIndex + 1}`);
    
    await page.waitForSelector('li[role="option"]', { timeout: 5000 });
    
    const option = page.locator(`li[role="option"]:has-text("${optionText}")`).first();
    await option.click();
    console.log(`✅ Выбрано: ${description} - ${optionText}`);
    await page.waitForTimeout(500);
    return true;
  }

  // Выбираем мерчанта (индекс 0 — первый селект)
  await selectOption(page, 0, 'StockX', 'Мерчант');

    // Выбираем валюту сделки (индекс 1)
  await selectOption(page, 1, 'USD', 'Валюта сделки');

      // Выбираем страну мерчанта (индекс 2)
  await selectOption(page, 2, 'Армения', 'Страна мерчанта');

        // Выбираем аккаунт (индекс 3)
  await selectOption(page, 3, 'mockaccount456 (#3)', 'Аккаунт');

        // Выбираем карту (индекс 4)
  await selectOption(page, 4, '**** **** **** 1111', 'Карта');

  // Ждём загрузки
  await page.waitForTimeout(5000);
});