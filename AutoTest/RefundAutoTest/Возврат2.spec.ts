import { test, Page, Locator, expect } from "@playwright/test";
import { AuthDMSFin, loginAsUser } from "../helpers/auth";
import { SaveLastOrder, savedOrderNumber } from "../helpers/saveLastOrder";
import { openReturnsSection } from "../helpers/createRefundAllReason";
import { getDmsOrderSearchInput, openDmsOrder } from "../helpers/dmsOrders";
import {
  selectReturnReason,
  selectFirstAvailableRow,
  openRefundForm,
  confirmButtonInDeclineModal,
  createRefundAndSendToManager,
  reopenOrderAndReturnsSection,
  declineRefundWithModalConfirm,
  testDeleteRefund,
  testCreateSendAndDecline,
  testSendConfirmByManagerAndDecline,
} from "../helpers/refundCase2Helpers";
import { getRefundItemsTable } from "../helpers/refundItems";

// ==================== ОСНОВНОЙ ТЕСТ ====================

test("Создание возврата по последнему купленному заказу", async ({ page }) => {
  test.setTimeout(600000);

  // 1. Авторизация в UI
  await loginAsUser(page);

  // 2. Получаем номер последнего заказа
  await SaveLastOrder(page);
  console.log(`📦 Номер заказа из UI: ${savedOrderNumber}`);

  // 3. Авторизация в админке
  await AuthDMSFin(page);
  await page.waitForTimeout(1800);

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
  console.log('✅ Открыт раздел возвратов');

  // 7. Ждём загрузки контейнера и скроллера
  let refundContainer = getRefundItemsTable(page);
  await refundContainer.waitFor({ state: "visible", timeout: 10000 });
  console.log("✅ Контейнер возвратов загружен");

  let tableScroller = refundContainer;

  // ==================== ВЫПОЛНЕНИЕ ПРОВЕРОК ====================

await test.step("Проверка 1: удаление заявки", async () => {
  await testDeleteRefund(page, refundContainer, tableScroller);
});

({ refundContainer, tableScroller } = await reopenOrderAndReturnsSection(
  page,
  savedOrderNumber
));

await test.step(
  "Проверка 2: создание → причина → заметка → отправка → редактирование → другая причина → сохранение → отклонение",
  async () => {
    await testCreateSendAndDecline(page, refundContainer, tableScroller);
  }
);

({ refundContainer, tableScroller } = await reopenOrderAndReturnsSection(
  page,
  savedOrderNumber
));

await test.step(
  "Проверка 3: отправка → «Подтвердить заявку» → редактирование → «Отклонить заявку» → модалка",
  async () => {
    await testSendConfirmByManagerAndDecline(
      page,
      refundContainer,
      tableScroller
    );
  }

  
)

console.log(`Тест проверяет по следующим пунктам:
       8. Заметки прописываются
       9. Удаление заявки
      10. Отклоняется заявка после Отправка заявки Менеджеру
      11. Отклоняется заявка после подтверждения Менеджером`);
});