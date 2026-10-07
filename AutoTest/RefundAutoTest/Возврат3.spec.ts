import { test, Page, expect } from "@playwright/test";
import { AuthDMSFin, loginAsUser } from "../helpers/auth";
import { SaveLastOrder, savedOrderNumber } from "../helpers/saveLastOrder";
import { getDmsOrderSearchInput, openDmsOrder } from "../helpers/dmsOrders";
import { getRefundReasonOptions, getRefundReasonSelects } from "../helpers/refundReasons";
import { getConfirmButton } from "../helpers/confirmationButtons";
import {
  getFixedReturnLogisticsCost,
  getRefundAmountExceedsOrderError,
  getRefundAmountInvalidError,
} from "../helpers/refundValidation";
import {
  getRefundItemCheckboxes,
  getRefundItemsTable,
  isRefundItemChecked,
} from "../helpers/refundItems";

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

test("Создание возврата с заметками фин.менеджера и проверки на валидность суммы возврата", async ({ page }) => {
    test.setTimeout(180000); // до 3 минут

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

    // Локаторы
    const fillButton = page.locator('button:has-text("Заполнить заявку на возврат ДС")').first();
    const amountInput = page.locator('input[name="amount"]').first();
    const refundButton = page.locator('button:has-text("Провести возврат ДС")').first();
    const paymentResponse = page.locator('span[aria-label=""response_message": "успешно завершено","]');

    // Нажать "Провести возврат ДС" → подтвердить в модалке
    const clickRefundAndConfirm = async () => {
        await refundButton.click();
        console.log("✅ Нажали «Провести возврат ДС»");
        await page.waitForTimeout(1000);
        const confirmModal = getConfirmButton(page);
        await expect(confirmModal).toBeVisible({ timeout: 5000 });
        await confirmModal.click();
        console.log("✅ Подтвердили в модалке");
        await page.waitForTimeout(1000);
    };

    while (true) {
        console.log(`\n🔄 Итерация ${itemsProcessed + 1}: ищем следующий активный товар...`);

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

        if (!found) {
            console.log(`✅ Активных товаров для возврата больше нет. Обработано: ${itemsProcessed}`);
            break;
        }

        // ── Шаги для текущего товара ──────────────────────────────────────────

        // 9. Нажимаем "Заполнить заявку на возврат ДС"
        await fillButton.click();
        console.log('✅ Нажали кнопку "Заполнить заявку на возврат ДС"');
        await page.waitForTimeout(2000);

        // 10. Выбираем причину возврата
        const reasonSelect = getRefundReasonSelects(page).first();
        await reasonSelect.scrollIntoViewIfNeeded();
        await reasonSelect.click();

        const options = getRefundReasonOptions(page);
        await options.first().waitFor({ state: 'visible', timeout: 5000 });
        const optionsCount = await options.count();
        const option = options.nth(optionIdx % optionsCount);
        const reasonText = await option.textContent();
        await option.click();
        console.log(`✅ Выбрана причина: ${reasonText?.trim()}`);
        await page.waitForTimeout(1000);

        // 11. Отправляем заявку менеджеру
        const sendButton = page.locator('button:has-text("Отправить заявку менеджеру")').first();
        await sendButton.click();
        console.log("✅ Отправлена заявка менеджеру");
        await page.waitForTimeout(2000);

        // Проверка фиксированной стоимости для причины "Не подошло"
        if (reasonText?.trim() === "Не подошло") {
            const fixedLogisticsCostValue = getFixedReturnLogisticsCost(page);
            await fixedLogisticsCostValue.waitFor({ state: "visible", timeout: 10000 });
            const costText = await fixedLogisticsCostValue.textContent();
            console.log(`✅ Фиксированная стоимость обратной логистики: ${costText?.trim()}`);
            expect(costText?.trim()).toBe("—2 500.00 RUB");
        }

        // 12. Подтверждаем заявку менеджером
        const confirmButton = page.locator('button:has-text("Подтвердить заявку")').first();
        await confirmButton.click();
        console.log("✅ Заявка подтверждена менеджером");
        await page.waitForTimeout(2000);

       // 13. Заметки финансового менеджера - УПРОЩЕННЫЙ ВАРИАНТ
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
        break;
    }
}


    // 14. Проверка: сумма сверх баланса — возврат невозможен
    await amountInput.fill("999999999999");
    await clickRefundAndConfirm();
    await expect(getRefundAmountExceedsOrderError(page)).toBeVisible({ timeout: 5000 });
    console.log("✅ Проверка: сумма сверх баланса → ошибка");

        // 15. Проверка: символы и спецзнаки — ошибка валидации
        await amountInput.fill("abc!@#");
        await refundButton.click();
        await expect(getRefundAmountInvalidError(page)).toBeVisible({ timeout: 5000 });
        console.log("✅ Проверка: символы → ошибка «Введите корректное число»");

        // 16. Проверка: кириллица — ошибка валидации
        await amountInput.fill("сто тысяч");
        await refundButton.click();
        await expect(getRefundAmountInvalidError(page)).toBeVisible({ timeout: 5000 });
        console.log("✅ Проверка: кириллица → ошибка «Введите корректное число»");

        // 17. Проверка: пустое поле — ошибка валидации
        await amountInput.fill("");
        await refundButton.click();
        await expect(getRefundAmountInvalidError(page)).toBeVisible({ timeout: 5000 });
        console.log("✅ Проверка: пустое поле → ошибка «Введите корректное число»");

        // 18. Финальный возврат: частичная сумма
        await amountInput.fill("50");
        await clickRefundAndConfirm();
        console.log("✅ Частичный возврат (50) отправлен");
        await page.waitForTimeout(2000);

        // 19. Посмотреть ответ платежной системы
        const checkPayment = page.locator('button:has-text("Посмотреть ответ платежной системы")').first();
        await checkPayment.click();
        console.log("✅ Нажали кнопку «Посмотреть ответ платежной системы»");
        await page.waitForTimeout(2000);

        // 20. Проверяем ответ платежной системы
        const paymentResponse = page.getByText("успешно завершено");
        await expect(paymentResponse).toBeVisible({ timeout: 5000 });
        console.log("✅ Ответ платежной системы загружен");

        console.log("✅ Все проверки для текущего товара завершены, выходим из цикла");
        break; // Выход из while(true)
    }

    console.log("\n✅ Все проверки успешно завершены!");
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