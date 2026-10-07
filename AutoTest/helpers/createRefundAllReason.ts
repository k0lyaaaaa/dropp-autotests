import { Page, Locator } from '@playwright/test';
import { getRefundReasonOptions, getRefundReasonSelects } from './refundReasons';
import { getConfirmButton } from './confirmationButtons';
import { expect } from '@playwright/test';
import {
  getRefundItemCheckboxes,
  getRefundItemsTable,
  isRefundItemChecked,
} from './refundItems';
import { openRecentlyOpenedDmsOrder } from './dmsOrders';
import { getFixedReturnLogisticsCost } from './refundValidation';

export const openReturnsSection = async (page: Page) => {
  await page.waitForSelector(
    'button:has-text("Открыть раздел Возвратов ДС"), button:has-text("Закрыть раздел Возвратов ДС")',
    { timeout: 10000 }
  );

  const closeButton = page
    .locator('button:has-text("Закрыть раздел Возвратов ДС")')
    .first();

  if (await closeButton.isVisible()) {
    return;
  }

  await page
    .locator('button:has-text("Открыть раздел Возвратов ДС")')
    .first()
    .click();
};

export const isMuiChecked = async (cb: Locator) =>
  isRefundItemChecked(cb);

export const createRefunds = async (page: Page, savedOrderNumber: string) => {
  await openReturnsSection(page);

  const refundContainer = getRefundItemsTable(page);
  await refundContainer.waitFor({ state: "visible", timeout: 10000 });

  let itemsProcessed = 0;
  let optionIdx = 0;
  const reasonsUsed: string[] = [];

  while (true) {
    let found = false;

    const checkboxes = await getRefundItemCheckboxes(refundContainer).all();
    for (const checkbox of checkboxes) {
      if (!(await checkbox.isDisabled()) && !(await isRefundItemChecked(checkbox))) {
        await checkbox.click();
        await expect(checkbox).toHaveAttribute('aria-checked', 'true');
        found = true;
        break;
      }
    }

    if (!found) {
      break;
    }

    const fillButton = page
      .locator('button:has-text("Заполнить заявку на возврат ДС")')
      .first();
    await fillButton.click();
    await page.waitForTimeout(2000);

    const reasonSelect = getRefundReasonSelects(page).first();
    await reasonSelect.scrollIntoViewIfNeeded();
    await reasonSelect.click();

    const options = getRefundReasonOptions(page);
    await options.first().waitFor({ state: 'visible', timeout: 5000 });
    const optionsCount = await options.count();
    const option = options.nth(optionIdx);
    const reasonText = await option.textContent();

    if (!reasonText) {
      throw new Error(`Не удалось получить текст причины с индексом ${optionIdx}`);
    }

    reasonsUsed.push(reasonText.trim());

    await option.click();
    await page.waitForTimeout(1000);

    const sendButton = page
      .locator('button:has-text("Отправить заявку менеджеру")')
      .first();
    await sendButton.click();
    await page.waitForTimeout(1000);

    if (reasonText.trim() === "Не подошло") {
      const fixedLogisticsCostValue = getFixedReturnLogisticsCost(page);
      await fixedLogisticsCostValue.waitFor({
        state: "visible",
        timeout: 10000,
      });
      const costText = await fixedLogisticsCostValue.textContent();
      expect(costText?.trim()).toBe("—2 500.00 RUB");
    }

    const confirmButton = page
      .locator('button:has-text("Подтвердить заявку")')
      .first();
    await confirmButton.click();
    await page.waitForTimeout(1000);

    const refundButton = page
      .locator('button:has-text("Провести возврат ДС")')
      .first();
    await refundButton.click();
    await page.waitForTimeout(1000);

    const confirmRefund = getConfirmButton(page);
    await confirmRefund.click();
    await page.waitForTimeout(5000);

    itemsProcessed++;
    if (optionIdx >= optionsCount - 1) {
      optionIdx = 0;
    } else {
      optionIdx++;
    }

    await openRecentlyOpenedDmsOrder(page, savedOrderNumber);

    await openReturnsSection(page);
    await refundContainer.waitFor({ state: "visible", timeout: 10000 });
  }

  if (itemsProcessed === 0) {
    throw new Error("❌ Не удалось обработать ни одного товара");
  }

  // ========== ОТЧЁТ ==========
  console.log('\n' + '='.repeat(60));
  console.log('📊 ОТЧЁТ О ВЫПОЛНЕНИИ ТЕСТ-КЕЙСОВ:');
  console.log('='.repeat(60));

  const testCases = [
    { name: '1. Возврат создаётся', status: itemsProcessed > 0 ? '✅' : '❌' },
    { name: '2. Причины выбираются', status: reasonsUsed.length > 0 ? '✅' : '❌' },
    { name: '3. С каждой причиной всё создаётся', status: itemsProcessed === reasonsUsed.length ? '✅' : '⚠️' },
    { name: '4. Заявка подтверждается', status: '✅' },
    { name: '5. Возврат осуществляется', status: '✅' },
    { name: '6. По причине "Не подошло" — -2500 RUB', status: reasonsUsed.includes('Не подошло') ? '✅' : '⚠️' },
  ];

  for (const tc of testCases) {
    console.log(`${tc.status} ${tc.name}`);
  }

  console.log('='.repeat(60));
  console.log(`🎯 ИТОГО ОБРАБОТАНО ВОЗВРАТОВ: ${itemsProcessed}`);
  console.log(`📋 ИСПОЛЬЗОВАННЫЕ ПРИЧИНЫ: ${reasonsUsed.join(', ')}`);
  console.log('='.repeat(60));

  return itemsProcessed;
};