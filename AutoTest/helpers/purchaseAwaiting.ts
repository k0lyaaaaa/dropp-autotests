import { expect, type Locator, type Page } from '@playwright/test';
import { AuthDMSAdmin } from './auth';
import { openPurchaseSection } from './openPurchaseSection';

const MOVED_TO_PROCESSING = /–>\s*В обработке/;

/**
 * Строки таблицы «Выкуп», в которых есть ссылка на конкретный заказ.
 * Фильтр по строке, а не по всей странице: на экране могут быть чужие заказы,
 * и считать кнопки «Взять один» по всей таблице было бы ошибкой.
 */
export function purchaseOrderRows(page: Page, orderNumber: string): Locator {
  return page.getByRole('row').filter({ hasText: orderNumber });
}

export async function openAwaitingPurchaseTab(page: Page): Promise<void> {
  await openPurchaseSection(page);

  const awaitingTab = page.getByRole('tab', { name: 'Ожидают' });
  await awaitingTab.click();
  await expect(awaitingTab).toHaveAttribute('data-state', 'active');
  await expect(page.getByRole('columnheader', { name: 'В обработку' })).toBeVisible();
}

/**
 * Поиск в тулбаре таблицы дебаунсится на 500 мс и только потом попадает в URL.
 * Ждём URL, чтобы перезагрузка страницы не сбрасывала фильтр.
 */
export async function searchPurchaseItems(page: Page, query: string): Promise<void> {
  const input = page.locator('[data-slot="table-toolbar-search"] input');
  await input.waitFor({ state: 'visible', timeout: 15000 });

  const listLoaded = page.waitForResponse(
    (response) =>
      response.url().includes('/dms/tables/purchases') &&
      response.url().includes(encodeURIComponent(query)) &&
      response.ok()
  );
  await input.fill(query);
  await listLoaded;
}

/**
 * Товар попадает в «Ожидают» не в ту же миллисекунду, что оплата.
 * Перезагружаем список, пока не увидим ровно ожидаемое число строк заказа.
 */
export async function expectPurchaseOrderRows(
  page: Page,
  orderNumber: string,
  count: number
): Promise<void> {
  const rows = purchaseOrderRows(page, orderNumber);

  await expect(async () => {
    if ((await rows.count()) !== count) {
      await page.reload();
    }
    await expect(rows).toHaveCount(count, { timeout: 15000 });
  }).toPass({ timeout: 180000 });
}

export async function openProcessingTab(page: Page): Promise<void> {
  const processingTab = page.getByRole('tab', { name: 'В обработке' });
  await processingTab.click();
  await expect(processingTab).toHaveAttribute('data-state', 'active');
}

async function readMovedToast(page: Page): Promise<string> {
  const toast = page.locator('.Toastify__toast--success').filter({ hasText: MOVED_TO_PROCESSING }).last();
  await expect(toast).toBeVisible({ timeout: 20000 });
  return (await toast.innerText()).replace(/\s+/g, ' ').trim();
}

/** Id из тоста «IT-1, IT-2 –> В обработке». */
export function movedItemIds(toastText: string): string[] {
  const [idsPart] = toastText.split('–>');
  return idsPart
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

/** Кнопка «Взять один» у товара, который уже лежит в «Ожидают». Тестовый заказ выключен. */
async function chooseEnabledTakeOne(page: Page): Promise<Locator> {
  const buttons = page.getByRole('button', { name: 'Взять один' });
  await expect(buttons.first()).toBeVisible({ timeout: 20000 });

  const enabledIndexes: number[] = [];
  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    if (await buttons.nth(index).isEnabled()) enabledIndexes.push(index);
  }
  if (enabledIndexes.length === 0) throw new Error('В «Ожидают» нет товара, который можно взять');

  const index = enabledIndexes[Math.floor(Math.random() * enabledIndexes.length)];
  return buttons.nth(index);
}

/**
 * Уже лежащий в «Ожидают» товар, не новый заказ. Строку не уводим в обработку.
 * Ссылка рядом с id — иконка без текста, сам номер написан на кнопке.
 */
