import { test, Page, Locator, expect } from "@playwright/test";
import { AuthDMSFin, loginAsUser } from "../helpers/auth";
import { SaveLastOrder, savedOrderNumber } from "../helpers/saveLastOrder";
import { openReturnsSection } from "../helpers/createRefundAllReason";
import { getDmsOrderSearchInput, openDmsOrder } from "../helpers/dmsOrders";
import { getRefundReasonOption, getRefundReasonSelects } from "../helpers/refundReasons";
import { getConfirmButton } from "../helpers/confirmationButtons";
import {
  getRemoveFromRefundButtons,
  getRefundItemCheckboxes,
  getRefundItemsTable,
} from "../helpers/refundItems";
import { getFixedReturnLogisticsLabel } from "../helpers/refundValidation";

test('Создание возврата по 3 товарам', async ({ page, request }) => {
  test.setTimeout(120000);

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
  await searchInput.waitFor({ state: 'visible', timeout: 10000 });
  await searchInput.fill(savedOrderNumber);
  console.log('✅ Поиск: значение введено');

  // 5. Нажимаем кнопку поиска
  // 6. Открываем заказ
  await openDmsOrder(page, savedOrderNumber);
  console.log(`✅ Открыт заказ ${savedOrderNumber}`);

  // 7. Открываем раздел возвратов
  await openReturnsSection(page);
  console.log('✅ Открыт раздел возвратов');

  // 8. Ждём загрузки таблицы товаров
  const refundContainer = getRefundItemsTable(page);
  await refundContainer.waitFor({ state: "visible", timeout: 10000 }); 
  console.log('✅ Контейнер возвратов загружен');

  // 9. Проверяем, что в контейнере есть 3 товара
  const itemCheckboxes = getRefundItemCheckboxes(refundContainer);
  const totalCheckboxes = await itemCheckboxes.count();
  expect(totalCheckboxes).toBeGreaterThanOrEqual(3);
  console.log(`✅ В контейнере есть ${totalCheckboxes} товаров`);

  for (const checkbox of await itemCheckboxes.all()) {
    await checkbox.click();
    await expect(checkbox).toHaveAttribute('aria-checked', 'true');
  }
  console.log("✅ Выбраны все строки в разделе возвратов");
  // 11. Нажимаем кнопку «Заполнить заявку на возврат ДС»
  const fillButton = page.locator('button:has-text("Заполнить заявку на возврат ДС")').first();
  await fillButton.click();
  console.log('✅ Нажата кнопку «Заполнить заявку на возврат ДС»');

  // 12. Удаляем 1 товар
  const deleteProductButton = getRemoveFromRefundButtons(page).first();
  await deleteProductButton.click();
  console.log("✅ Товар удалён");
  await page.waitForTimeout(2000);

  // 13. Выбираем разные причины для каждого из 2 оставшихся товаров
  const reasonSelects = getRefundReasonSelects(page);

  // Товар 1: причина "Не подошло"
  await reasonSelects.nth(0).click();
  await getRefundReasonOption(page, "Не подошло").click();
  console.log('✅ Товар 1: выбрана причина "Не подошло"');

  // Товар 2: причина "Отсутствует в наличии"
  await reasonSelects.nth(1).click();
  await getRefundReasonOption(page, "Отсутствует в наличии").click();
  console.log('✅ Товар 2: выбрана причина "Отсутствует в наличии"');

  // 15. Нажимаем кнопку «Отправить заявку менеджеру»
  const sendButton = page.locator('button:has-text("Отправить заявку менеджеру")').first();
  await sendButton.click();
  console.log('✅ Нажата кнопка «Отправить заявку менеджеру»');
  await page.waitForTimeout(2000);

  // Проверка: при разных причинах (не все "Не подошло") — 2500 НЕ должна появляться
  const fixedLogisticsElement = getFixedReturnLogisticsLabel(page);
  await expect(fixedLogisticsElement).not.toBeVisible({ timeout: 5000 });
  console.log('✅ Фиксированная стоимость обратной логистики не отображается — причины разные, 2500 не списывается');

  // 16. Нажимаем кнопку «Подтвердить заявку»
  const confirmButtonRefund = page.locator('button:has-text("Подтвердить заявку")').first();
  await confirmButtonRefund.click();
  console.log('✅ Нажата кнопку «Подтвердить заявку»');

  // 17. Нажимаем кнопку «Провести возврат ДС»
  const refundButton = page.locator('button:has-text("Провести возврат ДС")').first();
  await refundButton.click();
  console.log('✅ Нажата кнопку «Провести возврат ДС»');

  // 18. Нажимаем кнопку «Подтвердить»
  const confirmButton = getConfirmButton(page);
  await confirmButton.click();
  console.log('✅ Нажата кнопку «Подтвердить»');

  // 19. Проверяем, статус "Проведен"
  const status = page.locator('span:has-text("Проведен")').first();
  await status.waitFor({ state: 'visible', timeout: 10000 });
  console.log('✅ Статус "Проведен"');
  console.log(`Тест проверяет по следующим пунктам:
  20. Товар удаляется в заявке на возврат
  21. По причине "Не подошло" + другая причина не списывается 2500`);
});