import { test, expect, Page } from '@playwright/test';
import { loginAsUser, AuthDMSFin } from '../helpers/auth';
import { SaveLastOrder, savedOrderNumber } from '../helpers/saveLastOrder';
import { createOrderWithMultipleItems } from '../helpers/api/createDealBack';
import { createRefunds, openReturnsSection } from '../helpers/createRefundAllReason';
import { getDmsOrderSearchInput, openDmsOrder } from '../helpers/dmsOrders';
import {
  getRefundReasonOption,
  getRefundReasonOptions,
  getRefundReasonSelects,
} from '../helpers/refundReasons';
import { getConfirmButton } from '../helpers/confirmationButtons';
import {
  getFixedReturnLogisticsCost,
  getFixedReturnLogisticsLabel,
  getRefundAmountExceedsOrderError,
  getRefundAmountInvalidError,
} from '../helpers/refundValidation';
import {
  testDeleteRefund,
  testCreateSendAndDecline,
  testSendConfirmByManagerAndDecline,
  reopenOrderAndReturnsSection,
} from '../helpers/refundCase2Helpers';
import {
  getRemoveFromRefundButtons,
  getRefundItemCheckboxes,
  getRefundItemsTable,
  isRefundItemChecked,
} from '../helpers/refundItems';

// ==================== ОБЩИЙ ХЕЛПЕР: ВХОД В DMS И ПОИСК ЗАКАЗА ====================

async function loginAndFindOrder(page: Page): Promise<string> {
  await loginAsUser(page);
  await SaveLastOrder(page);
  await AuthDMSFin(page);
  await page.waitForTimeout(3000);

  await test.step(`Поиск и открытие заказа ${savedOrderNumber}`, async () => {
    const searchInput = getDmsOrderSearchInput(page);
    await searchInput.waitFor({ state: 'visible', timeout: 10000 });
    await searchInput.fill(savedOrderNumber);

    await openDmsOrder(page, savedOrderNumber);
  });

  return savedOrderNumber;
}

// ==================== РЕГРЕССИОННЫЙ НАБОР ====================

