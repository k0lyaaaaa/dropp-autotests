import { test, Page, expect } from "@playwright/test";
import { AuthDMSFin, loginAsUser } from "../helpers/auth";
import { SaveLastOrder, savedOrderNumber } from "../helpers/saveLastOrder";
import {
  getDmsOrderSearchInput,
  openDmsOrder,
  openRecentlyOpenedDmsOrder,
} from "../helpers/dmsOrders";
import { getRefundReasonOptions, getRefundReasonSelects } from "../helpers/refundReasons";
import { getConfirmButton } from "../helpers/confirmationButtons";
import {
  getRefundItemCheckboxes,
  getRefundItemsTable,
  isRefundItemChecked,
} from "../helpers/refundItems";
import { getFixedReturnLogisticsCost } from "../helpers/refundValidation";

const openReturnsSection = async (page: Page) => {
  // Ждём появления любой из двух кнопок
  await page.waitForSelector(
    'button:has-text("Открыть раздел Возвратов ДС"), button:has-text("Закрыть раздел Возвратов ДС")',
    { timeout: 10000 }
  );

  const closeButton = page
    .locator('button:has-text("Закрыть раздел Возвратов ДС")')
    .first();

  if (await closeButton.isVisible()) {
    console.log("ℹ️ Раздел Возвратов ДС уже открыт — пропускаем");
    return;
  }

  await page
    .locator('button:has-text("Открыть раздел Возвратов ДС")')
    .first()
    .click();
  console.log("✅ Открыт раздел Возвратов ДС");
};

test("Создание возврата по последнему купленному заказу", async ({ page }) => {
  test.setTimeout(600000); // до 10 минут — возвратов может быть много

  // 1. Авторизация в UI
  await loginAsUser(page);

  // 2. Получаем номер последнего заказа
  await SaveLastOrder(page);
  console.log(`📦 Номер заказа из UI: ${savedOrderNumber}`);

  // 3. Авторизация в админке
  await AuthDMSFin(page);
  await page.waitForTimeout(3000);

  // 4. Поиск заказа
  const searchInput = getDmsOrderSearchInput(page);
  await searchInput.waitFor({ state: "visible", timeout: 10000 });
  await searchInput.fill(savedOrderNumber);
  console.log("✅ Поиск: значение введено");

  // 5. Открываем заказ
  await openDmsOrder(page, savedOrderNumber);
  console.log(`✅ Открыт заказ ${savedOrderNumber}`);

  // 6. Открываем раздел Возвратов ДС
  await openReturnsSection(page);

  // 7. Ждём загрузки контейнера
  const refundContainer = getRefundItemsTable(page);
  await refundContainer.waitFor({ state: "visible", timeout: 10000 });
  console.log("✅ Контейнер возвратов загружен");

  let itemsProcessed = 0;
  let optionIdx = 0;

  while (true) {
    console.log(
      `\n🔄 Итерация ${itemsProcessed + 1}: ищем следующий активный товар...`
    );

    let found = false;

    const checkboxes = await getRefundItemCheckboxes(refundContainer).all();
    for (const checkbox of checkboxes) {
      if (!(await checkbox.isDisabled()) && !(await isRefundItemChecked(checkbox))) {
        await checkbox.click();
        await expect(checkbox).toHaveAttribute('aria-checked', 'true');
        found = true;
        console.log(`✅ Товар выбран (итерация ${itemsProcessed + 1})`);
        break;
      }
    }

    // Активных товаров больше нет — выходим из цикла
    if (!found) {
      console.log(
        `✅ Активных товаров для возврата больше нет. Обработано: ${itemsProcessed}`
      );
      break;
    }

    // 9. Нажимаем кнопку "Заполнить заявку на возврат ДС"
    const fillButton = page
      .locator('button:has-text("Заполнить заявку на возврат ДС")')
      .first();
    await fillButton.click();
    console.log('✅ Нажали кнопку "Заполнить заявку на возврат ДС"');
    await page.waitForTimeout(2000);

    // 10. Выбираем причину возврата
    console.log("🔍 Выбираем причину возврата...");
    const reasonSelect = getRefundReasonSelects(page).first();
    await reasonSelect.scrollIntoViewIfNeeded();
    await reasonSelect.click();
    console.log("✅ Открыт список причин возврата");

    const options = getRefundReasonOptions(page);
    await options.first().waitFor({ state: 'visible', timeout: 5000 });
    const optionsCount = await options.count();
    const option = options.nth(optionIdx);
    const reasonText = await option.textContent();

    await option.click();
    console.log(`✅ Выбрана причина: ${reasonText?.trim()}`);
    await page.waitForTimeout(1000);

    // 11. Отправляем заявку менеджеру
    const sendButton = page
      .locator('button:has-text("Отправить заявку менеджеру")')
      .first();
    await sendButton.click();
    console.log("✅ Отправлена заявка менеджеру");
    await page.waitForTimeout(2000);
    if (reasonText?.trim() === "Не подошло") {
      const fixedLogisticsCostValue = getFixedReturnLogisticsCost(page);
      await fixedLogisticsCostValue.waitFor({
        state: "visible",
        timeout: 10000,
      });
      const costText = await fixedLogisticsCostValue.textContent();
      console.log(
        `✅ Фиксированная стоимость обратной логистики: ${costText?.trim()}`
      );
      expect(costText?.trim()).toBe("—2 500.00 RUB");
    }

    // 12. Подтверждаем заявку
    const confirmButton = page
      .locator('button:has-text("Подтвердить заявку")')
      .first();
    await confirmButton.click();
    console.log("✅ Заявка подтверждена");
    await page.waitForTimeout(2000);

    // 13. Проводим возврат ДС
    const refundButton = page
      .locator('button:has-text("Провести возврат ДС")')
      .first();
    await refundButton.click();
    console.log("✅ Проводим возврат ДС");
    await page.waitForTimeout(2000);

    // 14. Подтверждаем возврат
    const confirmRefund = getConfirmButton(page);
    await confirmRefund.click();
    console.log("✅ Подтверждаем возврат ДС");
    await page.waitForTimeout(1000);

    itemsProcessed++;
    if (optionIdx >= optionsCount - 1) {
      optionIdx = 0;
    } else {
      optionIdx++;
    }

    console.log('🔙 Открываем заказ через блок «Ранее открытые»...');
    await openRecentlyOpenedDmsOrder(page, savedOrderNumber);
    console.log(`✅ Перешли обратно в заказ ${savedOrderNumber}`);

    // Ссылка открывает страницу заказа — нужно снова открыть раздел Возвратов ДС
    await openReturnsSection(page);
    await refundContainer.waitFor({ state: "visible", timeout: 10000 });
    await tableScroller.waitFor({ state: "visible", timeout: 10000 });
  }

  if (itemsProcessed === 0) {
    throw new Error("❌ Не удалось обработать ни одного товара");
  }

  console.log(`🎉 Тест завершён! Обработано товаров: ${itemsProcessed}`);
  console.log(` Тест проверяет по следующим пунктам:
   1. Создаём возвраты по всем причинам
   2. Возврат создаётся
   3. Причины выбираются
   4. С каждой причиной всё создаётся
   5. Заявка подтверждается
   6. Возврат осуществляется
   7. По причине "Не подошло" — -2500 RUB`)
});
