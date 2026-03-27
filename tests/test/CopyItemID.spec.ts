import { test, expect } from '@playwright/test';
import dotenv from 'dotenv';
import { loginAsUser } from './auth'; // ← импорт из auth.ts
import { loginDms } from './authDms';
dotenv.config();

test('Копировать item ID заказа на dropp.market', async ({ page }) => {
  test.setTimeout(60000);

  // Авторизация
  await loginAsUser(page);

  // Открываем меню пользователя и переходим в заказы
  const userMenu = page.locator('div.HeaderMenu_customer__ymyVN').first();
  await userMenu.waitFor({ state: 'visible', timeout: 10000 });
  await userMenu.click();
  console.log('✅ Кликнули по иконке пользователя');

  const myOrdersLink = page.locator('[data-test-id="customer-dialog-link-button-1"]').first();
  await myOrdersLink.waitFor({ state: 'visible', timeout: 10000 });
  await myOrdersLink.click();
  console.log('✅ Перешли в мои заказы');

  // Получаем номер первого заказа
  const firstOrderNumber = await page.locator('text=/ARBC-\\d{6}/').first().textContent();
  const savedOrderNumber = firstOrderNumber?.match(/ARBC-\d{6}/)?.[0] || '';

  if (savedOrderNumber) {
    console.log(`📦 Номер заказа сохранён: ${savedOrderNumber}`);
  }

  await loginDms(page);

  // Открываем заказ
  await page.locator(`a:has-text("${savedOrderNumber}")`).first().click();
  console.log(`✅ Открыт заказ ${savedOrderNumber}`);

  await page.waitForTimeout(2000);
});