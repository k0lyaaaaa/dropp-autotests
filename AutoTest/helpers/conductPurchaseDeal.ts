import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { createOrderWithMultipleItems } from './api/createDealBack';
import { AuthDMSAdmin } from './auth';
import {
  expectPurchaseOrderRows,
  movedItemIds,
  openAwaitingPurchaseTab,
  openProcessingTab,
  purchaseOrderRows,
  searchPurchaseItems,
  takeAllItemsFromOrder,
  takeRandomAwaitingItem,
} from './purchaseAwaiting';

/**
 * Ячейка колонки по заголовку, а не «первый инпут строки».
 * В «В обработке» первый инпут — «Исполнитель», и цена, введённая в него,
 * уезжает не в «Цену у мерчанта».
 */
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

const PRODUCT_LINK = 'https://example.com/product';
const DOCUMENT_LINK = 'https://example.com/receipt';
const BOUGHT_SIZE = 'M';
const MERCHANT_ORDER_NUMBER = 'MERCH-1001';
const ADDRESS_LINE_2 = 'Suite 2';

/** Подпись схемы в списке: «AM Direct» плюс иконка типа отправки. */
const AM_DIRECT_SCHEME = /am\s*direct/i;

export type DealPanelOptions = {
  skipMerchant?: boolean;
  skipAccount?: boolean;
  skipMerchantOrder?: boolean;
  /**
   * «AM Direct» — прямая доставка в Армению, цепочки МФ нет.
   * Для «Отправлений до МФ» нужна любая другая схема.
   */
  excludeAmDirect?: boolean;
};

function dealPanel(page: Page): Locator {
  return page.locator('[data-slot="sheet-content"]');
}

async function chooseNamedOption(page: Page, optionName: string): Promise<void> {
  await page.getByRole('option', { name: optionName, exact: true }).click();
}

async function chooseFirstAutocompleteOption(page: Page): Promise<void> {
  const option = page.locator('[data-slot="autocomplete-list"] button').first();
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.click();
}

/**
 * Цена без валюты на бэкенд не уходит: ячейка сохраняет пару
 * «сумма + валюта» и только тогда создаёт сделку и открывает панель.
 */
function orderRow(page: Page, orderNumber: string, rowIndex: number): Locator {
  return purchaseOrderRows(page, orderNumber).nth(rowIndex);
}

export async function fillMerchantPriceInUsd(
  page: Page,
  orderNumber: string,
  rowIndex = 0,
  amount = '100'
): Promise<void> {
  // После сохранения список перерисовывается, строка отцепляется — ищем её заново.
  await expect(async () => {
    const row = orderRow(page, orderNumber, rowIndex);
    const priceCell = await columnCell(page, row, 'Цена у мерчанта');
    const priceInput = priceCell.locator('input');
    await priceInput.scrollIntoViewIfNeeded();
    await priceInput.fill(amount);

    await priceCell.locator('[data-slot="select-trigger"]').click();
    await chooseNamedOption(page, 'USD');
  }).toPass({ timeout: 20000 });

  await expect(
    page.locator('.Toastify__toast--success').filter({ hasText: ': сохранено' }).last(),
  ).toBeVisible({ timeout: 20000 });
  await expect(dealPanel(page).getByRole('button', { name: 'Провести', exact: true })).toBeVisible({
    timeout: 20000,
  });
}

export async function fillProductLink(
  page: Page,
  orderNumber: string,
  rowIndex = 0
): Promise<void> {
  await expect(async () => {
    const row = orderRow(page, orderNumber, rowIndex);
    const linkInput = (await columnCell(page, row, 'Ссылка')).locator('input');
    await linkInput.scrollIntoViewIfNeeded();
    await linkInput.fill(PRODUCT_LINK);
    await expect(linkInput).toHaveValue(PRODUCT_LINK);
    await linkInput.press('Enter');
  }).toPass({ timeout: 20000 });
}

