import { test, expect } from '@playwright/test';

test('Добавить товар в корзину на dropp.market', async ({ page }) => {
  // 1. Открываем страницу
  await page.goto('https://dropp.market/men/catalog/sale');
  console.log('✅ Страница открыта');

  // 2. Ждем появления хотя бы одного товара в каталоге
  // Замени '.catalog-item' на селектор карточки товара, который найдешь
  await page.waitForSelector('.catalog-item', { timeout: 10000 });
  console.log('✅ Каталог загрузился');

  // 3. Кликаем по первому товару
  // Замени 'a' внутри '.catalog-item' на точный селектор ссылки
  await page.locator('.catalog-item a').first().click();
  console.log('✅ Перешли на страницу товара');

  // 4. Ждем загрузки страницы товара и появления кнопки "Купить"
  // Замени '[class*="buy"]' на селектор кнопки покупки
  await page.waitForSelector('[class*="buy"]', { timeout: 10000 });
  console.log('✅ Страница товара загружена');

  // 5. Добавляем товар в корзину
  await page.locator('[class*="buy"]').first().click();
  console.log('✅ Товар добавлен в корзину');

  // 6. Ждем небольшой промежуток, чтобы сработала анимация добавления (опционально)
  await page.waitForTimeout(1500);

  // 7. Переходим в корзину
  // Замени 'a[href*="/cart"]' на селектор ссылки на корзину (ищи в шапке)
  await page.locator('a[href*="/cart"]').first().click();
  console.log('✅ Открыли корзину');

  // 8. Проверяем, что в корзине есть товар
  // Замени '.cart-item' на селектор элемента в корзине
  await page.waitForSelector('.cart-item', { timeout: 5000 });
  const itemsCount = await page.locator('.cart-item').count();
  console.log(`✅ В корзине товаров: ${itemsCount}`);
  
  // Финальная проверка
  expect(itemsCount).toBeGreaterThan(0);
  console.log('🎉 Тест пройден! Браузер закроется.');
});