test.describe.serial('Регрессионный набор', () => {

  // ─────────────────────────────────────────────────────────────
  // // RC1: Возврат по всем причинам — 14 товаров
  // // ─────────────────────────────────────────────────────────────
  test('[RC1] Возврат по всем причинам — 14 товаров', async ({ page, request }) => {
    test.setTimeout(600000);

    await createOrderWithMultipleItems(request, 14);
    await page.waitForTimeout(2000);
    const orderNumber = await loginAndFindOrder(page);
    await createRefunds(page, orderNumber);
  });

//   // ─────────────────────────────────────────────────────────────
//   // RC2: Lifecycle заявки — удаление / отправка / отклонение — 1 товар
//   // ─────────────────────────────────────────────────────────────
  test('[RC2] Lifecycle заявки: удаление, редактирование, отклонение — 1 товар', async ({ page, request }) => {
    test.setTimeout(300000);

    await createOrderWithMultipleItems(request, 1);
    await page.waitForTimeout(2000);
    const orderNumber = await loginAndFindOrder(page);

    await openReturnsSection(page);
    let refundContainer = getRefundItemsTable(page);
    await refundContainer.waitFor({ state: 'visible', timeout: 10000 });
    let tableScroller = refundContainer;

    await test.step('Проверка 1: удаление черновика заявки', async () => {
      await testDeleteRefund(page, refundContainer, tableScroller);
    });

    ({ refundContainer, tableScroller } = await reopenOrderAndReturnsSection(page, orderNumber));

    await test.step('Проверка 2: создание → причина → заметка → отправка → редактирование → другая причина → сохранение → отклонение', async () => {
      await testCreateSendAndDecline(page, refundContainer, tableScroller);
    });

    ({ refundContainer, tableScroller } = await reopenOrderAndReturnsSection(page, orderNumber));

    await test.step('Проверка 3: отправка → подтверждение менеджером → редактирование → отклонение', async () => {
      await testSendConfirmByManagerAndDecline(page, refundContainer, tableScroller);
    });
    console.log(`Тест проверяет по следующим пунктам:
      8. Заметки прописываются
      9. Удаление заявки
     10. Отклоняется заявка после Отправка заявки Менеджеру
     11. Отклоняется заявка после подтверждения Менеджером`);
  });

//   // ─────────────────────────────────────────────────────────────
//   // RC3: Заметки фин.менеджера и валидация суммы — 1 товар
//   // ─────────────────────────────────────────────────────────────
  test('[RC3] Заметки фин.менеджера и валидация суммы — 1 товар', async ({ page, request }) => {
    test.setTimeout(300000);

    // await createOrderWithMultipleItems(request, 1);
    const orderNumber = await loginAndFindOrder(page);

    await openReturnsSection(page);
    const refundContainer = getRefundItemsTable(page);
    await refundContainer.waitFor({ state: 'visible', timeout: 10000 });

    const amountInput = page.locator('input[name="amount"]').first();
    const refundButton = page.locator('button:has-text("Провести возврат ДС")').first();

    const clickRefundAndConfirm = async () => {
      await refundButton.click();
      await page.waitForTimeout(1000);
      const confirmModal = getConfirmButton(page);
      await expect(confirmModal).toBeVisible({ timeout: 5000 });
      await confirmModal.click();
      await page.waitForTimeout(1000);
    };

    let itemsProcessed = 0;
    let optionIdx = 0;

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

      if (!found) break;

      await test.step(`Товар ${itemsProcessed + 1}: заполнение заявки → отправка → подтверждение → заметки → валидация суммы`, async () => {
        // Заполнить заявку
        const fillButton = page.locator('button:has-text("Заполнить заявку на возврат ДС")').first();
        await fillButton.click();
        await page.waitForTimeout(2000);

        // Выбрать причину (циклически)
        const reasonSelect = getRefundReasonSelects(page).first();
        await reasonSelect.scrollIntoViewIfNeeded();
        await reasonSelect.click();
        const options = getRefundReasonOptions(page);
        await options.first().waitFor({ state: 'visible', timeout: 5000 });
        const optionsCount = await options.count();
        const option = options.nth(optionIdx % optionsCount);
        const reasonText = await option.textContent();
        await option.click();
        await page.waitForTimeout(1000);

        // Отправить менеджеру
        await page.locator('button:has-text("Отправить заявку менеджеру")').first().click();
        await page.waitForTimeout(2000);

        // Проверка логистики для "Не подошло"
        if (reasonText?.trim() === 'Не подошло') {
          const costEl = getFixedReturnLogisticsCost(page);
          await costEl.waitFor({ state: 'visible', timeout: 10000 });
          expect((await costEl.textContent())?.trim()).toBe('—2 500.00 RUB');
        }

        // Подтвердить заявку менеджером
        await page.locator('button:has-text("Подтвердить заявку")').first().click();
        await page.waitForTimeout(2000);

        // Заметки фин.менеджера (ждём enabled поле)
        await page.waitForFunction(() => {
          const textareas = document.querySelectorAll('textarea');
          return Array.from(textareas).some(ta => !ta.disabled && ta.offsetParent !== null);
        }, { timeout: 15000 });

        const allTextareas = page.locator('textarea');
        const count = await allTextareas.count();

        for (let i = 0; i < count; i++) {
          const textarea = allTextareas.nth(i);
          const isDisabled = await textarea.isDisabled();
          const isReadonly = await textarea.getAttribute('readonly');
          const isVisible = await textarea.isVisible();

          if (!isDisabled && !isReadonly && isVisible) {
            await textarea.fill('Короче я проверяю, как хочу, так и буду!!!!!!!!!!!!!!!!!!');
            await expect(textarea).toHaveValue('Короче я проверяю, как хочу, так и буду!!!!!!!!!!!!!!!!!!');
            break;
          }
        }

        // Валидация: сумма сверх баланса
        await amountInput.fill('999999999999');
        await clickRefundAndConfirm();
        await expect(getRefundAmountExceedsOrderError(page)).toBeVisible({ timeout: 5000 });

        // Валидация: символы
        await amountInput.fill('abc!@#');
        await refundButton.click();
        await expect(getRefundAmountInvalidError(page)).toBeVisible({ timeout: 5000 });

        // Валидация: кириллица
        await amountInput.fill('сто тысяч');
        await refundButton.click();
        await expect(getRefundAmountInvalidError(page)).toBeVisible({ timeout: 5000 });

        // Валидация: пустое поле
        await amountInput.fill('');
        await refundButton.click();
        await expect(getRefundAmountInvalidError(page)).toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(2000);

        // Частичный возврат (500)
        await amountInput.fill('500');
        await clickRefundAndConfirm();
        await page.waitForTimeout(2000);
      });

      // Проверяем ответ платежной системы
      await test.step('Проверить ответ платежной системы', async () => {
        const checkPayment = page.locator('button:has-text("Посмотреть ответ платежной системы")').first();
        await checkPayment.click();
        await page.waitForTimeout(2000);

        const paymentResponse = page.getByText('успешно завершено');
        await expect(paymentResponse).toBeVisible({ timeout: 5000 });
      });

      break; // Выход из while(true)

    }
    console.log(`Тест проверяет по следующим пунктам:
      12. Заметки финансового менеджера
      13. Проверка: сумма сверх баланса → ошибка
      14. Проверка: символы → ошибка «Введите корректное число»
      15. Проверка: кириллица → ошибка «Введите корректное число»
      16. Проверка: пустое поле → ошибка «Введите корректное число»
      17. Финальный возврат: частичная сумма
      18. Посмотреть ответ платежной системы
      19. Проверяем ответ платежной системы`);
  });

  // ─────────────────────────────────────────────────────────────
  // RC4: Разные причины / удаление товара из заявки — 3 товара
  // ─────────────────────────────────────────────────────────────
  test('[RC4] Разные причины и удаление товара из заявки — 3 товара', async ({ page, request }) => {
    test.setTimeout(120000);

    await createOrderWithMultipleItems(request, 3);
    await loginAndFindOrder(page);

    await openReturnsSection(page);
    const refundContainer = getRefundItemsTable(page);
    await refundContainer.waitFor({ state: 'visible', timeout: 10000 });

    const allCheckboxes = getRefundItemCheckboxes(refundContainer);
    await expect(allCheckboxes).toHaveCount(3, { timeout: 10000 });

    await test.step('Выбрать все 3 товара', async () => {
      for (let i = 0; i < 3; i++) {
        const checkbox = allCheckboxes.nth(i);

        if (!(await isRefundItemChecked(checkbox))) {
          await checkbox.click();
        }

        await expect
          .poll(async () => isRefundItemChecked(checkbox), {
            timeout: 5000,
            message: `Чекбокс товара #${i + 1} не перешел в состояние selected`,
          })
          .toBe(true);
      }
    });

    await test.step('Заполнить причины возврата и удалить 1 товар', async () => {
      await page.locator('button:has-text("Заполнить заявку на возврат ДС")').first().click();

      const reasonSelects = getRefundReasonSelects(page);
      await reasonSelects.nth(0).click();
      await getRefundReasonOption(page, 'Не подошло').click();

      await reasonSelects.nth(1).click();
      await getRefundReasonOption(page, 'Отсутствует в наличии').click();

      await reasonSelects.nth(2).click();
      await getRefundReasonOption(page, 'Не подошло').click();
      await page.waitForTimeout(2000);

      await getRemoveFromRefundButtons(page).first().click();
      await page.waitForTimeout(2000);
    });

    await test.step('Отправить менеджеру и проверить отсутствие фиксированной стоимости', async () => {
      await page.locator('button:has-text("Отправить заявку менеджеру")').first().click();
      await page.waitForTimeout(2000);

      // При разных причинах 2500 НЕ должна появляться
      await expect(
        getFixedReturnLogisticsLabel(page)
      ).not.toBeVisible({ timeout: 5000 });
    });

    await test.step('Подтвердить и провести возврат ДС', async () => {
      await page.locator('button:has-text("Подтвердить заявку")').first().click();
      await page.waitForTimeout(2000);

      await page.locator('button:has-text("Провести возврат ДС")').first().click();
      await getConfirmButton(page).click();

      await expect(page.locator('span:has-text("Проведен")').first()).toBeVisible({ timeout: 10000 });
    });
    console.log(`Тест проверяет по следующим пунктам:
      20. Товар удаляется в заявке на возврат
      21. По причине "Не подошло" + другая причина не списывается 2500`);
  });

});
