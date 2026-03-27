 import { Page } from '@playwright/test';
 import dotenv from 'dotenv';
 dotenv.config();

 export let savedOrderNumber: string = '';

 export async function SaveLastOrder(page: Page) {
 // Открываем меню пользователя и переходим в заказы
  const userMenu = page.locator('div.HeaderMenu_customer__ymyVN').first();
  await userMenu.waitFor({ state: 'visible', timeout: 10000 });
  await userMenu.click();
  console.log('✅ Кликнули по иконке пользователя');

  const myOrdersLink = page.locator('[data-test-id="customer-dialog-link-button-1"]').first();
  await myOrdersLink.waitFor({ state: 'visible', timeout: 10000 });
  await myOrdersLink.click();
  console.log('✅ Перешли в мои заказы');


  // Получаем номер последнего заказа
  await page.waitForSelector('text=/[A-Z]{4}-\\d{6}/', { timeout: 10000 });
  
  const firstOrderElement = await page.locator('text=/[A-Z]{4}-\\d{6}/').first();
  const text = await firstOrderElement.textContent();
  // Обрабатываем null: если null, то пустая строка
  savedOrderNumber = text?.match(/[A-Z]{4}-\d{6}/)?.[0] || '';
  

  if (savedOrderNumber) {
    console.log(`📦 Номер заказа сохранён: ${savedOrderNumber}`);
  }
}