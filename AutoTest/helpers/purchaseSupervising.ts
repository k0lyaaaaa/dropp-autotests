import { expect, type Locator, type Page } from '@playwright/test';
import { AuthDMSAdmin } from './auth';
import { fillMerchantPriceInUsd } from './conductPurchaseDeal';
import {
  movedItemIds,
  openAwaitingPurchaseTab,
  openProcessingTab,
  purchaseOrderRows,
  searchPurchaseItems,
  takeRandomAwaitingItem,
} from './purchaseAwaiting';
import { expectItemOnPurchaseTab } from './purchaseCancellation';

/** Выше любого лимита выкупа: результат уходит в минус, и появляется «На согласование». */
const OVER_LIMIT_PRICE = '999999';

async function columnCell(page: Page, row: Locator, header: string): Promise<Locator> {
  const headers = page.getByRole('columnheader');
  const count = await headers.count();

  for (let index = 0; index < count; index += 1) {
    const name = (await headers.nth(index).innerText()).replace(/\s+/g, ' ').trim();
    if (name === header || name.startsWith(`${header} `)) {
      return row.getByRole('cell').nth(index);
    }
  }

  throw new Error(`Колонка «${header}» не найдена`);
}

/**
 * Черновик сделки с ценой выше лимита. Кнопка «На согласование» живёт
 * в колонке «Результат» и рисуется только при отрицательном результате.
 */
export async function sendOverLimitItemToSupervising(page: Page, orderNumber: string): Promise<void> {
  await fillMerchantPriceInUsd(page, orderNumber, 0, OVER_LIMIT_PRICE);

  const row = purchaseOrderRows(page, orderNumber).first();
  await expect(async () => {
    const result = await columnCell(page, row, 'Результат');
    await expect(result).toContainText(/[-−]/);
    await expect(result.getByRole('button', { name: 'На согласование', exact: true })).toBeVisible();
  }).toPass({ timeout: 60000 });

  const result = await columnCell(page, row, 'Результат');
  await result.getByRole('button', { name: 'На согласование', exact: true }).click();
  await expectItemOnPurchaseTab(page, orderNumber, 'На согласовании');
}

/** Товар не уходит на другую вкладку этим кликом, тост без стрелки: «IT-…: согласовано». */
const SUPERVISING_TOAST: Record<string, string> = {
  Одобрить: ': согласовано',
  Отклонить: ': отклонено',
  Отозвать: 'запрос на согласование отозван',
};

export async function decideSupervising(page: Page, orderNumber: string, decision: string): Promise<void> {
  const row = purchaseOrderRows(page, orderNumber).first();
  await row.getByRole('button', { name: decision, exact: true }).click();

  const toastText = SUPERVISING_TOAST[decision];
  if (toastText === undefined) return;

  await expect(
    page.locator('.Toastify__toast--success').filter({ hasText: toastText }).last(),
  ).toBeVisible({ timeout: 20000 });
}

/** Товар из «Ожидают» с ценой выше лимита. Новый заказ для этого не нужен. */
export async function putOverLimitItemOnSupervising(page: Page): Promise<string> {
  await AuthDMSAdmin(page);
  await openAwaitingPurchaseTab(page);
  const toastText = await takeRandomAwaitingItem(page);
  const [itemId] = movedItemIds(toastText);
  expect(itemId).toMatch(/\S/);

  await openProcessingTab(page);
  await searchPurchaseItems(page, itemId);
  await sendOverLimitItemToSupervising(page, itemId);
  return itemId;
}

/** Иконка рядом с Item ID. Текст живёт в тултипе, не в самой ячейке. */
export async function expectSupervisingIcon(page: Page, orderNumber: string, label: string): Promise<void> {
  await expectItemOnPurchaseTab(page, orderNumber, 'В обработке');
  const badge = purchaseOrderRows(page, orderNumber).getByLabel(label);
  await expect(badge).toBeVisible();
  await badge.hover();
  await expect(page.getByRole('tooltip')).toHaveText(label);
}
