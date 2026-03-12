import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

test('Оплата корзины на dropp.market', async ({ page }) => {
  test.setTimeout(60000);
  
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

  // Открываем страницу каталога
  await page.goto('https://dev.dropp.market/men/catalog/sale');
  console.log('✅ Страница каталога открыта');
  
  // Ждём загрузки товаров
  await page.waitForSelector('.ProductCard_container__ZI_Qx', { timeout: 10000 });
  console.log('✅ Товары загрузились');
  
  // ===== ДОБАВЛЯЕМ 3 СЛУЧАЙНЫХ ТОВАРА =====
  const addedProducts: number[] = [];
  
  for (let i = 0; i < 3; i++) {
    console.log(`\n🛒 Добавляем товар #${i + 1} из 3...`);
    
    // !!! ВАЖНО: Перезагружаем список карточек на каждой итерации !!!
    const currentCards = page.locator('.ProductCard_container__ZI_Qx');
    const currentTotal = await currentCards.count();
    console.log(`📊 Доступно товаров сейчас: ${currentTotal}`);
    
    if (currentTotal === 0) {
      console.log('❌ Товары не найдены');
      break;
    }
    
    // Выбираем случайный индекс, которого ещё не было
    let randomIndex;
    let attempts = 0;
    do {
      randomIndex = Math.floor(Math.random() * currentTotal);
      attempts++;
      if (attempts > 20) {
        console.log('⚠️ Не удалось найти новый товар, берём первый доступный');
        randomIndex = 0;
        break;
      }
    } while (addedProducts.includes(randomIndex) && addedProducts.length < currentTotal);
    
    addedProducts.push(randomIndex);
    
    // Сохраняем название товара
    const productName = await currentCards.nth(randomIndex)
      .locator('.ProductCard_name__LLWJY')
      .textContent();
    console.log(`🛍️ Выбран товар: ${productName?.trim() || 'Без названия'}`);
    
    // Плавно скроллим к карточке и кликаем
    const cardToClick = currentCards.nth(randomIndex);
    await cardToClick.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await cardToClick.click();
    console.log(`✅ Перешли на страницу товара`);
    
    // Ждём загрузки страницы товара
    await page.waitForTimeout(2000);
    
    // Проверяем наличие модального окна с кнопкой "Хорошо"
    const goodButton = page.locator('button.Button_primaryLight__3mdZf:has-text("Хорошо")').first();
    if (await goodButton.count() > 0) {
      await goodButton.click();
      console.log('✅ Закрыли уведомление');
      await page.waitForTimeout(500);
    }

    // Ждём появления кнопки "В корзину"
    try {
      await page.waitForSelector('button.ProductInfo_basket__yWWgE:has-text("В корзину")', { timeout: 15000 });
      console.log('✅ Кнопка "В корзину" найдена');
    } catch (e) {
      console.log('⚠️ Таймаут ожидания кнопки');
      await page.screenshot({ path: `timeout-${i}.png` });
      continue;
    }

    // Добавляем в корзину
    const buyButton = page.locator('button.ProductInfo_basket__yWWgE:has-text("В корзину")').first();
    
    if (await buyButton.isVisible()) {
      await buyButton.click();
      console.log(`✅ Товар ${i + 1} добавлен в корзину`);
      
    // Добавляем таймаут после прожатии кнопки "В корзину"
    await page.waitForTimeout(1500);
      // Возвращаемся в каталог для следующего товара
      if (i < 2) {
        await page.goBack();
        console.log('✅ Вернулись в каталог');
        
        // Ждём полной загрузки каталога
        await page.waitForSelector('.ProductCard_container__ZI_Qx', { timeout: 10000 });
        await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
        console.log('✅ Каталог перезагружен');
      }
    } else {
      console.log(`❌ Кнопка "В корзину" не видна`);
      await page.screenshot({ path: `button-not-visible-${i}.png` });
    }
  }
  
  console.log(`\n🎉 Все 3 товара успешно добавлены в корзину!`);
  
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
  } else {
    await checkoutButton.click({ force: true });
    console.log('✅ Нажали кнопку "Оформить"');

    const payButton = page.locator('#checkout-payment-submit-button');
    await payButton.click();
    console.log('✅ Нажали кнопку "Оплатить"'); 
  }

  // Пауза для просмотра результата
  await page.waitForTimeout(10000);
  console.log('🎉 Тест завершён!');
});