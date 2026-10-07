import { expect, Page } from '@playwright/test';
import { expectItemOnPurchaseTab } from './purchaseCancellation';
import { purchaseOrderRows } from './purchaseAwaiting';
import {
  assignAnotherSpecialist,
  assignSpecialistMatching,
  readSpecialistField,
} from './purchaseSpecialist';

const DMS_BUYOUT = 'https://dev-dms.dropp.market/buyout';

/**
 * Список «В обработке» по умолчанию показывает сначала давно назначенные.
 * Переключателя «сначала новые» на экране нет, поэтому два свежих товара
 * одного человека видны вместе только по прямому адресу списка.
 */
export async function openMyNewestProcessing(page: Page): Promise<void> {
  const loaded = page.waitForResponse(
    (response) =>
      response.url().includes('/dms/tables/purchases') &&
      response.url().includes('assigned_to_user_id') &&
      response.url().includes('sortOrder=DESC') &&
      response.ok(),
  );
  await page.goto(`${DMS_BUYOUT}?tab=processing&sortOrder=DESC&hotFilter=my`);
  await loaded;
  await expect(page.getByRole('tab', { name: 'В обработке', exact: true })).toHaveAttribute(
    'data-state',
    'active',
  );
}

export async function selectPurchaseOrders(page: Page, orderNumbers: string[]): Promise<void> {
  for (const orderNumber of orderNumbers) {
    const row = purchaseOrderRows(page, orderNumber).first();
    await expect(row).toBeVisible();
    await row.getByRole('checkbox', { name: 'Выбрать строку' }).click();
  }
}

/**
 * Диалог запрета закрывается, а кнопка «Создать сделку» остаётся:
 * сделка не создана, выделение не сброшено.
 */
export async function expectCreateDealBlocked(
  page: Page,
  message: string,
  dismiss: 'Подтвердить' | 'Закрыть',
): Promise<void> {
  const create = page.getByRole('button', { name: /^Создать сделку \(\d+\)$/ });
  await expect(create).toBeVisible();
  await create.click();

  const dialog = page.getByRole('dialog').filter({ hasText: message });
  await expect(dialog).toBeVisible();
  const dismissButton = dialog.getByRole('button', { name: dismiss, exact: true });
  if ((await dismissButton.count()) > 1) await dismissButton.last().click();
  else await dismissButton.click();
  await expect(dialog).toBeHidden();
  await expect(create).toBeVisible();
}

export async function hidePurchaseItem(page: Page, orderNumber: string): Promise<void> {
  const row = purchaseOrderRows(page, orderNumber).first();
  await row.getByRole('checkbox', { name: 'Выбрать строку' }).click();
  await page.getByRole('button', { name: 'Скрыть из выкупа', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Вернуть его обратно из интерфейса нельзя');
  await dialog.getByRole('button', { name: 'Скрыть из выкупа', exact: true }).click();
  await expect(
    page.locator('.Toastify__toast--success').filter({ hasText: 'Скрыт 1 товар' }).last(),
  ).toBeVisible({ timeout: 20000 });
}

/**
 * Товар с открытым Preorder check нужно вернуть в «В обработке»
 * на текущего пользователя: кнопка «Создать сделку» есть только у своих строк.
 * Если исполнитель уже он, сначала назначаем другого — иначе смена не сработает.
 */
export async function bringPreorderItemBackToMe(
  page: Page,
  orderNumber: string,
  myField: string,
): Promise<void> {
  const current = await readSpecialistField(page, orderNumber);
  const alreadyMe =
    current !== '' && (current === myField || myField.includes(current) || current.includes(myField));

  if (alreadyMe) {
    await assignAnotherSpecialist(page, orderNumber);
    await expectItemOnPurchaseTab(page, orderNumber, 'В обработке');
  }

  await assignSpecialistMatching(page, orderNumber, myField);
  await expectItemOnPurchaseTab(page, orderNumber, 'В обработке');
}