/** Размер можно сохранить только после появления позиции сделки. */
export async function fillBoughtSize(
  page: Page,
  orderNumber: string,
  rowIndex = 0
): Promise<void> {
  await expect(async () => {
    const row = orderRow(page, orderNumber, rowIndex);
    const saved = row.getByText(BOUGHT_SIZE, { exact: true });
    if ((await saved.count()) === 0) {
      const sizeInput = row.getByRole('textbox', { name: 'Выкупленный размер' });
      await sizeInput.scrollIntoViewIfNeeded();
      await expect(sizeInput).toBeEnabled();
      await sizeInput.fill(BOUGHT_SIZE);
      await row.getByRole('button', { name: 'Сохранить' }).click();
    }
    await expect(orderRow(page, orderNumber, rowIndex).getByText(BOUGHT_SIZE, { exact: true })).toBeVisible();
  }).toPass({ timeout: 20000 });
}

/**
 * Кнопка есть только у товара того же заказа, пока открыта сделка другого товара.
 * Пока его не добавили, сохранение цены создало бы вторую сделку.
 */
export async function addItemToOpenDeal(
  page: Page,
  orderNumber: string,
  rowIndex = 0
): Promise<void> {
  const row = orderRow(page, orderNumber, rowIndex);
  const addButton = row.getByRole('button', { name: 'Добавить к сделке' });
  await addButton.scrollIntoViewIfNeeded();
  await addButton.click();
  await expect(row.getByRole('textbox', { name: 'Выкупленный размер' })).toBeEnabled({
    timeout: 20000,
  });
}

async function pickAutocomplete(page: Page, panel: Locator, name: string, query?: string): Promise<void> {
  const field = panel.getByRole('combobox', { name, exact: true });
  await expect(field).toBeEnabled();
  await field.click();
  if (query) await field.fill(query);
  await chooseFirstAutocompleteOption(page);
}

/**
 * «Добавить» рядом с полем мерчанта. После «Создать» фронт сам
 * подставляет этого мерчанта в черновик.
 */
export async function createAndSelectMerchant(page: Page, merchantName: string): Promise<void> {
  const panel = dealPanel(page);
  await panel.getByRole('button', { name: 'Добавить мерчанта', exact: true }).click();

  const form = page.locator('[data-slot="sheet-content"]').filter({ hasText: 'Добавить мерчанта' });
  await form.getByRole('textbox', { name: 'Название' }).fill(merchantName);

  const merchantSaved = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      response.url().includes('/dms/deals/') &&
      response.ok()
  );
  await form.getByRole('button', { name: 'Создать', exact: true }).click();
  await merchantSaved;
  await expect(panel.getByRole('combobox', { name: 'Мерчант', exact: true })).toHaveValue(
    new RegExp(merchantName)
  );
}

/**
 * Форма «Добавить аккаунт» рядом с полем аккаунта. После «Создать»
 * фронт сам выбирает этот аккаунт в черновике.
 */
export async function createAndSelectAccount(page: Page, login: string): Promise<void> {
  const panel = dealPanel(page).filter({ has: page.getByRole('button', { name: 'Провести' }) });
  await panel.getByRole('button', { name: 'Добавить аккаунт', exact: true }).click();

  const form = page.locator('[data-slot="sheet-content"]').filter({ hasText: 'Добавить аккаунт' });
  await form.getByRole('button', { name: 'Сгенерировать следующий свободный номер' }).click();
  const displayId = form.locator('[data-slot="account-display-id-field"] input');
  await expect(displayId).not.toHaveValue('');
  const accountNumber = await displayId.inputValue();

  await form.getByRole('textbox', { name: 'Логин' }).fill(login);
  await form.getByRole('textbox', { name: 'Пароль' }).fill('Qa-pass-1');

  const merchant = form.getByRole('combobox', { name: 'Мерчант', exact: true });
  await merchant.click();
  await merchant.fill('a');
  await chooseFirstAutocompleteOption(page);

  const country = form.getByRole('combobox', { name: 'Гео мерчанта', exact: true });
  await country.click();
  await country.fill('Германия');
  const countryOption = page
    .locator('[data-slot="autocomplete-list"] button')
    .filter({ hasText: 'Германия' });
  await expect(countryOption).toBeVisible();
  await countryOption.click();

  await form.getByRole('textbox', { name: 'Заметки по гео' }).fill('Гео для автотеста');
  await form.getByRole('textbox', { name: 'Подход' }).fill('Подход для автотеста');
  await form.getByRole('combobox', { name: 'Тип', exact: true }).click();
  await page.getByRole('option', { name: 'Основной', exact: true }).click();
  await form.getByRole('checkbox', { name: 'Премиум' }).click();
  await form.getByRole('checkbox', { name: 'Чекап' }).click();
  await form.getByRole('textbox', { name: 'Заметки по статусу' }).fill('Статус для автотеста');

  await form.getByRole('combobox', { name: 'Платежные методы' }).click();
  const paymentOption = page.locator('[data-slot="combobox-item"]').first();
  await expect(paymentOption).toBeVisible();
  await paymentOption.click();
  // Список множественного выбора сам не закрывается и прячет «Создать».
  // Клик по пустому месту панели его убирает.
  await form.locator('[data-slot="side-panel-body"]').click({ position: { x: 8, y: 8 } });
  await expect(page.locator('[data-slot="combobox-content"]')).toBeHidden();

  const createAccount = form.getByRole('button', { name: 'Создать', exact: true });
  await expect(createAccount).toBeEnabled();

  const accountSaved = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      response.url().includes('/dms/deals/') &&
      response.ok()
  );
  await createAccount.click();
  await accountSaved;
  await expect(panel.getByRole('combobox', { name: 'Аккаунт', exact: true })).toHaveValue(
    new RegExp(accountNumber)
  );
}

