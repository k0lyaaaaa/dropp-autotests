// arbitraryRefundFull.spec.ts
import { test, expect, Page } from "@playwright/test";
import { AuthDMSFin, loginAsUser } from "../helpers/auth";
import { SaveLastOrder, savedOrderNumber } from "../helpers/saveLastOrder";
import { createOrderWithMultipleItems } from '../helpers/api/createDealBack';
import { openReturnsSection } from "../helpers/createRefundAllReason";
import { confirmButtonInDeclineModal } from "../helpers/refundCase2Helpers";
import {
  getDmsOrderSearchInput,
  openDmsOrder,
  openRecentlyOpenedDmsOrder,
} from "../helpers/dmsOrders";
import {
  getArbitraryRefundReasonSelect,
  getRefundReasonOption,
} from "../helpers/refundReasons";
import {
  getConfirmButton,
  getDestructiveConfirmButton,
} from "../helpers/confirmationButtons";
import {
  getRefundAmountExceedsOrderError,
  getRefundAmountInvalidError,
} from "../helpers/refundValidation";

export async function openOrderAndReturnsSection(
    page: Page,
    orderNumber: string
  ): Promise<void> {
    await openRecentlyOpenedDmsOrder(page, orderNumber);
    console.log(`✅ Открыт заказ ${orderNumber}`);
    await page.waitForTimeout(2000);
    await openReturnsSection(page);
  }

  let optionIdx = 0;

