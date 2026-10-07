// helpers/dutyHelpers.ts
import { Page } from "@playwright/test";
import { getDmsOrderSearchInput, openDmsOrder } from "./dmsOrders";

/**
 * Открывает раздел Пошлин, если он закрыт
 */
export async function openDutySection(page: Page): Promise<void> {
  await page.waitForSelector(
    'button:has-text("Открыть раздел Пошлин"), button:has-text("Закрыть раздел Пошлин")',
    { timeout: 10000 }
  );

  const closeButton = page
    .locator('button:has-text("Закрыть раздел Пошлин")')
    .first();

  if (await closeButton.isVisible()) {
    console.log("ℹ️ Раздел Пошлин уже открыт — пропускаем");
    return;
  }

  await page
    .locator('button:has-text("Открыть раздел Пошлин")')
    .first()
    .click();
  console.log("✅ Открыт раздел Пошлин");
}

/**
 * Выбирает все активные товары в таблице пошлин
 */
export async function selectAllActiveItems(page: Page): Promise<number> {
  const dutyTable = page
    .getByRole('heading', { name: 'Пошлины', exact: true })
    .locator('xpath=following::table[1]');
  await dutyTable.waitFor({ state: "visible", timeout: 10000 });

  let itemsProcessed = 0;

  const checkboxes = await dutyTable
    .getByRole('checkbox', { name: /^Выбрать товар / })
    .all();

  for (const checkbox of checkboxes) {
    const isChecked = (await checkbox.getAttribute('aria-checked')) === 'true';
    if (!(await checkbox.isDisabled()) && !isChecked) {
      await checkbox.click();
      itemsProcessed++;
    }
  }

  console.log(`✅ Активных товаров для пошлины обработано: ${itemsProcessed}`);
  return itemsProcessed;
}

/**
 * Заполняет заявку на пошлину
 */
export async function fillDutyRequest(page: Page): Promise<void> {
  const fillButton = page
    .locator('button:has-text("Заполнить заявку на пошлину")')
    .first();
  
  await fillButton.click();
  console.log('✅ Нажали кнопку "Заполнить заявку на пошлину"');
  await page.waitForTimeout(3000);
}

/**
 * Поиск и открытие заказа по номеру
 */
export async function searchAndOpenOrder(page: Page, orderNumber: string): Promise<void> {
  const searchInput = getDmsOrderSearchInput(page);
  await searchInput.waitFor({ state: "visible", timeout: 10000 });
  await searchInput.fill(orderNumber);
  console.log("✅ Поиск: значение введено");

  await openDmsOrder(page, orderNumber);
  console.log(`✅ Открыт заказ ${orderNumber}`);
}