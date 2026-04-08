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

  // Ждём загрузки списка заказов и получаем номер первого
  await page.waitForSelector('text=/[A-Z]{4}-\\d{6}/', { timeout: 10000 });
  const firstOrderElement = await page.locator('text=/[A-Z]{4}-\\d{6}/').first();
  const text = await firstOrderElement.textContent();
  savedOrderNumber = text?.match(/[A-Z]{4}-\d{6}/)?.[0] || '';

  if (!savedOrderNumber) {
    throw new Error('❌ Не удалось получить номер заказа');
  }
  console.log(`📦 Номер заказа сохранён: ${savedOrderNumber}`);

//   // --- Проверка статуса оплаты и оплата, если нужно ---
//   // Ждём появления статуса первого заказа (только что созданный — всегда первый)
//   const statusElement = page.locator('.OrderStatusHeader_orderStatusHeader__kQ9kS').first();
//   await statusElement.waitFor({ state: 'visible', timeout: 10000 });
//   const statusText = await statusElement.textContent();
//   console.log(`📌 Статус заказа: ${statusText?.trim()}`);

//   if (statusText?.trim() === 'Ожидает оплаты') {
//     console.log(`⚠️ Заказ ${savedOrderNumber} ожидает оплаты. Начинаем процесс оплаты...`);

//     // 1. Нажимаем кнопку "Оплатить" на карточке заказа
//     const payButton = page.locator('button.OrderStatusCard_orderStatusCard_button__jwbt_:has-text("Оплатить")').first();
//     await payButton.waitFor({ state: 'visible', timeout: 5000 });
//     await payButton.click();
//     console.log('✅ Нажали кнопку "Оплатить"');

//     await page.waitForTimeout(2000);

//     // 2. Нажимаем "Оплатить" в модальном окне подтверждения
//   // Ждём, когда модальное окно станет видимым
//     const modal = page.locator('[class*="OrderSummaryPopup"], [class*="Modal"]').first();
//     await modal.waitFor({ state: 'visible', timeout: 10000 });
//     console.log('✅ Модальное окно открылось');

//     // 4. Нажимаем "Оплатить" в модальном окне
//     const modalPayButton = modal.locator('button:has-text("Оплатить")').first();
//     await modalPayButton.waitFor({ state: 'visible', timeout: 5000 });
//     await modalPayButton.click();
//     console.log('✅ Подтвердили оплату в модальном окне');

//        // 5. Ждём появления iframe с формой оплаты
//        await page.waitForTimeout(5000);
//     // Проверяем, есть ли выбор способа оплаты
//     const paymentFrame1 = page.frameLocator('iframe').first();
// const bankCardOption = paymentFrame1.locator('[data-qa="payment-option-preview-anyCard"]').first();
// const hasBankCardOption = await bankCardOption.isVisible({ timeout: 3000 }).catch(() => false);

// if (hasBankCardOption) {
//     console.log('🔘 Выбор способа оплаты обнаружен');
//     await bankCardOption.click();
//     console.log('✅ Выбран способ оплаты: Банковская карта');
    
//     // Ждём появления полей для ввода карты
//     await paymentFrame1.locator('input[name="card-number"]').waitFor({ state: 'visible', timeout: 10000 });
// } else {
//     console.log('ℹ️ Выбор способа оплаты не появился, продолжаем...');
//     // Если поля карты уже видны, ждём их
//     await paymentFrame1.locator('input[name="card-number"]').waitFor({ state: 'visible', timeout: 10000 });
// }
//        // Работаем через iframe
//        const paymentFrame = page.frameLocator('iframe').first();
//        const cardNumberInput = paymentFrame.locator('input[name="card-number"]').first();
//        await cardNumberInput.waitFor({ state: 'visible', timeout: 15000 });
//        console.log('✅ Форма оплаты открылась');
   
//        // 6. Заполняем тестовую карту
//        console.log('💳 Заполняем данные тестовой карты...');
//        await cardNumberInput.fill('2202474301322987');
//        await page.waitForTimeout(500);
//        await paymentFrame.locator('input[name="expiry-month"]').first().fill('12');
//        await page.waitForTimeout(500);
//        await paymentFrame.locator('input[name="expiry-year"]').first().fill('30');
//        await page.waitForTimeout(500);
//        await paymentFrame.locator('input[name="security-code"]').first().fill('123');
//        console.log('✅ Данные карты заполнены');
   
//        // 7. Нажимаем кнопку оплаты
//        const submitButton = paymentFrame.locator('button[data-qa="confirm-payment-button"], button:has-text("Заплатить")').first();
//        await submitButton.waitFor({ state: 'visible', timeout: 10000 });
//        await submitButton.click();
//        console.log('✅ Нажали кнопку "Заплатить"');
   
//        // 8. Ждём завершения оплаты
//        await page.waitForTimeout(5000);
//        await page.waitForLoadState('networkidle');
//        console.log('💰 Оплата завершена');
       
//        await page.reload();
//        await page.waitForTimeout(2000);
//        console.log('🔄 Страница обновлена');
       
//      } else {
//        console.log(`✅ Заказ ${savedOrderNumber} уже оплачен (статус: ${statusText?.trim()})`);
//      }
   }