test.describe.serial("Полный сценарий произвольного возврата", () => {
  
  test.setTimeout(600000);

  test("Часть 1: Позитивный сценарий", async ({ page, request }) => {
    console.log("\n" + "=".repeat(60));
    console.log("🏁 ЗАПУСК ЧАСТИ 1: Позитивный сценарий");
    console.log("=".repeat(60));
    
    // Весь код из вашего первого теста
    await createOrderWithMultipleItems(request, 1);
    await page.waitForTimeout(2000);
    await loginAsUser(page);
    await SaveLastOrder(page);
    console.log(`📦 Номер заказа из UI: ${savedOrderNumber}`);
    await AuthDMSFin(page);
    await page.waitForTimeout(3000);
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
    
    await getRefundReasonOption(page, reasonText).click();
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
    await getRefundReasonOption(page, reasonText2).click();
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

  async function checkPaymentResponse(page: any): Promise<void> {
    const paymentResponse = page.getByText(/успешно завершено/i);
    await expect(paymentResponse).toBeVisible({ timeout: 5000 });
    console.log("✅ Возврат ДС успешно проведен");
  }
  await checkPaymentResponse(page);
  await page.waitForTimeout(5000);

    
    console.log("\n✅ ЧАСТЬ 1: Позитивный сценарий - УСПЕШНО\n");
  });

  test("Часть 2: Комплексный сценарий с удалением и отклонением", async ({ page, request }) => {
    console.log("\n" + "=".repeat(60));
    console.log("🏁 ЗАПУСК ЧАСТИ 2: Комплексный сценарий");
    console.log("=".repeat(60));
    
    // Весь код из вашего второго теста
    await page.waitForTimeout(2000);
    await loginAsUser(page);
    await SaveLastOrder(page);
    console.log(`📦 Номер заказа из UI: ${savedOrderNumber}`);
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

  // 8. Удаляем произвольный возврат 
  await page.locator('button:has-text("Удалить заявку")').first().click();
  await getDestructiveConfirmButton(page).click();
  console.log("✅ Произвольный возврат удален");
  await page.waitForTimeout(1000);

  // 9. Возвращаемся обратно в заказ
  await openOrderAndReturnsSection(page, savedOrderNumber);
  await page.waitForTimeout(1000);
  console.log("✅ Возвращаемся обратно в заказ");

  // 10. Создаем произвольный возврат
  await page.locator('button:has-text("Заполнить заявку на произвольный возврат")') .first().click();
  console.log("✅ Произвольный возврат создан");

  // 11. Выбираем причину возврата
  const reasonSelect = getArbitraryRefundReasonSelect(page);
  await reasonSelect.waitFor({ state: "visible", timeout: 10000 });
  await reasonSelect.scrollIntoViewIfNeeded();
  await reasonSelect.click();
  console.log("✅ Открыт список причин возврата");
  const reasonText = "Дополнительная скидка (компенсация)";
  await getRefundReasonOption(page, reasonText).click();
  console.log(`✅ Выбрана причина: ${reasonText}`);
  await page.waitForTimeout(1000);

  // 12. Отправляем заявку менеджеру
  await page.locator('button:has-text("Отправить заявку менеджеру")').first().click();
  console.log("✅ Заявка отправлена");
  await page.waitForTimeout(1000);

  // 13. Отклоняем заявку
  await page.locator('button:has-text("Отклонить заявку")').first().click();
  const confirmInModal = confirmButtonInDeclineModal(page);
  await expect(confirmInModal).toBeVisible({ timeout: 10000 });
  await confirmInModal.click();
  await page.waitForTimeout(1500);
  console.log("✅ Заявка отклонена");
  await page.waitForTimeout(1000);

  // 14. Возвращаемся обратно в заказ
  await openOrderAndReturnsSection(page, savedOrderNumber);
  console.log("✅ Возвращаемся обратно в заказ");
  
  // 15. Создаем произвольный возврат
  await page.locator('button:has-text("Заполнить заявку на произвольный возврат")') .first().click();
  console.log("✅ Произвольный возврат создан");

  // 16. Выбираем причину возврата
  const reasonSelect2 = getArbitraryRefundReasonSelect(page);
  await reasonSelect2.waitFor({ state: "visible", timeout: 10000 });
  await reasonSelect2.scrollIntoViewIfNeeded();
  await reasonSelect2.click();
  console.log("✅ Открыт список причин возврата");
  const reasonText2 = "Корректировка стоимости (непримененный промокод)";
  await getRefundReasonOption(page, reasonText2).click();
  console.log(`✅ Выбрана причина: ${reasonText2}`);
  await page.waitForTimeout(1000);

  // 17. Отправляем заявку менеджеру
  await page.locator('button:has-text("Отправить заявку менеджеру")').first().click();
  console.log("✅ Заявка отправлена");
  await page.waitForTimeout(1000);

  // 18. Подтверждаем заявку
  await page.locator('button:has-text("Подтвердить заявку")').first().click();
  console.log("✅ Заявка подтверждена");
  await page.waitForTimeout(1000);

  // 19. Отклоняем заявку
  await page.locator('button:has-text("Отклонить заявку")').first().click();
  await expect(confirmInModal).toBeVisible({ timeout: 10000 });
  await confirmInModal.click(); 
  await page.waitForTimeout(1500);
  console.log("✅ Заявка отклонена");
  await page.waitForTimeout(1000);

  // 20. Возвращаемся обратно в заказ
  await openOrderAndReturnsSection(page, savedOrderNumber);
  console.log("✅ Возвращаемся обратно в заказ");
  
  // 21. Создаем произвольный возврат
  await page.locator('button:has-text("Заполнить заявку на произвольный возврат")') .first().click();
  console.log("✅ Произвольный возврат создан");

  // 22. Выбираем причину возврата
  const reasonSelect3 = getArbitraryRefundReasonSelect(page);
  await reasonSelect3.waitFor({ state: "visible", timeout: 10000 });
  await reasonSelect3.scrollIntoViewIfNeeded();
  await reasonSelect3.click();
  console.log("✅ Открыт список причин возврата");
  const reasonText3 = "Дополнительная скидка (компенсация)";
  await getRefundReasonOption(page, reasonText3).click();
  console.log(`✅ Выбрана причина: ${reasonText3}`);
  await page.waitForTimeout(1000);

  // 23. Отправляем заявку менеджеру
  await page.locator('button:has-text("Отправить заявку менеджеру")').first().click();
  console.log("✅ Заявка отправлена");
  await page.waitForTimeout(1000);

  // 24. Подтверждаем заявку
  await page.locator('button:has-text("Подтвердить заявку")').first().click();
  console.log("✅ Заявка подтверждена");
  await page.waitForTimeout(1000);

  // 25. Редактируем заявку
  await page.locator('button:has-text("Редактировать заявку")').first().click();
  console.log("✅ Заявка отредактирована");
  await page.waitForTimeout(1000);

  // 26. Выбираем причину возврата
  const reasonSelect4 = getArbitraryRefundReasonSelect(page);
  await reasonSelect4.waitFor({ state: "visible", timeout: 10000 });
  await reasonSelect4.scrollIntoViewIfNeeded();
  await reasonSelect4.click();
  console.log("✅ Открыт список причин возврата");
  const reasonText4 = "Корректировка стоимости (непримененный промокод)";
  await getRefundReasonOption(page, reasonText4).click();
  console.log(`✅ Выбрана причина: ${reasonText4}`);
  await page.waitForTimeout(1000);

  // 27. Заполняем заметки
  const commentField = page.locator('textarea[name="notes"]').first();
  await commentField.waitFor({ state: "visible", timeout: 10000 });
  await commentField.fill('Тестовый комментарий для произвольного возврата');
  console.log("✅ Комментарий заполнен");
  await page.waitForTimeout(1000);

  // 28. Сохраняем изменения
  await page.locator('button:has-text("Сохранить изменения")').first().click();
  console.log("✅ Изменения сохранены");
  await page.waitForTimeout(1000);

  const amountInput = page.locator('input[name="amount"]').first();
  const refundButton = page.locator('button:has-text("Провести возврат ДС")').first();

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
  

  // 29. Проверяем возврат больше суммы заказа
  await amountInput.fill("999999999999");
  await clickRefundAndConfirm();
  await expect(getRefundAmountExceedsOrderError(page)).toBeVisible({ timeout: 5000 });
  console.log("✅ Проверка: сумма сверх баланса → ошибка");

  // 30. Проверяем возврат с символами
  await amountInput.fill('abc!@#');
  await refundButton.click();
  await expect(getRefundAmountInvalidError(page)).toBeVisible({ timeout: 5000 });

  // 31. Проверяем возврат с кириллицей
  await amountInput.fill('сто тысяч');
  await refundButton.click();
  await expect(getRefundAmountInvalidError(page)).toBeVisible({ timeout: 5000 });

  // 32. Проверяем возврат с пустым полем
  await amountInput.fill('');
  await refundButton.click();
  await expect(getRefundAmountInvalidError(page)).toBeVisible({ timeout: 5000 });

  // 34. Проверяем возврат с суммой меньше 0
  await amountInput.fill('-1');
  await refundButton.click();
  await expect(getRefundAmountInvalidError(page)).toBeVisible({ timeout: 5000 });

  // 35. Осуществляем частичный возврат
  await amountInput.fill('500');
  await clickRefundAndConfirm();
  await page.waitForTimeout(3000);    

  // 36. Нажимаем кнопку просмотреть ответ платежной системы
    await page.locator('button:has-text("Посмотреть ответ платежной системы")').first().click();
    await page.waitForTimeout(1000);
  
    async function checkPaymentResponse(page: Page): Promise<void> {
      const paymentResponse = page.getByText(/успешно завершено/i);
      await expect(paymentResponse).toBeVisible({ timeout: 5000 });
      console.log("✅ Возврат ДС успешно проведен");
    }
    await checkPaymentResponse(page);

    await page.waitForTimeout(3000);
    console.log("\n✅ ЧАСТЬ 2: Комплексный сценарий - УСПЕШНО\n");
  });


});