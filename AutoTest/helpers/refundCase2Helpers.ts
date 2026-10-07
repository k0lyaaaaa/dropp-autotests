import { Page, Locator, expect } from '@playwright/test';
import { openReturnsSection } from './createRefundAllReason';
import { openRecentlyOpenedDmsOrder } from './dmsOrders';
import { getRefundReasonOption, getRefundReasonSelects } from './refundReasons';
import { getDestructiveConfirmButton } from './confirmationButtons';
import {
  getRefundItemCheckboxes,
  getRefundItemsTable,
  isRefundItemChecked,
} from './refundItems';

// ==================== ТИПЫ ====================

export type AfterSendExpect = 'decline-visible' | 'manager-confirm-visible';

// ==================== ВЫБОР ПРИЧИНЫ ====================

export async function selectReturnReason(page: Page, reasonText: string) {
  console.log(`🔍 Выбираем причину возврата: ${reasonText}`);
  const reasonSelect = getRefundReasonSelects(page).first();
  await reasonSelect.scrollIntoViewIfNeeded();
  await reasonSelect.click();
  const option = getRefundReasonOption(page, reasonText);
  await option.waitFor({ state: 'visible', timeout: 5000 });
  await option.click();
  console.log(`✅ Выбрана причина: ${reasonText}`);
  await expect(option).not.toBeVisible({ timeout: 5000 });
}

// ==================== ВЫБОР СТРОКИ В ТАБЛИЦЕ ====================

export async function selectFirstAvailableRow(
  page: Page,
  refundContainer: Locator,
  _tableScroller: Locator,
  iteration: number
) {
  console.log(`\n🔄 Итерация ${iteration}: ищем активный товар...`);
  let selected = false;

  const checkboxes = await getRefundItemCheckboxes(refundContainer).all();
  for (const checkbox of checkboxes) {
    if (!(await checkbox.isDisabled()) && !(await isRefundItemChecked(checkbox))) {
      await checkbox.click();
      await expect(checkbox).toHaveAttribute('aria-checked', 'true');
      selected = true;
      console.log(`✅ Товар выбран`);
      break;
    }
  }

  if (!selected) {
    throw new Error(`❌ Не удалось выбрать активный чекбокс на итерации ${iteration}`);
  }
}

// ==================== ОТКРЫТИЕ ФОРМЫ ВОЗВРАТА ====================

export async function openRefundForm(
  page: Page,
  refundContainer: Locator,
  tableScroller: Locator,
  iteration: number
) {
  await selectFirstAvailableRow(page, refundContainer, tableScroller, iteration);
  const fillButton = page
    .locator('button:has-text("Заполнить заявку на возврат ДС")')
    .first();
  await expect(fillButton).toBeVisible({ timeout: 10000 });
  await fillButton.click();
  console.log('✅ Нажали кнопку "Заполнить заявку на возврат ДС"');
  await page.waitForTimeout(1000);
}

// ==================== МОДАЛКА ПОДТВЕРЖДЕНИЯ ОТКЛОНЕНИЯ ====================

export function confirmButtonInDeclineModal(page: Page): Locator {
  return getDestructiveConfirmButton(page);
}

// ==================== СОЗДАНИЕ И ОТПРАВКА ЗАЯВКИ ====================

export async function createRefundAndSendToManager(
  page: Page,
  refundContainer: Locator,
  tableScroller: Locator,
  afterSend: AfterSendExpect = 'decline-visible'
) {
  await openRefundForm(page, refundContainer, tableScroller, 1);
  await selectReturnReason(page, 'Не подошло');

  const commentField = page.locator('textarea[name="notes"]').first();
  await commentField.waitFor({ state: 'visible', timeout: 10000 });
  await commentField.fill('Тестовый комментарий для возврата');
  console.log('✅ Комментарий добавлен');

  const sendButton = page.locator('button:has-text("Отправить заявку менеджеру")').first();
  await expect(sendButton).toBeVisible({ timeout: 10000 });
  await sendButton.click();
  console.log('✅ Отправляем заявку менеджеру');

  if (afterSend === 'manager-confirm-visible') {
    await expect(
      page.getByRole('button', { name: 'Подтвердить заявку', exact: true }).first()
    ).toBeVisible({ timeout: 15000 });
  } else {
    await expect(
      page.getByRole('button', { name: 'Отклонить заявку', exact: true }).first()
    ).toBeVisible({ timeout: 15000 });
  }
  console.log('✅ Заявка отправлена менеджеру');
  await page.waitForTimeout(800);
}

// ==================== ПЕРЕОТКРЫТИЕ ЗАКАЗА ====================

export async function reopenOrderAndReturnsSection(
  page: Page,
  orderNumber: string
): Promise<{ refundContainer: Locator; tableScroller: Locator }> {
  await openRecentlyOpenedDmsOrder(page, orderNumber);
  console.log(`✅ Открыт заказ ${orderNumber}`);
  await page.waitForTimeout(2000);
  await openReturnsSection(page);

  const refundContainer = getRefundItemsTable(page);
  const tableScroller = refundContainer;
  await refundContainer.waitFor({ state: 'visible', timeout: 10000 });
  await tableScroller.waitFor({ state: 'visible', timeout: 10000 });
  return { refundContainer, tableScroller };
}