/**
 * Первая схема в списке часто и есть AM Direct. Для МФ её пропускаем
 * и проверяем ветку панели: телефон и email регистрации МФ есть,
 * «Сгенерировать адрес» — только у AM Direct.
 */
async function chooseShipmentScheme(
  page: Page,
  panel: Locator,
  excludeAmDirect: boolean
): Promise<void> {
  const scheme = panel.getByRole('combobox', { name: 'Схема', exact: true });
  await scheme.click();

  const options = page.getByRole('option');
  await expect(options.first()).toBeVisible({ timeout: 15000 });

  const count = await options.count();
  let target: Locator | undefined;
  for (let index = 0; index < count; index += 1) {
    const option = options.nth(index);
    const name = (await option.innerText()).replace(/\s+/g, ' ').trim();
    if (!name) continue;
    if (excludeAmDirect && AM_DIRECT_SCHEME.test(name)) continue;
    target = option;
    break;
  }

  if (!target) {
    throw new Error('В списке схем нет варианта кроме AM Direct');
  }

  if (!excludeAmDirect) {
    await target.click();
    return;
  }

  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      response.url().includes('/dms/deals/') &&
      response.ok()
  );
  await target.click();
  await saved;

  await expect(scheme).not.toContainText(AM_DIRECT_SCHEME);
  const registrationPhone = panel.getByText('MF registration phone', { exact: true });
  await registrationPhone.scrollIntoViewIfNeeded();
  await expect(registrationPhone).toBeVisible();
  await expect(panel.getByText('MF registration email', { exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Сгенерировать адрес' })).toHaveCount(0);
}

export async function fillDealPanel(page: Page, options?: DealPanelOptions): Promise<void> {
  const panel = dealPanel(page);

  await chooseShipmentScheme(page, panel, options?.excludeAmDirect === true);

  if (!options?.skipMerchant) {
    const merchantSaved = page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        response.url().includes('/dms/deals/') &&
        response.ok()
    );
    await pickAutocomplete(page, panel, 'Мерчант', 'a');
    await merchantSaved;
  }

  const country = panel.getByRole('combobox', { name: 'Страна', exact: true });
  await expect(country).toBeEnabled();
  // После мерчанта в поле сначала встаёт заглушка N/A, список стран дорисовывается следом.
  await page.waitForTimeout(1000);
  await country.scrollIntoViewIfNeeded();
  await country.click();
  await country.fill('Германия');
  const countryOption = page
    .locator('[data-slot="autocomplete-list"] button')
    .filter({ hasText: 'Германия' });
  await expect(countryOption).toBeVisible();
  await countryOption.click();
  await expect(country).toHaveValue(/Германия/);

  if (!options?.skipAccount) {
    await pickAutocomplete(page, panel, 'Аккаунт', 'a');
  }

  const payment = panel.getByRole('combobox', { name: 'Платежный метод', exact: true });
  await expect(payment).toBeEnabled();
  await payment.click();
  const paymentOption = page.locator('[data-slot="combobox-item"]').first();
  await expect(paymentOption).toBeVisible();
  await paymentOption.click();

  if (!options?.skipMerchantOrder) {
    const orderNumber = panel.getByRole('textbox', { name: 'Номер заказа', exact: true });
    await orderNumber.fill(MERCHANT_ORDER_NUMBER);
    await orderNumber.press('Enter');
  }

  await panel.getByRole('button', { name: 'Ссылка', exact: true }).click();
  const documentLink = page.getByRole('textbox', { name: 'Ссылка на документы' });
  await documentLink.fill(DOCUMENT_LINK);
  await documentLink.locator('xpath=..').getByRole('button', { name: 'Сохранить' }).click();
  // Ссылка на документы уходит отдельным сохранением — без паузы «Провести» её не видит.
  await page.waitForTimeout(1000);

  const addressLine2 = panel.getByRole('textbox', { name: 'Address line 2' });
  if (await addressLine2.isVisible()) {
    if ((await addressLine2.inputValue()).trim() === '') {
      await addressLine2.fill(ADDRESS_LINE_2);
      await addressLine2.press('Enter');
    }
  }
}

/** Товар уже в «В обработке»: цена, ссылка, размер, черновик и «Провести». */
export async function conductItemInProcessing(
  page: Page,
  itemId: string,
  options?: DealPanelOptions
): Promise<void> {
  await openProcessingTab(page);
  await searchPurchaseItems(page, itemId);
  await fillMerchantPriceInUsd(page, itemId);
  await fillProductLink(page, itemId);
  await fillBoughtSize(page, itemId);
  await fillDealPanel(page, options);
  await confirmDeal(page);
}

/** Случайный товар из «Ожидают», без нового заказа. */
export async function conductRandomAwaitingItem(
  page: Page,
  options?: DealPanelOptions
): Promise<string> {
  await openAwaitingPurchaseTab(page);
  const toastText = await takeRandomAwaitingItem(page);
  const [itemId] = movedItemIds(toastText);
  expect(itemId).toMatch(/\S/);
  await conductItemInProcessing(page, itemId, options);
  return itemId;
}

export async function confirmDeal(page: Page): Promise<void> {
  const panel = dealPanel(page);
  await panel.getByRole('button', { name: 'Провести', exact: true }).click();

  const confirmed = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      response.url().includes('/confirm') &&
      response.ok()
  );
  await page.getByRole('dialog').getByRole('button', { name: 'Подтвердить', exact: true }).click();
  await confirmed;
  await expect(panel.getByRole('button', { name: 'Провести', exact: true })).toBeHidden();
}

