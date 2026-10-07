import { expect, Locator, Page } from '@playwright/test';
import { purchaseOrderRows, searchPurchaseItems } from './purchaseAwaiting';

async function columnCell(page: Page, row: Locator, header: string): Promise<Locator> {
  const headers = page.getByRole('columnheader');
  const count = await headers.count();

  for (let index = 0; index < count; index += 1) {
    const name = (await headers.nth(index).innerText()).replace(/\s+/g, ' ').trim();
    if (name === header || name.startsWith(`${header} `)) return row.getByRole('cell').nth(index);
  }

  throw new Error(`Колонка «${header}» не найдена`);
}

async function expectMovedToast(page: Page, tab: string): Promise<void> {
  await expect(page.locator('.Toastify__toast--success').filter({ hasText: tab }).last()).toBeVisible({
    timeout: 20000,
  });
}

export async function expectItemOnPurchaseTab(
  page: Page,
  orderNumber: string,
  tabName: string
): Promise<void> {
  const tab = page.getByRole('tab', { name: tabName, exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute('data-state', 'active');
  // Вкладка сортирует старые строки первыми, свежий товар на первой странице не виден.
  await searchPurchaseItems(page, orderNumber);

  const row = purchaseOrderRows(page, orderNumber);
  await expect(async () => {
    if ((await row.count()) !== 1) {
      await page.reload();
      await searchPurchaseItems(page, orderNumber);
    }
    await expect(row).toHaveCount(1, { timeout: 15000 });
  }).toPass({ timeout: 180000 });
}

/** Чекбокс строки, затем «На отмену» и подтверждение. Товар уходит в «На отмену». */
export async function markItemForCancellation(page: Page, orderNumber: string): Promise<void> {
  const row = purchaseOrderRows(page, orderNumber).first();
  await row.getByRole('checkbox', { name: 'Выбрать строку' }).click();
  await page.getByRole('button', { name: 'На отмену', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Отправить 1 товар на отмену?');
  await dialog.getByRole('button', { name: 'Подтвердить', exact: true }).click();
  await expectMovedToast(page, 'На отмену');
}

async function pickInColumn(page: Page, row: Locator, header: string, option: string): Promise<void> {
  const cell = await columnCell(page, row, header);
  await cell.scrollIntoViewIfNeeded();
  await cell.getByRole('combobox').click();
  await page.getByRole('option', { name: option, exact: true }).click();
  await expect(cell.getByRole('combobox')).toContainText(option);
}

/**
 * На «На отмену» обе причины обязательны: без «Причина отмены» кнопка
 * «Отменить» выключена. «Причина отмены (клиенту)» по умолчанию уже
 * «Out of stock», но тест выбирает её явно — это и есть проверяемое действие.
 */
export async function cancelItemWithReasons(
  page: Page,
  orderNumber: string,
  clientReason: string
): Promise<void> {
  const row = purchaseOrderRows(page, orderNumber).first();
  await pickInColumn(page, row, 'Причина отмены', 'Out of stock');
  await pickInColumn(page, row, 'Причина отмены (клиенту)', clientReason);

  await row.getByRole('button', { name: 'Отменить', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Подтвердить отмену товара?');
  await dialog.getByRole('button', { name: 'Отменить', exact: true }).click();
  await expectMovedToast(page, 'Отмененные');
}

/** «Вернуть» на «На отмену» срабатывает сразу, без диалога, и уводит товар на исходную вкладку. */
export async function returnItemFromCancellation(page: Page, orderNumber: string): Promise<void> {
  const row = purchaseOrderRows(page, orderNumber).first();
  await row.getByRole('button', { name: 'Вернуть', exact: true }).click();
  // Товар остаётся в интерфейсе, поэтому тост без стрелки: «IT-…: отметка об отмене снята».
  await expect(
    page.locator('.Toastify__toast--success').filter({ hasText: 'отметка об отмене снята' }).last(),
  ).toBeVisible({ timeout: 20000 });
}

export async function expectItemAbsentFromPurchaseTab(
  page: Page,
  orderNumber: string,
  tabName: string,
): Promise<void> {
  const tab = page.getByRole('tab', { name: tabName, exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute('data-state', 'active');
  await searchPurchaseItems(page, orderNumber);

  const row = purchaseOrderRows(page, orderNumber);
  await expect(async () => {
    if ((await row.count()) !== 0) {
      await page.reload();
      await searchPurchaseItems(page, orderNumber);
    }
    await expect(row).toHaveCount(0, { timeout: 15000 });
  }).toPass({ timeout: 180000 });
}
