import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import { loginDms } from './authDms';
dotenv.config();

test('Найти заказ со сделкой и открыть её', async ({ page }) => {
  test.setTimeout(120000);
  
  await loginDms(page);

  // ✅ Получаем начальный список ссылок
  const orderLinks = page.locator('a[href*="/orders?sidepage=order"]');
  const linksCount = await orderLinks.count();
  console.log(`📊 Всего ссылок на заказы: ${linksCount}`);

  if (linksCount === 0) {
    throw new Error('❌ Нет заказов на странице');
  }

  let currentIndex = 0;

  while (currentIndex < linksCount) {
    // Получаем свежий список ссылок
    const freshLinks = page.locator('a[href*="/orders?sidepage=order"]');
    const freshCount = await freshLinks.count();

    if (currentIndex >= freshCount) {
      console.log('❌ Индекс вышел за пределы');
      break;
    }

    const link = freshLinks.nth(currentIndex);
    const orderNumber = await link.textContent();
    console.log(`\n🔍 Проверяем заказ: ${orderNumber?.trim()}`);

    await link.click();
    await page.waitForTimeout(2000);

    // Ищем ссылку на сделку внутри заказа
    const dealLink = page.locator('text="Сделки"')
      .locator('xpath=following-sibling::td')
      .locator('a')
      .first();

    if (await dealLink.count() > 0) {
      const dealNumber = await dealLink.textContent();
      console.log(`🎯 Найдена сделка: ${dealNumber?.trim()}`);
      await dealLink.click();
      console.log('✅ Перешли в сделку');
      break;
    }

    // ✅ Проверяем, есть ли сделка прямо в таблице (новый способ)
    const tableDealLinks = page.locator('a[href*="/orders?sidepage=deal"]');
    const dealsInTable = await tableDealLinks.count();

    if (dealsInTable > 0) {
      console.log(`🎯 Найдено ${dealsInTable} сделок прямо в таблице`);
      
      // Берём случайную сделку
      const randomIndex = Math.floor(Math.random() * dealsInTable);
      const randomDeal = tableDealLinks.nth(randomIndex);
      const dealNumber = await randomDeal.textContent();
      console.log(`🎯 Открываем сделку: ${dealNumber?.trim()}`);
      await randomDeal.click();
      break;
    }

    console.log('ℹ️ Сделки нет, возвращаемся');
    await page.goBack();
    await page.waitForTimeout(2000);
    currentIndex++;
  }

  if (currentIndex >= linksCount) {
    console.log('❌ Сделка не найдена ни в одном заказе');
  }

  await page.waitForTimeout(3000);
});