export type PreparedPurchaseOrder = {
  orderNumber: string;
  itemIds: string[];
};

/** Новый заказ целиком забирается в «В обработке». Дальше тест работает по id товаров. */
export async function prepareOrderInProcessing(
  page: Page,
  request: APIRequestContext,
  itemCount: number,
): Promise<PreparedPurchaseOrder> {
  const order = await createOrderWithMultipleItems(request, itemCount);
  expect(order.itemsCount).toBe(itemCount);
  expect(order.displayId).toMatch(/[A-Z0-9]{4,}/);

  await AuthDMSAdmin(page);
  await openAwaitingPurchaseTab(page);
  await searchPurchaseItems(page, order.displayId);
  await expectPurchaseOrderRows(page, order.displayId, itemCount);

  const toastText = await takeAllItemsFromOrder(page, order.displayId);
  const itemIds = movedItemIds(toastText);
  expect(itemIds).toHaveLength(itemCount);

  await openProcessingTab(page);
  await expectPurchaseOrderRows(page, order.displayId, itemCount);
  return { orderNumber: order.displayId, itemIds };
}

async function fillItemRow(page: Page, itemId: string): Promise<void> {
  await fillMerchantPriceInUsd(page, itemId);
  await fillProductLink(page, itemId);
  await fillBoughtSize(page, itemId);
}

async function readDealId(page: Page, itemId: string): Promise<string> {
  const row = purchaseOrderRows(page, itemId).first();
  const cell = await columnCell(page, row, 'Сделка');
  const dealButton = cell.getByRole('button').filter({ hasNotText: 'Добавить к сделке' });
  await expect(dealButton).toBeVisible({ timeout: 20000 });
  const dealId = (await dealButton.innerText()).replace(/\s+/g, ' ').trim();
  expect(dealId).toMatch(/\S/);
  return dealId;
}

