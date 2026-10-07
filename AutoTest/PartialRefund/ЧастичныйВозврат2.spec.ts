import { test, Page, Locator, expect, request } from "@playwright/test";
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

  

test("Создание произвольного возврата", async ({ page, request }) => {
    test.setTimeout(600000); // до 10 минут — возвратов может быть много
  
    //   // Создаем заказ
    //   await createOrderWithMultipleItems(request, 1);
    //   await page.waitForTimeout(2000);
  
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

    // 8. Удаляем произвольный возврат 
    await page.locator('button:has-text("Удалить заявку")').first().click();
    await getDestructiveConfirmButton(page).click();
    console.log("✅ Произвольный возврат удален");
    await page.waitForTimeout(1000);

    // 9. Возвращаемся обратно в заказ
    await openOrderAndReturnsSection(page, savedOrderNumber);
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
    await expect(refundButton).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(1000);

 
  // 36. Нажимаем кнопку просмотреть ответ платежной системы
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