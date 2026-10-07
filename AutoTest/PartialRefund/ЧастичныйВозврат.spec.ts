import { test, Page, Locator, expect, request } from "@playwright/test";
import { AuthDMSFin, loginAsUser } from "../helpers/auth";
import { SaveLastOrder, savedOrderNumber } from "../helpers/saveLastOrder";
import { createOrderWithMultipleItems } from '../helpers/api/createDealBack';
import { openReturnsSection } from "../helpers/createRefundAllReason";
import { getDmsOrderSearchInput, openDmsOrder } from "../helpers/dmsOrders";
import {
  getArbitraryRefundReasonSelect,
  getRefundReasonOption,
} from "../helpers/refundReasons";
import { getConfirmButton } from "../helpers/confirmationButtons";

let optionIdx = 0;

test("Создание произвольного возврата", async ({ page, request }) => {
  test.setTimeout(600000); // до 10 минут — возвратов может быть много

    // Создаем заказ
    await createOrderWithMultipleItems(request, 1);
    await page.waitForTimeout(2000);

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

  // 6. Открываем раздел возвратов
  await openReturnsSection(page);
  console.log("✅ Раздел возвратов открыт");

  // 7. Создаем произвольный возврат
  await page.locator('button:has-text("Заполнить заявку на произвольный возврат")') .first().click();
  console.log("✅ Произвольный возврат создан");

  // 8. Выбираем причину возврата
    console.log("🔍 Выбираем причину произвольного возврата...");
    const reasonSelect = getArbitraryRefundReasonSelect(page);
    await reasonSelect.scrollIntoViewIfNeeded();
    await reasonSelect.click();
    console.log("✅ Открыт список причин возврата");
    
    // Выбираем нужную причину
    const reasonText = "Корректировка стоимости (непримененный промокод)";
    // const reasonText = "Дополнительная скидка (компенсация)";
    
    const reasonOption = getRefundReasonOption(page, reasonText);
    await reasonOption.waitFor({ state: 'visible', timeout: 5000 });
    await reasonOption.click();
    console.log(`✅ Выбрана причина: ${reasonText}`);
    await page.waitForTimeout(1000);

  // 9. Заполнить заметку
  const commentField = page.locator('textarea[name="notes"]').first();
  await commentField.waitFor({ state: 'visible', timeout: 10000 });
  await commentField.fill('Тестовый комментарий для произвольного возврата');
  console.log("✅ Комментарий заполнен");

  // 10. Нажать кнопку "Отправить заявку менеджеру"
  await page.locator('button:has-text("Отправить заявку менеджеру")').first().click();
  console.log("✅ Заявка отправлена");

  // 11. Редактируем заявку
  const editButton = page.locator('button:has-text("Редактировать заявку")').first();
  await expect(editButton).toBeVisible({ timeout: 10000 });
  await editButton.scrollIntoViewIfNeeded();
  await editButton.click();
  console.log('✅ Нажали «Редактировать заявку»');
  await expect(editButton).not.toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(300);

  // 12. Изменяем комментарий
  await commentField.waitFor({ state: 'visible', timeout: 10000 });
  await commentField.fill('Туц туц туц');
  console.log('✅ Заметка изменена');
  // 13. Выбираем причину возврата
    await reasonSelect.scrollIntoViewIfNeeded();
    await reasonSelect.click();
    console.log("✅ Открыт список причин возврата");
    // Выбираем нужную причину
    const reasonText2 = "Дополнительная скидка (компенсация)";    
    const reasonOption2 = getRefundReasonOption(page, reasonText2);
    await reasonOption2.waitFor({ state: 'visible', timeout: 5000 });
    await reasonOption2.click();
    console.log(`✅ Выбрана причина: ${reasonText2}`);
    await page.waitForTimeout(1000);

  // 14. Нажать кнопку "Сохранить изменения"
  await page.locator('button:has-text("Сохранить изменения")').first().click();
  console.log('✅ Изменения сохранены');
  await page.waitForTimeout(800);
  
  // 15. Подтверждаем заявку 
  await page.locator('button:has-text("Подтвердить заявку")').first().click();
  console.log('✅ Заявка подтверждена');
  await page.waitForTimeout(1000);

  // 16. Заполняем заметки фин.менеджера
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

  // 17. Вводим сумму возврата
  const amountInput = page.locator('input[name="amount"]').first();
  await amountInput.waitFor({ state: 'visible', timeout: 10000 });
  await amountInput.fill('100');
  console.log('✅ Сумма возврата введена');
  await page.waitForTimeout(1000);

  // 18. Нажать кнопку Провести возврат ДС  
  await page.locator('button:has-text("Провести возврат ДС")').first().click();
  console.log('✅ Возврат ДС проведен');
  await page.waitForTimeout(1000);

  // 19. Подтверждаем возврат
  await getConfirmButton(page).click();
  console.log('✅ Возврат подтвержден');
  await page.waitForTimeout(1000);

  // 20. Нажимаем кнопку просмотреть ответ платежной системы
  await page.locator('button:has-text("Посмотреть ответ платежной системы")').first().click();
  await page.waitForTimeout(1000);

  async function checkPaymentResponse(page: Page): Promise<void> {
    const paymentResponse = page.getByText(/успешно завершено/i);
    await expect(paymentResponse).toBeVisible({ timeout: 5000 });
    console.log("✅ Возврат ДС успешно проведен");
  }
  await checkPaymentResponse(page);
  await page.waitForTimeout(5000);
});
