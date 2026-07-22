// helpers/dutyHelpers.ts
import { Page, Locator } from "@playwright/test";

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
 * Проверяет, отмечен ли чекбокс MUI
 */
export async function isMuiChecked(checkbox: Locator): Promise<boolean> {
  return await checkbox.evaluate(
    (el) =>
      el.closest(".MuiCheckbox-root")?.classList.contains("Mui-checked") ?? false
  );
}

/**
 * Выбирает все активные товары в таблице пошлин
 */
export async function selectAllActiveItems(page: Page): Promise<number> {
  const tableScroller = page
    .locator('div[legend="Пошлины"]')
    .locator(".MuiDataGrid-virtualScroller")
    .first();

  await tableScroller.waitFor({ state: "visible", timeout: 10000 });

  const { clientHeight, scrollHeight } = await tableScroller.evaluate((el) => ({
    scrollTop: el.scrollTop,
    clientHeight: el.clientHeight,
    scrollHeight: el.scrollHeight,
  }));

  const needsScroll = scrollHeight > clientHeight;
  const scrollStep = Math.floor(clientHeight / 2);
  
  let itemsProcessed = 0;

  while (true) {
    console.log(`\n🔄 Итерация ${itemsProcessed + 1}: ищем следующий активный товар...`);

    await tableScroller.evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.waitForTimeout(500);

    let found = false;

    outerLoop: while (true) {
      const visibleCheckboxes = await tableScroller
        .locator('input[name="select_row"]')
        .all();
      
      console.log(`👁 Видимых чекбоксов: ${visibleCheckboxes.length}`);

      for (const checkbox of visibleCheckboxes) {
        const isDisabled = await checkbox.isDisabled();
        const isAlreadyChecked = await isMuiChecked(checkbox);
        
        console.log(`🔍 disabled=${isDisabled}, muiChecked=${isAlreadyChecked}`);

        if (!isDisabled && !isAlreadyChecked) {
          await checkbox.click({ force: true });
          await page.waitForTimeout(500);

          const selectedRows = await tableScroller
            .locator(".MuiDataGrid-row.Mui-selected")
            .count();
          
          console.log(`🖱 После клика выбрано строк: ${selectedRows}`);

          if (selectedRows > 0) {
            found = true;
            itemsProcessed++;
            console.log(`✅ Товар выбран (всего обработано: ${itemsProcessed})`);
            break outerLoop;
          }
        }
      }

      if (!needsScroll) break;

      const { scrollTop, scrollHeight: sh } = await tableScroller.evaluate((el) => ({
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
      }));
      
      if (scrollTop + clientHeight >= sh) break;

      await tableScroller.evaluate((el, step) => {
        el.scrollTop += step;
      }, scrollStep);
      
      await page.waitForTimeout(500);
    }

    if (!found) {
      console.log(`✅ Активных товаров для пошлины больше нет. Обработано: ${itemsProcessed}`);
      break;
    }
  }

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
  const searchInput = page.locator('input[placeholder="Поиск"]');
  await searchInput.waitFor({ state: "visible", timeout: 10000 });
  await searchInput.fill(orderNumber);
  console.log("✅ Поиск: значение введено");

  const searchButton = page.locator('[data-testid="SearchIcon"]');
  await searchButton.waitFor({ state: "visible", timeout: 10000 });
  await searchButton.click();
  console.log("✅ Поиск выполнен");

  await page.locator(`a:has-text("${orderNumber}")`).first().click();
  console.log(`✅ Открыт заказ ${orderNumber}`);
}