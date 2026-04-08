import { test, expect, Page } from '@playwright/test';
import { loginAsUser, AuthDMSFin } from '../helpers/auth';
import { SaveLastOrder, savedOrderNumber } from '../helpers/saveLastOrder';
import { createOrderWithMultipleItems } from '../helpers/api/createDealBack';
import { createRefunds, openReturnsSection, isMuiChecked } from '../helpers/createRefundAllReason';
import {
  testDeleteRefund,
  testCreateSendAndDecline,
  testSendConfirmByManagerAndDecline,
  reopenOrderAndReturnsSection,
} from '../helpers/refundCase2Helpers';

// ==================== ОБЩИЙ ХЕЛПЕР: ВХОД В DMS И ПОИСК ЗАКАЗА ====================

async function loginAndFindOrder(page: Page): Promise<string> {
  await loginAsUser(page);
  await SaveLastOrder(page);
  console.log(`📦 Номер заказа: ${savedOrderNumber}`);

  await AuthDMSFin(page);
  await page.waitForTimeout(3000);

// Поиск и открытие заказа
const searchInput = page.locator('input[placeholder="Поиск"]');
await searchInput.waitFor({ state: 'visible', timeout: 10000 });
await searchInput.fill(savedOrderNumber);
console.log(`🔍 Ввели номер заказа: ${savedOrderNumber}`);

const searchButton = page.locator('[data-testid="SearchIcon"]');
await searchButton.click();
console.log('✅ Нажали кнопку поиска');

const orderLink = page.locator(`a:has-text("${savedOrderNumber}")`).first();
await orderLink.waitFor({ state: 'visible', timeout: 15000 });
console.log(`✅ Ссылка на заказ ${savedOrderNumber} появилась`);

await page.waitForTimeout(500);
await orderLink.click();
console.log(`✅ Открыт заказ ${savedOrderNumber}`);

  return savedOrderNumber;
}

// ==================== РЕГРЕССИОННЫЙ НАБОР ====================

test.describe.serial('Регрессионный набор', () => {

  // ─────────────────────────────────────────────────────────────
  // RC1: Возврат по всем причинам — 14 товаров
  // ─────────────────────────────────────────────────────────────
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
    let refundContainer = page.locator('div[legend="Вернуть ДС потоварно"]').first();
    await refundContainer.waitFor({ state: 'visible', timeout: 10000 });
    let tableScroller = refundContainer.locator('.MuiDataGrid-virtualScroller').first();
    await tableScroller.waitFor({ state: 'visible', timeout: 10000 });

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
  });