export async function readRandomAwaitingItemId(page: Page): Promise<string> {
  const button = await chooseEnabledTakeOne(page);
  const row = button.locator('xpath=ancestor::*[@role="row"][1]');
  const itemId = (await row.getByRole('button', { name: /[A-Z0-9]+-\d+/ }).first().innerText())
    .replace(/\s+/g, ' ')
    .trim();
  expect(itemId).toMatch(/\S/);
  return itemId;
}

/** Уже лежащий в «Ожидают» товар, не новый заказ. Тестовые строки брать нельзя. */
export async function takeRandomAwaitingItem(page: Page): Promise<string> {
  // Список после открытия вкладки перерисовывается, клик по строке может не дойти.
  await expect(async () => {
    const toast = page.locator('.Toastify__toast--success').filter({ hasText: MOVED_TO_PROCESSING }).last();
    if (!(await toast.isVisible())) {
      await (await chooseEnabledTakeOne(page)).click();
      await confirmManualTakeIfAsked(page);
    }
    await expect(toast).toBeVisible();
  }).toPass({ timeout: 60000 });

  return readMovedToast(page);
}

async function confirmManualTakeIfAsked(page: Page): Promise<void> {
  const manualConfirm = page.getByRole('dialog');
  const needsConfirm = await Promise.race([
    manualConfirm.waitFor({ state: 'visible', timeout: 4000 }).then(() => true),
    page
      .locator('.Toastify__toast--success')
      .filter({ hasText: MOVED_TO_PROCESSING })
      .waitFor({ state: 'visible', timeout: 20000 })
      .then(() => false),
  ]).catch(() => false);

  if (needsConfirm) {
    await manualConfirm.getByRole('button', { name: 'В обработку', exact: true }).click();
  }
}

export async function takeOneItem(page: Page, orderNumber: string): Promise<string> {
  const row = purchaseOrderRows(page, orderNumber).first();
  await row.getByRole('button', { name: 'Взять один' }).click();
  await confirmManualTakeIfAsked(page);
  return readMovedToast(page);
}

export async function openRepurchaseTab(page: Page): Promise<void> {
  await openPurchaseSection(page);
  const tab = page.getByRole('tab', { name: 'Перевыкуп', exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute('data-state', 'active');
}

/** После ошибки контроллинга товар появляется в «Перевыкуп» не мгновенно. */
export async function expectItemOnRepurchaseTab(page: Page, itemId: string): Promise<void> {
  await searchPurchaseItems(page, itemId);
  const rows = purchaseOrderRows(page, itemId);

  await expect(async () => {
    if ((await rows.count()) !== 1) await page.reload();
    await expect(rows).toHaveCount(1, { timeout: 15000 });
    await expect(rows).toContainText('Контроллинг: Неверный товар');
  }).toPass({ timeout: 180000 });
}

export async function takeAllItemsFromOrder(page: Page, orderNumber: string): Promise<string> {
  const row = purchaseOrderRows(page, orderNumber).first();
  await row.getByRole('button', { name: /Взять все из заказа/ }).click();
  return readMovedToast(page);
}

/** Уже оплаченный заказ: найти в «Ожидают» и взять один товар в «В обработке». */
export async function takeSearchedOrderIntoProcessing(page: Page, orderNumber: string): Promise<void> {
  await openAwaitingPurchaseTab(page);
  await searchPurchaseItems(page, orderNumber);
  await expectPurchaseOrderRows(page, orderNumber, 1);
  await takeOneItem(page, orderNumber);
  await openProcessingTab(page);
  await expectPurchaseOrderRows(page, orderNumber, 1);
}

/** Товар из «Ожидают» сразу оказывается в «В обработке» и назначен на текущего пользователя. */
export async function putFreshItemInProcessing(page: Page): Promise<string> {
  await AuthDMSAdmin(page);
  await openAwaitingPurchaseTab(page);
  const toastText = await takeRandomAwaitingItem(page);
  const [itemId] = movedItemIds(toastText);
  expect(itemId).toMatch(/\S/);

  await openProcessingTab(page);
  await searchPurchaseItems(page, itemId);
  await expectPurchaseOrderRows(page, itemId, 1);
  return itemId;
}
