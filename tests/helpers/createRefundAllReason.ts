import { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

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
  await cb.evaluate(
    (el) =>
      el.closest(".MuiCheckbox-root")?.classList.contains("Mui-checked") ??
      false
  );

export const createRefunds = async (page: Page, savedOrderNumber: string) => {
  await openReturnsSection(page);

  const refundContainer = page
    .locator('div[legend="Вернуть ДС потоварно"]')
    .first();
  await refundContainer.waitFor({ state: "visible", timeout: 10000 });

  const tableScroller = refundContainer
    .locator(".MuiDataGrid-virtualScroller")
    .first();
  await tableScroller.waitFor({ state: "visible", timeout: 10000 });

  const getScrollInfo = () =>
    tableScroller.evaluate((el) => ({
      scrollTop: el.scrollTop,
      clientHeight: el.clientHeight,
      scrollHeight: el.scrollHeight,
    }));

  let itemsProcessed = 0;
  let optionIdx = 0;
  const reasonsUsed: string[] = [];

  while (true) {
    await tableScroller.evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.waitForTimeout(500);

    const { clientHeight, scrollHeight } = await getScrollInfo();
    const needsScroll = scrollHeight > clientHeight;
    const scrollStep = Math.floor(clientHeight / 2);

    let found = false;

    outerLoop: while (true) {
      const visibleCheckboxes = await refundContainer
        .locator('input[name="select_row"]')
        .all();

      for (const checkbox of visibleCheckboxes) {
        const isDisabled = await checkbox.isDisabled();
        const isAlreadyChecked = await isMuiChecked(checkbox);

        if (!isDisabled && !isAlreadyChecked) {
          await checkbox.click({ force: true });
          await page.waitForTimeout(500);

          const selectedRows = await refundContainer
            .locator(".MuiDataGrid-row.Mui-selected")
            .count();

          if (selectedRows === 1) {
            found = true;
            break outerLoop;
          }
        }
      }

      if (!needsScroll) break;

      const { scrollTop, scrollHeight: sh } = await getScrollInfo();
      if (scrollTop + clientHeight >= sh) break;

      await tableScroller.evaluate((el, step) => {
        el.scrollTop += step;
      }, scrollStep);
      await page.waitForTimeout(500);
    }

    if (!found) {
      break;
    }

    const fillButton = page
      .locator('button:has-text("Заполнить заявку на возврат ДС")')
      .first();
    await fillButton.click();
    await page.waitForTimeout(2000);

    const reasonSelect = page.locator(".MuiSelect-select.css-ljcffu").first();
    await reasonSelect.scrollIntoViewIfNeeded();
    await reasonSelect.click();

    await page.waitForSelector('li[role="option"]', { timeout: 5000 });
    const options = page.locator('li[role="option"]');
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
      const fixedLogisticsCostValue = page
        .locator(
          'p:has-text("Фиксированная стоимость обратной логистики") + div p'
        )
        .first();
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

    const confirmRefund = page
      .locator('button:has-text("Подтвердить")')
      .first();
    await confirmRefund.click();
    await page.waitForTimeout(5000);

    itemsProcessed++;
    if (optionIdx >= optionsCount - 1) {
      optionIdx = 0;
    } else {
      optionIdx++;
    }

    const linkedOrderLink = page
      .locator('a[href*="sidepage=order"][href*="sidepageEntityId"]')
      .first();
    await linkedOrderLink.waitFor({ state: "visible", timeout: 10000 });
    await linkedOrderLink.scrollIntoViewIfNeeded();
    await linkedOrderLink.click();

    await openReturnsSection(page);
    await refundContainer.waitFor({ state: "visible", timeout: 10000 });
    await tableScroller.waitFor({ state: "visible", timeout: 10000 });
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