// ==================== ОТКЛОНЕНИЕ ЗАЯВКИ ====================

export async function declineRefundWithModalConfirm(page: Page) {
  const declineButton = page
    .getByRole('button', { name: 'Отклонить заявку', exact: true })
    .first();
  await expect(declineButton).toBeVisible({ timeout: 10000 });
  await declineButton.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await declineButton.click();
  console.log('✅ Нажали «Отклонить заявку»');

  const confirmInModal = confirmButtonInDeclineModal(page);
  await expect(confirmInModal).toBeVisible({ timeout: 10000 });
  await confirmInModal.click();
  console.log('✅ В модалке нажали «Подтвердить» (отклонение заявки)');
  await page.waitForTimeout(1500);

  await expect(declineButton).not.toBeVisible({ timeout: 5000 });
}

// ==================== ПРОВЕРКА 1: УДАЛЕНИЕ ====================

export async function testDeleteRefund(
  page: Page,
  refundContainer: Locator,
  tableScroller: Locator
) {
  await openRefundForm(page, refundContainer, tableScroller, 1);

  const deleteButton = page.locator('button:has-text("Удалить заявку")').first();
  await expect(deleteButton).toBeVisible({ timeout: 10000 });
  await deleteButton.click();
  const confirmDelete = getDestructiveConfirmButton(page);
  await expect(confirmDelete).toBeVisible({ timeout: 10000 });
  await confirmDelete.click();
  console.log('❌ Заявка удалена');

  await expect(deleteButton).not.toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(1000);
}

// ==================== ПРОВЕРКА 2: ОТПРАВКА → РЕДАКТИРОВАНИЕ → ОТКЛОНЕНИЕ ====================

export async function testCreateSendAndDecline(
  page: Page,
  refundContainer: Locator,
  tableScroller: Locator
) {
  await createRefundAndSendToManager(page, refundContainer, tableScroller);

  const editButton = page.locator('button:has-text("Редактировать заявку")').first();
  await expect(editButton).toBeVisible({ timeout: 10000 });
  await editButton.scrollIntoViewIfNeeded();
  await editButton.click();
  console.log('✅ Нажали «Редактировать заявку»');
  await expect(editButton).not.toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(300);

  const commentField = page.locator('textarea[name="notes"]').first();
  await commentField.waitFor({ state: 'visible', timeout: 10000 });
  await commentField.fill('Отредактированный тестовый комментарий для возврата');
  console.log('✅ Заметка изменена');

  await selectReturnReason(page, 'Отсутствует в наличии');

  const saveButton = page.locator('button:has-text("Сохранить изменения")').first();
  await expect(saveButton).toBeVisible({ timeout: 10000 });
  await saveButton.click();
  console.log('✅ Изменения сохранены');
  await page.waitForTimeout(800);

  await declineRefundWithModalConfirm(page);
}

// ==================== ПРОВЕРКА 3: ПОДТВЕРЖДЕНИЕ МЕНЕДЖЕРОМ → РЕДАКТИРОВАНИЕ → ОТКЛОНЕНИЕ ====================

export async function testSendConfirmByManagerAndDecline(
  page: Page,
  refundContainer: Locator,
  tableScroller: Locator
) {
  await createRefundAndSendToManager(page, refundContainer, tableScroller, 'manager-confirm-visible');

  const confirmByManager = page
    .getByRole('button', { name: 'Подтвердить заявку', exact: true })
    .first();
  await expect(confirmByManager).toBeVisible({ timeout: 10000 });
  await expect(confirmByManager).toBeEnabled();
  await confirmByManager.scrollIntoViewIfNeeded();
  await confirmByManager.click();
  console.log('✅ Нажали «Подтвердить заявку»');
  await page.waitForTimeout(1500);

  const editButton = page.locator('button:has-text("Редактировать заявку")').first();
  await expect(editButton).toBeVisible({ timeout: 10000 });
  await editButton.scrollIntoViewIfNeeded();
  await editButton.click();
  console.log('✅ Нажали «Редактировать заявку»');
  await expect(editButton).not.toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(300);

  const commentField = page.locator('textarea[name="notes"]').first();
  await commentField.waitFor({ state: 'visible', timeout: 10000 });
  await commentField.fill('Отредактированный комментарий (проверка 3)');
  console.log('✅ Заметка изменена');

  await selectReturnReason(page, 'Не тот товар/размер');

  const saveButton = page.locator('button:has-text("Сохранить изменения")').first();
  await expect(saveButton).toBeVisible({ timeout: 10000 });
  await saveButton.click();
  console.log('✅ Изменения сохранены');
  await page.waitForTimeout(800);

  await expect(
    page.getByRole('button', { name: 'Отклонить заявку', exact: true }).first()
  ).toBeVisible({ timeout: 15000 });
  await declineRefundWithModalConfirm(page);

  await expect(confirmByManager).not.toBeVisible({ timeout: 5000 });
}
