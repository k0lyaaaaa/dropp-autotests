import { test, expect } from '@playwright/test';

test('Оплата корзины на dropp.market', async ({ page }) => {
  const startTime = Date.now();
  test.setTimeout(90000); // Увеличил до 90 секунд для 3 товаров
  
  // Устанавливаем большой размер окна
  await page.setViewportSize({ width: 1440, height: 900 });
  
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
  await loginField.fill('n.tolmachev+test2@dropp.market');
  console.log('✅ Логин введён');
  
  // Вводим пароль
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill('Kbpeymrf123');
  console.log('✅ Пароль введён');
  
  // Нажимаем кнопку входа
  const submitButton = page.locator('[data-test-id="popup-sign-in-button"]');
  await submitButton.click();
  console.log('✅ Нажали кнопку входа');
  
  // Ждём успешной авторизации
  await page.waitForTimeout(2000);

  // ===== ФУНКЦИЯ ДЛЯ ДОБАВЛЕНИЯ ТОВАРА =====
  async function addProductToCart(productUrl: string, productNumber: number) {
    console.log(`\n🛒 Добавляем товар #${productNumber}...`);
    
    // Открываем страницу товара
    await page.goto(productUrl);
    console.log(`✅ Открыт товар #${productNumber}`);
    
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
    console.log(`✅ Товар #${productNumber} добавлен в корзину`);
    
    // Таймаут для обработки
    await page.waitForTimeout(1500);
    
    // Проверяем счётчик
    const cartCounter = page.locator('.CartDynamicIcon_container__FrCin span').first();
    const counterVisible = await cartCounter.isVisible().catch(() => false);
    if (counterVisible) {
      console.log('🛒 Счётчик корзины обновился');
    }
    
    return true;
  }

  // ===== МАССИВ ТОВАРОВ =====
  const products = [
    'https://dev.dropp.market/men/catalog/item/logo-embossed-iphone-14-pro-max-case-95372?id=logo-embossed-iphone-14-pro-max-case-95372',
    'https://dev.dropp.market/men/catalog/item/nano-cap-cross-body-bag-84131',
    'https://dev.dropp.market/men/catalog/item/drop-crotch-carrot-trousers-81501'
  ];

  // ===== ДОБАВЛЯЕМ ВСЕ ТОВАРЫ =====
  let addedCount = 0;
  for (let i = 0; i < products.length; i++) {
    const success = await addProductToCart(products[i], i + 1);
    if (success) addedCount++;
  }

  console.log(`\n📊 ИТОГ: Добавлено ${addedCount} из ${products.length} товаров`);

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
  await page.waitForTimeout(5000);

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
  await adminLogin.fill('dms@dropp.market');
  console.log('✅ Логин админа введён');

  const adminPassword = page.locator('input[type="password"]').first();
  await adminPassword.fill('7H24`tLl7P{x}');
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
  
  // Пауза для просмотра результата
  await page.waitForTimeout(3000);
  console.log(`\n🎉 Тест завершён за ${duration} секунд!`);
});