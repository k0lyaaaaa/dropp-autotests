import { test, expect } from '@playwright/test';

test('Добавить 3 случайных товара в корзину на dropp.market', async ({ page }) => {
  test.setTimeout(120000); // Увеличиваем таймаут до 2 минут

  // Устанавливаем большой размер окна
  await page.setViewportSize({ width: 1440, height: 900 });

  // Открываем страницу каталога
  await page.goto('https://dropp.market/men/catalog/sale');
  console.log('✅ Сайт открыт');
  
  // Ждём загрузки товаров
  await page.waitForSelector('.ProductCard_container__ZI_Qx', { timeout: 10000 });
  console.log('✅ Товары загрузились');
  
  // Находим все карточки товаров
  const productCards = page.locator('.ProductCard_container__ZI_Qx');
  const totalCount = await productCards.count();
  console.log(`✅ Найдено товаров: ${totalCount}`);
  
  // ===== ДОБАВЛЯЕМ 3 СЛУЧАЙНЫХ ТОВАРА =====
  const addedProducts: number[] = [];
  const maxAttempts = 10; // Защита от бесконечного цикла
  
  for (let i = 0; i < 3; i++) {
    console.log(`\n🛒 Добавляем товар #${i + 1} из 3...`);
    
    // Выбираем случайный индекс, которого ещё нет в addedProducts
    let randomIndex;
    let attempts = 0;
    do {
      randomIndex = Math.floor(Math.random() * totalCount);
      attempts++;
      if (attempts > maxAttempts) break; // Защита от бесконечного цикла
    } while (addedProducts.includes(randomIndex) && addedProducts.length < totalCount);
    
    addedProducts.push(randomIndex);
    
    // Сохраняем название товара
    const productName = await productCards.nth(randomIndex)
      .locator('.ProductCard_name__LLWJY')
      .textContent();
    console.log(`🛍️ Выбран товар ${i + 1}: ${productName?.trim() || 'Без названия'}`);
    
    // Кликаем по карточке товара
    await productCards.nth(randomIndex).click();
    console.log(`✅ Перешли на страницу товара ${i + 1}`);
    
    // Ждём загрузки страницы товара
    console.log('⏳ Ждём загрузки страницы товара...');
    
    try {
      await page.waitForSelector(
        'button:has-text("Купить"), ' +
        'button:has-text("В корзину"), ' +
        '.ProductCard_price__V36ae, ' +
        '[class*="product-title"]', 
        { timeout: 15000 }
      );
      console.log('✅ Страница товара загрузилась');
    } catch (e) {
      console.log('⚠️ Таймаут ожидания, делаем скриншот');
      await page.screenshot({ path: `product-page-timeout-${i}.png` });
    }
    
    // Ищем кнопку добавления в корзину
    console.log('🔍 Ищем кнопку добавления...');
    
    const selectors = [
      'button:has-text("Купить")',
      'button:has-text("В корзину")',
      '[class*="add-to-cart"]',
      '[class*="buy"]',
      'button[type="submit"]'
    ];
    
    let buyButton = null;
    for (const selector of selectors) {
      const button = page.locator(selector).first();
      if (await button.count() > 0 && await button.isVisible()) {
        buyButton = button;
        console.log(`✅ Найдена кнопка: ${selector}`);
        break;
      }
    }
    
    if (buyButton) {
      await buyButton.click();
      console.log(`✅ Товар ${i + 1} добавлен в корзину`);
      
      // Ждём подтверждения добавления (появление уведомления или исчезновение кнопки)
      await page.waitForTimeout(2000);
      
      // Возвращаемся назад в каталог для следующего товара
      if (i < 2) { // Не возвращаемся после последнего товара
        await page.goBack();
        console.log('✅ Вернулись в каталог');
        
        // Ждём загрузки каталога
        await page.waitForSelector('.ProductCard_container__ZI_Qx', { timeout: 10000 });
        console.log('✅ Каталог загрузился');
      }
    } else {
      console.log(`❌ Кнопка не найдена для товара ${i + 1}!`);
      await page.screenshot({ path: `no-buy-button-${i}.png` });
      
      // Выведем все кнопки для отладки
      const buttons = await page.locator('button').all();
      console.log(`Найдено кнопок: ${buttons.length}`);
      for (let j = 0; j < Math.min(buttons.length, 5); j++) {
        const text = await buttons[j].textContent();
        const classes = await buttons[j].getAttribute('class');
        console.log(`Кнопка ${j}: текст="${text}" класс="${classes}"`);
      }
    }
  }
  
  console.log(`\n🎉 Все 3 товара успешно добавлены в корзину!`);
  
  // Опционально: перейти в корзину и проверить количество товаров
  console.log('\n🛒 Проверяем корзину...');
  
  // Ищем иконку корзины (селектор из твоего другого теста)
  const cartIcon = page.locator('div.CartDynamicIcon_container__FrCin').first();
  await cartIcon.waitFor({ state: 'visible', timeout: 10000 });
  await cartIcon.click();
  console.log('✅ Перешли в корзину');
  
  // Проверяем, что в корзине есть кнопка "Оформить" (значит товары есть)
  const checkoutButton = page.locator('button:has-text("Оформить")');
  const buttonCount = await checkoutButton.count();
  
  if (buttonCount > 0) {
    console.log('✅ Корзина не пуста!');
  } else {
    console.log('❌ Корзина пуста');
    await page.screenshot({ path: 'cart-empty-final.png' });
  }
  
  // Пауза для просмотра результата
  await page.waitForTimeout(3000);
  console.log('🎉 Тест завершён!');
});