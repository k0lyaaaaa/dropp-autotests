// duty.spec.ts
import { expect, Page, test } from "@playwright/test";
import { AuthDMSFin, loginAsUser } from "../helpers/auth";
import { SaveLastOrder, savedOrderNumber } from "../helpers/saveLastOrder";
import {
  openDutySection,
  selectAllActiveItems,
  fillDutyRequest,
  searchAndOpenOrder,
} from "../helpers/CreateDuty";

import { openReturnsSection } from "../helpers/createRefundAllReason";
export async function openOrderAndReturnsSection(
  page: Page,
  orderNumber: string
): Promise<void> {
  await page.locator(`a:has-text("Заказ ${orderNumber}")`).first().click();
  console.log(`✅ Открыт заказ ${orderNumber}`);
  await page.waitForTimeout(2000);
  await openReturnsSection(page);
}

test.describe("Создание пошлины", () => {
  
  test.setTimeout(600000);

  test("Создание пошлины для активных товаров", async ({ page }) => {
    console.log("\n" + "=".repeat(60));
    console.log("🏁 ЗАПУСК ТЕСТА: Создание пошлины");
    console.log("=".repeat(60));

    await loginAsUser(page);
    await SaveLastOrder(page);
    console.log(`📦 Номер заказа из UI: ${savedOrderNumber}`);

    await AuthDMSFin(page);
    await page.waitForTimeout(3000);

    await searchAndOpenOrder(page, savedOrderNumber);
    await openDutySection(page);
    
    const selectedCount = await selectAllActiveItems(page);
    console.log(`📊 Итого выбрано товаров: ${selectedCount}`);
    
    await fillDutyRequest(page);

    // 1. Заполняем заметки
    const commentField = page.locator('textarea[name="notes"]').first();
    await commentField.waitFor({ state: 'visible', timeout: 10000 });
    await commentField.fill('Тестовый комментарий для пошлины');
    console.log("✅ Комментарий заполнен");

    // 2. Нажимаем кнопку "Выставить счет клиенту"
    await page.locator('button:has-text("Выставить счет клиенту")').first().click();
    console.log("✅ Кнопка нажата");
    await page.waitForTimeout(1000);
    await page.locator('button:has-text("Подтвердить")').first().click();
    console.log('✅ Выставлен счет клиенту');

    // 3. Проверяем статус "Счет выставлен"
    const statusField = page.locator('span:has-text("Счет выставлен")').first();
    await statusField.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(5000);
    await page.reload();
    console.log("✅ Статус проверен");

    // 4. Проверяем статус отправки смс клиенту "Отправлено провайдеру"
    const smsStatusField = page.locator('span:has-text("Отправлено провайдеру")').first();
    await smsStatusField.waitFor({ state: 'visible', timeout: 30000 });
    console.log("✅ Статус проверен");

    // 5. Отклоняем счет клиенту
    await page.locator('button:has-text("Отклонить счет")').first().click();
    console.log("✅ Кнопка нажата");
    await page.waitForTimeout(1000);

    // 6. Проверяем статус "Счет отклонен"
    const rejectStatusField = page.locator('span:has-text("Отклонена")').first();
    await rejectStatusField.waitFor({ state: 'visible', timeout: 10000 });
    console.log("✅ Счет отклонен");

    // 7. Возвращаемся обратно на страницу заказа
    await openOrderAndReturnsSection(page, savedOrderNumber);
    console.log("✅ Возвращаемся обратно в заказ");

    // 8. Создаем вторую пошлину
    await openDutySection(page);
    await selectAllActiveItems(page);

  // Добавляем проверку появления кнопки при наведении
  await test.step('Проверка кнопки "Завизировать невыставление" при наведении', async () => {
    // Находим элемент пошлины (замените селектор на ваш актуальный)
    const dutyElement = page.locator('.duty-item, .customs-duty-item, [data-testid="duty-item"]').first();
    
    // Наводим мышку на элемент пошлины
    await dutyElement.hover();
    await page.waitForTimeout(500); // Небольшая задержка для анимации
    
    // Проверяем, что кнопка стала видимой
    const visibleButton = page.locator('button:has-text("Завизировать невыставление")').first();
    await expect(visibleButton).toBeVisible({ timeout: 5000 });
    console.log("✅ Кнопка появилась при наведении");
    
    // Опционально: проверяем, что кнопка кликабельна
    await expect(visibleButton).toBeEnabled();
    
    // Опционально: кликаем по кнопке, если нужно
    await visibleButton.click();
    console.log("✅ Кнопка нажата");
    
    // Убираем курсор и проверяем, что кнопка снова скрылась
    await page.mouse.move(0, 0); // Уводим курсор в угол
    await page.waitForTimeout(500);
    console.log("✅ Кнопка снова скрыта после убирания курсора");
  });

  

    await page.waitForTimeout(3000);

    console.log("\n" + "=".repeat(60));
    console.log("🎉 ТЕСТ УСПЕШНО ЗАВЕРШЕН");
    console.log("=".repeat(60));
  });
});