//   // ─────────────────────────────────────────────────────────────
//   // RC3: Заметки фин.менеджера и валидация суммы — 1 товар
//   // ─────────────────────────────────────────────────────────────
  test('[RC3] Заметки фин.менеджера и валидация суммы — 1 товар', async ({ page, request }) => {
    test.setTimeout(300000);

    // await createOrderWithMultipleItems(request, 1);
    const orderNumber = await loginAndFindOrder(page);

    await openReturnsSection(page);
    const refundContainer = page.locator('div[legend="Вернуть ДС потоварно"]').first();
    await refundContainer.waitFor({ state: 'visible', timeout: 10000 });
    const tableScroller = refundContainer.locator('.MuiDataGrid-virtualScroller').first();
    await tableScroller.waitFor({ state: 'visible', timeout: 10000 });

    const getScrollInfo = () =>
      tableScroller.evaluate((el) => ({
        scrollTop: el.scrollTop,
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
      }));

    const amountInput = page.locator('input[name="amount"]').first();
    const refundButton = page.locator('button:has-text("Провести возврат ДС")').first();
    const validationError = page.locator('span[aria-label="Значение должно быть больше или равно 0"]');
    const requiredFieldError = page.locator('span[aria-label="Обязательное поле"]');

    const clickRefundAndConfirm = async () => {
      await refundButton.click();
      await page.waitForTimeout(1000);
      const confirmModal = page.locator('button:has-text("Подтвердить")').first();
      await expect(confirmModal).toBeVisible({ timeout: 5000 });
      await confirmModal.click();
      await page.waitForTimeout(1000);
    };

    let itemsProcessed = 0;
    let optionIdx = 0;

    while (true) {
      await tableScroller.evaluate((el) => { el.scrollTop = 0; });
      await page.waitForTimeout(500);

      const { clientHeight, scrollHeight } = await getScrollInfo();
      const needsScroll = scrollHeight > clientHeight;
      const scrollStep = Math.floor(clientHeight / 2);
      let found = false;

      outerLoop: while (true) {
        const visibleCheckboxes = await refundContainer.locator('input[name="select_row"]').all();
        for (const checkbox of visibleCheckboxes) {
          const isDisabled = await checkbox.isDisabled();
          const isAlreadyChecked = await isMuiChecked(checkbox);
          if (!isDisabled && !isAlreadyChecked) {
            await checkbox.click({ force: true });
            await page.waitForTimeout(500);
            const selectedRows = await refundContainer.locator('.MuiDataGrid-row.Mui-selected').count();
            if (selectedRows === 1) { found = true; break outerLoop; }
          }
        }
        if (!needsScroll) break;
        const { scrollTop, scrollHeight: sh } = await getScrollInfo();
        if (scrollTop + clientHeight >= sh) break;
        await tableScroller.evaluate((el, step) => { el.scrollTop += step; }, scrollStep);
        await page.waitForTimeout(500);
      }

      if (!found) { console.log(`✅ Все товары обработаны. Итого: ${itemsProcessed}`); break; }

      await test.step(`Товар ${itemsProcessed + 1}: заполнение заявки → отправка → подтверждение → заметки → валидация суммы`, async () => {
        // Заполнить заявку
        const fillButton = page.locator('button:has-text("Заполнить заявку на возврат ДС")').first();
        await fillButton.click();
        await page.waitForTimeout(2000);

        // Выбрать причину (циклически)
        const reasonSelect = page.locator('.MuiSelect-select.css-ljcffu').first();
        await reasonSelect.scrollIntoViewIfNeeded();
        await reasonSelect.click();
        await page.waitForSelector('li[role="option"]', { timeout: 5000 });
        const options = page.locator('li[role="option"]');
        const optionsCount = await options.count();
        const option = options.nth(optionIdx % optionsCount);
        const reasonText = await option.textContent();
        await option.click();
        console.log(`✅ Причина: ${reasonText?.trim()}`);
        await page.waitForTimeout(1000);

        // Отправить менеджеру
        await page.locator('button:has-text("Отправить заявку менеджеру")').first().click();
        console.log('✅ Отправлена заявка менеджеру');
        await page.waitForTimeout(2000);

        // Проверка логистики для "Не подошло"
        if (reasonText?.trim() === 'Не подошло') {
          const costEl = page.locator('p:has-text("Фиксированная стоимость обратной логистики") + div p').first();
          await costEl.waitFor({ state: 'visible', timeout: 10000 });
          expect((await costEl.textContent())?.trim()).toBe('—2 500.00 RUB');
          console.log('✅ Фиксированная стоимость обратной логистики: —2 500.00 RUB');
        }

        // Подтвердить заявку менеджером
        await page.locator('button:has-text("Подтвердить заявку")').first().click();
        console.log('✅ Заявка подтверждена менеджером');
        await page.waitForTimeout(2000);

        // Заметки фин.менеджера (ждём enabled поле)
console.log("🔍 Ищем поле для заметок...");

// Ждем появления любого textarea, которое не disabled
await page.waitForFunction(() => {
    const textareas = document.querySelectorAll('textarea');
    return Array.from(textareas).some(ta => !ta.disabled && ta.offsetParent !== null);
}, { timeout: 15000 });

// Находим ВСЕ textarea
const allTextareas = page.locator('textarea');
const count = await allTextareas.count();
console.log(`📝 Найдено textarea: ${count}`);

// Перебираем все и находим первое активное (не disabled и не readonly)
for (let i = 0; i < count; i++) {
    const textarea = allTextareas.nth(i);
    const isDisabled = await textarea.isDisabled();
    const isReadonly = await textarea.getAttribute('readonly');
    const isVisible = await textarea.isVisible();
    
    console.log(`Textarea ${i}: disabled=${isDisabled}, readonly=${!!isReadonly}, visible=${isVisible}`);
    
    if (!isDisabled && !isReadonly && isVisible) {
        console.log(`✅ Найдено активное поле! Заполняем...`);
        await textarea.fill("Короче я проверяю, как хочу, так и буду!!!!!!!!!!!!!!!!!!");
        await expect(textarea).toHaveValue("Короче я проверяю, как хочу, так и буду!!!!!!!!!!!!!!!!!!");
        console.log("✅ Заметки финансового менеджера добавлены");
        const paymentResponse = page.locator('span[aria-label=""response_message": "успешно завершено","]');
        break;
    }
}

        // Валидация: сумма сверх баланса
        await amountInput.fill('999999999999');
        await clickRefundAndConfirm();
        await expect(page.getByText('Refund amount cannot be greater than order amount', { exact: true })).toBeVisible({ timeout: 5000 });
        console.log('✅ Проверка: сумма сверх баланса → ошибка');

        // Валидация: символы
        await amountInput.fill('abc!@#');
        await clickRefundAndConfirm();
        await expect(validationError).toBeVisible({ timeout: 5000 });
        console.log('✅ Проверка: символы → ошибка валидации');

        // Валидация: кириллица
        await amountInput.fill('сто тысяч');
        await clickRefundAndConfirm();
        await expect(validationError).toBeVisible({ timeout: 5000 });
        console.log('✅ Проверка: кириллица → ошибка валидации');

        // Валидация: пустое поле
        await amountInput.fill('');
        await clickRefundAndConfirm();
        await expect(requiredFieldError).toBeVisible({ timeout: 5000 });
        console.log('✅ Проверка: пустое поле → ошибка валидации');
        await page.waitForTimeout(2000);

        // Частичный возврат (500)
        await amountInput.fill('500');
        await clickRefundAndConfirm();
        console.log('✅ Частичный возврат выполнен');
        await page.waitForTimeout(2000);
      });
       // Посмотреть ответ платежной системы
       const checkPayment = page.locator('button:has-text("Посмотреть ответ платежной системы")').first();
       await checkPayment.click();
       console.log("✅ Нажали кнопку «Посмотреть ответ платежной системы»");
       await page.waitForTimeout(2000);

       // Проверяем ответ платежной системы
       const paymentResponse = page.getByText("успешно завершено");
       await expect(paymentResponse).toBeVisible({ timeout: 5000 });
       console.log("✅ Ответ платежной системы загружен");

       console.log("✅ Все проверки для текущего товара завершены, выходим из цикла");
       break; // Выход из while(true)

    }
  });

  // ─────────────────────────────────────────────────────────────
  // RC4: Разные причины / удаление товара из заявки — 3 товара
  // ─────────────────────────────────────────────────────────────
  test('[RC4] Разные причины и удаление товара из заявки — 3 товара', async ({ page, request }) => {
    test.setTimeout(120000);

    await createOrderWithMultipleItems(request, 3);
    await loginAndFindOrder(page);

    await openReturnsSection(page);
    const refundContainer = page.locator('div[legend="Вернуть ДС потоварно"]').first();
    await refundContainer.waitFor({ state: 'visible', timeout: 10000 });

    // Выбираем все 3 товара (для MUI чекбоксов надежнее клик + проверка состояния)
    const allCheckboxes = refundContainer.locator('input[name="select_row"]');
    await expect(allCheckboxes).toHaveCount(3, { timeout: 10000 });

    for (let i = 0; i < 3; i++) {
      const checkbox = allCheckboxes.nth(i);

      if (!(await isMuiChecked(checkbox))) {
        await checkbox.click({ force: true });
      }

      await expect
        .poll(async () => isMuiChecked(checkbox), {
          timeout: 5000,
          message: `Чекбокс товара #${i + 1} не перешел в состояние selected`,
        })
        .toBe(true);

      console.log(`✅ Выбран товар #${i + 1}`);
    }

    // Открываем форму заявки
    await page.locator('button:has-text("Заполнить заявку на возврат ДС")').first().click();
    console.log('✅ Открыта форма заявки');

    // Товару 1 — причина "Не подошло"
    const reasonSelects = page.locator('.MuiSelect-select.css-ljcffu');
    await reasonSelects.nth(0).click();
    await page.locator('li[role="option"]:has-text("Не подошло")').first().click();
    console.log('✅ Товар 1: причина "Не подошло"');

    // Товару 2 — причина "Отсутствует в наличии"
    await reasonSelects.nth(1).click();
    await page.locator('li[role="option"]:has-text("Отсутствует в наличии")').first().click();
    console.log('✅ Товар 2: причина "Отсутствует в наличии"');

    // Товару 3 — причина "Не подошло"
    await reasonSelects.nth(2).click();
    await page.locator('li[role="option"]:has-text("Не подошло")').first().click();
    console.log('✅ Товар 3: причина "Не подошло"');
    await page.waitForTimeout(2000);

     // Удаляем 1 товар из заявки
     await page.locator('button[aria-label="Удалить товар"]').first().click();
     console.log('✅ Один товар удалён из заявки (осталось 2)');
     await page.waitForTimeout(2000);

    // Отправляем менеджеру
    await page.locator('button:has-text("Отправить заявку менеджеру")').first().click();
    console.log('✅ Заявка отправлена менеджеру');
    await page.waitForTimeout(2000);

    // При разных причинах 2500 НЕ должна появляться
    await expect(
      page.locator('p:has-text("Фиксированная стоимость обратной логистики")').first()
    ).not.toBeVisible({ timeout: 5000 });
    console.log('✅ Фиксированная стоимость не отображается — причины разные, 2500 не списывается');

    // Подтверждаем заявку
    await page.locator('button:has-text("Подтвердить заявку")').first().click();
    console.log('✅ Заявка подтверждена');
    await page.waitForTimeout(2000);

    // Проводим возврат ДС
    await page.locator('button:has-text("Провести возврат ДС")').first().click();
    await page.locator('button:has-text("Подтвердить")').first().click();
    console.log('✅ Возврат ДС проведён');

    // Проверяем статус "Проведен"
    await expect(page.locator('span:has-text("Проведен")').first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Статус "Проведен" подтверждён');
  });

});