/** Все переданные товары показывают один и тот же номер сделки. */
export async function expectItemsInOneDeal(page: Page, itemIds: string[]): Promise<string> {
  const dealId = await readDealId(page, itemIds[0]);
  for (const itemId of itemIds.slice(1)) {
    await expect(
      purchaseOrderRows(page, itemId).getByRole('button', { name: dealId, exact: true }),
    ).toBeVisible();
  }
  return dealId;
}

/**
 * Цена первого товара открывает сделку. Остальные входят в неё кнопкой
 * «Добавить к сделке»: цена без этой кнопки открыла бы отдельную сделку.
 */
async function joinItemsIntoOneDeal(page: Page, itemIds: string[]): Promise<void> {
  await fillItemRow(page, itemIds[0]);
  for (const itemId of itemIds.slice(1)) {
    await addItemToOpenDeal(page, itemId);
    await fillItemRow(page, itemId);
  }
  await expectItemsInOneDeal(page, itemIds);
}

export async function conductJoinedDeal(page: Page, itemIds: string[]): Promise<void> {
  await joinItemsIntoOneDeal(page, itemIds);
  await fillDealPanel(page);
  await confirmDeal(page);
}

export async function conductJoinedDealWithNewMerchant(
  page: Page,
  itemIds: string[],
  merchantName: string,
): Promise<void> {
  await joinItemsIntoOneDeal(page, itemIds);
  await createAndSelectMerchant(page, merchantName);
  await fillDealPanel(page, { skipMerchant: true });
  await confirmDeal(page);
}

export async function conductJoinedDealWithNewAccount(
  page: Page,
  itemIds: string[],
  login: string,
): Promise<void> {
  await joinItemsIntoOneDeal(page, itemIds);
  await createAndSelectAccount(page, login);
  await fillDealPanel(page, { skipMerchant: true, skipAccount: true });
  await confirmDeal(page);
}

/** «Создать сделку» сразу кладёт все отмеченные товары в один черновик. */
export async function conductBulkDeal(page: Page, itemIds: string[]): Promise<void> {
  for (const itemId of itemIds) {
    await purchaseOrderRows(page, itemId)
      .first()
      .getByRole('checkbox', { name: 'Выбрать строку' })
      .click();
  }

  const create = page.getByRole('button', { name: `Создать сделку (${itemIds.length})`, exact: true });
  await expect(create).toBeVisible();
  await create.click();
  await expect(dealPanel(page).getByRole('button', { name: 'Провести', exact: true })).toBeVisible({
    timeout: 20000,
  });

  for (const itemId of itemIds) {
    await fillItemRow(page, itemId);
  }
  await expectItemsInOneDeal(page, itemIds);
  await fillDealPanel(page);
  await confirmDeal(page);
}

/** Два товара одного заказа, но две сделки: второй не нажимает «Добавить к сделке». */
export async function conductTwoSeparateDeals(page: Page, itemIds: string[]): Promise<void> {
  await fillItemRow(page, itemIds[0]);
  const firstDeal = await readDealId(page, itemIds[0]);

  await fillItemRow(page, itemIds[1]);
  const secondDeal = await readDealId(page, itemIds[1]);
  expect(secondDeal).not.toBe(firstDeal);

  await fillDealPanel(page);
  await confirmDeal(page);

  await purchaseOrderRows(page, itemIds[0]).getByRole('button', { name: firstDeal, exact: true }).click();
  await expect(dealPanel(page).getByRole('button', { name: 'Провести', exact: true })).toBeVisible({
    timeout: 20000,
  });
  await fillDealPanel(page);
  await confirmDeal(page);
}

/** В сделку входят только первые два товара. Третий остаётся с кнопкой «Добавить к сделке». */
export async function conductTwoOfThree(page: Page, itemIds: string[]): Promise<void> {
  await joinItemsIntoOneDeal(page, itemIds.slice(0, 2));
  await expect(
    purchaseOrderRows(page, itemIds[2]).getByRole('button', { name: 'Добавить к сделке' }),
  ).toBeVisible();
  await fillDealPanel(page);
  await confirmDeal(page);
}
