import { test, expect, Page } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

test('Оплата корзины на dropp.market (1 товар)', async ({ page }) => {
  const startTime = Date.now();
  test.setTimeout(60000); // Уменьшил таймаут до 60 секунд для 1 товара
  
  // Устанавливаем большой размер окна
  await page.setViewportSize({ width: 1600, height: 1000 });
  
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
  await page.waitForTimeout(2000);

  // ===== ДОБАВЛЯЕМ ОДИН ТОВАР =====
  const productUrl = 'https://dev.dropp.market/men/catalog/item/logo-embossed-iphone-14-pro-max-case-95372?id=logo-embossed-iphone-14-pro-max-case-95372';
  
  console.log(`\n🛒 Добавляем товар...`);
  
  // Открываем страницу товара
  await page.goto(productUrl);
  console.log(`✅ Страница товара открыта`);
  
  // Закрываем модальное окно если есть
  try {
    const goodButton = page.locator('button:has-text("Хорошо")').first();
    await goodButton.waitFor({ state: 'visible', timeout: 3000 });
    await goodButton.click();
    console.log('✅ Закрыли уведомление');
    await page.waitForTimeout(500);
  } catch {
    console.log('ℹ️ Модального окна нет');
  }

  // Ждём кнопку "В корзину"
  console.log('🔍 Ищем кнопку "В корзину"...');
  await page.waitForSelector('button.ProductInfo_basket__yWWgE:has-text("В корзину")', { timeout: 15000 });
  
  // Добавляем в корзину
  const buyButton = page.locator('button.ProductInfo_basket__yWWgE:has-text("В корзину")').first();
  await buyButton.click();
  console.log(`✅ Товар добавлен в корзину`);
  
  // Таймаут для обработки
  await page.waitForTimeout(1500);
  
  // Проверяем счётчик
  const cartCounter = page.locator('.CartDynamicIcon_container__FrCin span').first();
  const counterVisible = await cartCounter.isVisible().catch(() => false);
  if (counterVisible) {
    console.log('🛒 Счётчик корзины обновился');
  }

  // Переходим в корзину
  const cartIcon = page.locator('div.CartDynamicIcon_container__FrCin').first();
  await cartIcon.waitFor({ state: 'visible', timeout: 10000 });
  await cartIcon.click();
  console.log('✅ Перешли в корзину');

  // Проверяем наличие товаров
  const checkoutButton = page.locator('button:has-text("Оформить")');
  const buttonCount = await checkoutButton.count();
  
  if (buttonCount === 0) {
    console.log('❌ Корзина пустая - кнопка "Оформить" не найдена');
    await page.screenshot({ path: 'empty-cart.png' });
    throw new Error('Тест прерван: корзина пуста');
  } 
  
  await checkoutButton.click({ force: true });
  console.log('✅ Нажали кнопку "Оформить"');

  // Ждём появления кнопки оплаты
  await page.waitForSelector('#checkout-payment-submit-button', { timeout: 10000 });
  
  const payButton = page.locator('#checkout-payment-submit-button');
  await payButton.click();
  console.log('✅ Нажали кнопку "Оплатить"'); 
  
  // Ждём обработки оплаты
  await page.waitForTimeout(10000);

  // Возвращаемся на главную страницу
  await page.goto('https://dev.dropp.market/men');
  console.log('✅ Вернулись на главную');

  // Открываем меню пользователя
  const userMenu = page.locator('div.HeaderMenu_customer__ymyVN').first();
  await userMenu.waitFor({ state: 'visible', timeout: 10000 });
  await userMenu.click();
  console.log('✅ Открыли меню пользователя');

  // Переходим в "Мои заказы"
  const myOrdersLink = page.locator('[data-test-id="customer-dialog-link-button-1"]').first();
  await myOrdersLink.waitFor({ state: 'visible', timeout: 10000 });
  await myOrdersLink.click();
  console.log('✅ Перешли в мои заказы');
  
  // Получаем номер последнего заказа
  await page.waitForSelector('text=/[A-Z]{4}-\\d{6}/', { timeout: 10000 });
  
  const firstOrderElement = page.locator('text=/[A-Z]{4}-\\d{6}/').first();
  const firstOrderText = await firstOrderElement.textContent();
  
  // Регулярное выражение для поиска номера (4 буквы, дефис, 6 цифр)
  const savedOrderNumber = firstOrderText?.match(/[A-Z]{4}-\d{6}/)?.[0] || '';
  
  if (savedOrderNumber) {
    console.log(`📦 Номер заказа сохранён: ${savedOrderNumber}`);
  } else {
    console.log('❌ Не удалось получить номер заказа');
    console.log('Текст элемента:', firstOrderText);
  }

  // Переходим в админку
  await page.goto('https://dev-dms.dropp.market/orders');
  console.log('✅ Открыта админка');

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
  
  // Ждём загрузки таблицы заказов
  await page.waitForSelector(`a:has-text("${savedOrderNumber}")`, { timeout: 15000 });
  
  // Ищем и открываем наш заказ
  await page.locator(`a:has-text("${savedOrderNumber}")`).first().click();
  console.log(`✅ Открыт заказ ${savedOrderNumber}`);

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);
  
   // ===== ФУНКЦИЯ ДЛЯ ВЫБОРА ОПЦИИ В СЕЛЕКТЕ =====
   async function selectOption(page: Page, selectIndex: number, optionText: string, description: string) {
     console.log(`   🔍 Выбираем ${description}...`);
     
     // Получаем свежий список селектов
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
     const optionExists = await option.count();
     
     if (optionExists === 0) {
       console.log(`❌ Опция "${optionText}" не найдена`);
       
       // Диагностика
       const options = page.locator('li[role="option"]');
       const optionsCount = await options.count();
       console.log(`📊 Доступные опции:`);
       for (let i = 0; i < Math.min(optionsCount, 5); i++) {
         const text = await options.nth(i).textContent();
         console.log(`   ${i}: "${text}"`);
       }
       return false;
     }
     
     await option.click();
     console.log(`✅ Выбрано: ${description} - ${optionText}`);
     await page.waitForTimeout(500);
     return true;
    }
    
 // ===== ЗАПОЛНЯЕМ ФОРМУ - ТОВАР 01 =====
  console.log('\n========== ТОВАР 01 ==========');
  
  const fullItemId01 = `${savedOrderNumber}-01`;
  console.log(`🔍 Ищем товар: ${fullItemId01}`);
  
  const itemElement01 = page.locator(`.MuiDataGrid-cell:has-text("${fullItemId01}") .css-1gtanqs`).first();
  await itemElement01.waitFor({ state: 'visible', timeout: 10000 });
  const itemText01 = await itemElement01.textContent();
  console.log(`🔍 Найден элемент с текстом: ${itemText01?.trim()}`);
  
  await itemElement01.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await itemElement01.click();
  console.log(`✅ Кликнули по товару ${fullItemId01}`);

  // Вводим цену мерчанта
  const amountEl01 = page.locator('input[name="amount"]').first();
  await amountEl01.waitFor({ state: 'visible', timeout: 10000 });
  await amountEl01.fill('4213');
  console.log('✅ Цена мерчанта введена');
  
  // Выбираем валюту (индекс 1)
  await selectOption(page, 1, 'USD', 'валюта');
  
  // Вводим доставку мерчанта
  const merchantShipmentAmountEL01 = page.locator('input[name="merchantShipmentAmount"]').first();
  await merchantShipmentAmountEL01.waitFor({ state: 'visible', timeout: 10000 });
  await merchantShipmentAmountEL01.fill('41');
  console.log('✅ Доставка мерчанта введена');

  // Выбираем схему перевозки (индекс 2)
  await selectOption(page, 2, 'Globbing - United Kingdom', 'схема перевозки');

  // Выбираем мерчанта (индекс 3)
  await selectOption(page, 3, 'StockX', 'мерчант');

  // Выбираем страну (индекс 4 или 3, зависит от количества)
  const allSelectsCount = await page.locator('.MuiSelect-select.css-ljcffu').count();
  const countryIndex = allSelectsCount === 5 ? 4 : 3;
  await selectOption(page, countryIndex, 'ОАЭ', 'страна');

  // Вводим ссылку
  const productLinkEl01 = page.locator('input[name="productLink"]').first();
  await productLinkEl01.waitFor({ state: 'visible', timeout: 10000 });
  await productLinkEl01.fill('43куцв');
  console.log('✅ Ссылка введена');

  console.log('\n💾 Сохраняем изменения...');
  
  const saveButton = page.locator('button:has-text("Сохранить")').first();
  await saveButton.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  
  const isEnabled = await saveButton.isEnabled();
  console.log(`📌 Кнопка доступна: ${isEnabled}`);

  await page.locator('input[name="select_row"]').first().check();
  console.log('✅ Чекбокс выбран');

  await page.locator('button:has-text("Создать сделку")').first().click();
  console.log('✅ Нажали кнопку "Создать сделку"');

  // Пауза для просмотра результата
  await page.waitForTimeout(3000);
  console.log(`\n🎉 Тест завершён за ${duration} секунд!`);
});