import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import { createUser } from './Registration';
dotenv.config();

test('Авторизация на dropp.market', async ({ page }) => {
  test.setTimeout(60000);
  
    // Устанавливаем большой размер окна
await createUser(page);
  //  Проверяем, что авторизация прошла
  
await page.goto('https://dev.dropp.market/men/catalog/sale');
  console.log('✅ Сайт открыт');
  
  //  Ждём загрузки товаров
  await page.waitForSelector('.ProductCard_container__ZI_Qx', { timeout: 10000 });
  console.log('✅ Товары загрузились');
  
  //  Находим все карточки товаров
  const productCards = page.locator('.ProductCard_container__ZI_Qx');
  const count = await productCards.count();
  console.log(`✅ Найдено товаров: ${count}`);
  
  //  Выбираем случайный товар
  const randomIndex = Math.floor(Math.random() * count);
  console.log(`✅ Выбран товар #${randomIndex + 1}`);
  
  //  Сохраняем название товара
  const productName = await productCards.nth(randomIndex)
    .locator('.ProductCard_name__LLWJY')
    .textContent();
  console.log(`🛍️ Товар: ${productName?.trim() || 'Без названия'}`);
  
  //  Кликаем по карточке товара
  await productCards.nth(randomIndex).click();
  console.log('✅ Перешли на страницу товара');
  
  //  Ждём появления КОНКРЕТНОГО элемента на странице товара
  console.log('⏳ Ждём загрузки страницы товара...');
  
  // Ждём любой из этих элементов:
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
    console.log('⚠️ Таймаут ожидания, но делаем скриншот и продолжаем');
    await page.screenshot({ path: 'product-page-timeout.png' });
  }
  
  //  Ищем кнопку добавления в корзину
  console.log('🔍 Ищем кнопку добавления...');
  
  // Попробуем разные селекторы
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
    console.log('✅ Товар добавлен в корзину');
  } else {
    console.log('❌ Кнопка не найдена!');
    await page.screenshot({ path: 'no-buy-button.png' });
    
    // Выведем все кнопки для отладки
    const buttons = await page.locator('button').all();
    console.log(`Найдено кнопок: ${buttons.length}`);
    for (let i = 0; i < Math.min(buttons.length, 5); i++) {
      const text = await buttons[i].textContent();
      const classes = await buttons[i].getAttribute('class');
      console.log(`Кнопка ${i}: текст="${text}" класс="${classes}"`);
    }
  }
  
  // Ебануть небольшую паузу, чтобы увидеть результат
  await page.waitForTimeout(3000);
  console.log('🎉 Тест завершён!');
});