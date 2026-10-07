import { expect, Locator, Page } from '@playwright/test';
import { conductRandomAwaitingItem } from './conductPurchaseDeal';
import {
  markBuyoutErrors,
  openControllingSection,
  searchControllingItems,
  waitForControllingPlacement,
} from './controlling';

function orderRows(page: Page, itemId: string) {
  return page.getByRole('row').filter({ hasText: itemId });
}

async function openTab(page: Page, name: string): Promise<void> {
  const tab = page.getByRole('tab', { name, exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute('data-state', 'active');
}

async function columnCell(page: Page, row: Locator, header: string): Promise<Locator> {
  const headers = page.getByRole('columnheader');
  const count = await headers.count();

  for (let index = 0; index < count; index += 1) {
    const name = (await headers.nth(index).innerText()).replace(/\s+/g, ' ').trim();
    if (name === header || name.startsWith(`${header} `)) return row.getByRole('cell').nth(index);
  }

  throw new Error(`Колонка «${header}» не найдена`);
}

export async function openValidationSection(page: Page): Promise<void> {
  const link = page.getByRole('link', { name: 'Валидация', exact: true });
  await link.waitFor({ state: 'visible', timeout: 20000 });
  await link.click();
  await page.waitForURL(/\/validation/);
}

/** Поиск в тулбаре дебаунсится, поэтому ждём запрос списка с этим номером. */
export async function searchValidationItems(page: Page, query: string): Promise<void> {
  const input = page.locator('[data-slot="table-toolbar-search"] input');
  await input.waitFor({ state: 'visible', timeout: 15000 });

  const listLoaded = page.waitForResponse(
    (response) =>
      response.url().includes('/dms/tables/validation') &&
      response.url().includes(encodeURIComponent(query)) &&
      response.ok()
  );
  await input.fill(query);
  await listLoaded;
}

/** После контроллинга товар появляется на «На валидации» не сразу. */
export async function waitForItemOnValidation(page: Page, itemId: string): Promise<void> {
  await expect(async () => {
    await openTab(page, 'На валидации');
    if ((await orderRows(page, itemId).count()) !== 1) {
      await page.reload();
      throw new Error('Товар ещё не на валидации');
    }
  }).toPass({ timeout: 180000 });
}

/**
 * Товар из «Выкуп → Ожидают»: провести сделку и дождаться его
 * в «Валидация → На валидации». Новый заказ не создаём.
 */
export async function prepareItemOnValidation(
  page: Page,
  options?: { excludeAmDirect?: boolean }
): Promise<string> {
  const itemId = await conductRandomAwaitingItem(page, options);
  await openValidationSection(page);
  await searchValidationItems(page, itemId);
  await waitForItemOnValidation(page, itemId);
  return itemId;
}

/** Свежая строка: авто-трек ещё ждётся, просмотр не отмечен, запроса мерчанту нет. */
export async function expectFreshValidationRow(page: Page, itemId: string): Promise<void> {
  const row = orderRows(page, itemId);
  await expect(row).toHaveCount(1);

  const autoTrack = await columnCell(page, row, 'Авто-трек');
  await autoTrack.scrollIntoViewIfNeeded();
  await expect(autoTrack).toContainText('Ожидается');
  await expect(row.getByRole('button', { name: 'Отметить как просмотрено' })).toBeVisible();
  await expect(await columnCell(page, row, 'Запрос к мерчанту')).toContainText('—');
}

/** Админ выбирает валидатора из списка, у роли без этого права кнопка «На меня». */
export async function assignValidator(page: Page, itemId: string): Promise<void> {
  const cell = await columnCell(page, orderRows(page, itemId), 'Валидатор');
  await cell.scrollIntoViewIfNeeded();

  const self = cell.getByRole('button', { name: 'На меня', exact: true });
  if (await self.isVisible()) {
    await self.click();
    await expect(self).toBeHidden({ timeout: 20000 });
    return;
  }

  const field = cell.getByRole('combobox', { name: 'Валидатор' });
  await field.click();
  const option = page.locator('[data-slot="autocomplete-list"] button').first();
  await expect(option).toBeVisible({ timeout: 15000 });
  const lines = (await option.innerText())
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  await option.click();
  await expect(field).not.toHaveValue('', { timeout: 20000 });
  expect(lines).toContain(await field.inputValue());
}

/** Галочка в строке и кнопка «Назначить на себя» в тулбаре. */
export async function assignValidationItemToSelf(page: Page, itemId: string): Promise<void> {
  const row = orderRows(page, itemId);
  await row.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Назначить на себя', exact: true }).click();
  await expect(
    page.locator('.Toastify__toast--success').filter({ hasText: 'назначены на вас' }).last()
  ).toBeVisible({ timeout: 20000 });

  const cell = await columnCell(page, row, 'Валидатор');
  const self = cell.getByRole('button', { name: 'На меня', exact: true });
  if ((await self.count()) > 0) {
    await expect(self).toBeHidden({ timeout: 20000 });
    return;
  }
  await expect(cell.locator('input')).not.toHaveValue('', { timeout: 20000 });
}

export async function markValidationViewed(page: Page, itemId: string): Promise<void> {
  const row = orderRows(page, itemId);
  const button = row.getByRole('button', { name: 'Отметить как просмотрено' });
  await button.scrollIntoViewIfNeeded();
  await button.click();
  await expect(button).toBeHidden({ timeout: 20000 });
  await expect(await columnCell(page, row, 'Просмотрено')).toContainText(/\d/);
}

/**
 * Новый трек-номер короче 10 символов форма не примет.
 * Сохранение с «На валидации» переносит товар в «Отправленные».
 */
export async function shipValidationItem(page: Page, itemId: string): Promise<string> {
  const trackNumber = `AT${Date.now()}`;
  const row = orderRows(page, itemId);
  const cell = await columnCell(page, row, 'Трек-номер и перевозчик');
  await cell.scrollIntoViewIfNeeded();

  await cell.getByRole('textbox', { name: 'Трек-номер' }).fill(trackNumber);
  await cell.locator('[data-slot="select-trigger"]').click();
  const courier = page.getByRole('option').first();
  await expect(courier).toBeVisible({ timeout: 15000 });
  await courier.click();

  await cell.getByRole('button', { name: 'Сохранить', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Внимание!', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Подтвердить', exact: true }).click();

  await expect(
    page.locator('.Toastify__toast--info').filter({ hasText: 'Отправленные' }).last()
  ).toBeVisible({ timeout: 20000 });

  await openTab(page, 'Отправленные');
  const moved = orderRows(page, itemId);
  await expect(moved).toHaveCount(1, { timeout: 20000 });
  await expect(moved).toContainText(trackNumber);
  return trackNumber;
}

/** Причина отмены с «На валидации» уводит товар в «Отмененные мерчантом». */
export async function cancelOnValidation(page: Page, itemId: string, reason: string): Promise<void> {
  const row = orderRows(page, itemId);
  const cell = await columnCell(page, row, 'Причина отмены');
  await cell.scrollIntoViewIfNeeded();

  await cell.locator('[data-slot="select-trigger"]').click();
  await page.getByRole('option', { name: reason, exact: true }).click();
  await cell.getByRole('button', { name: 'Подтвердить', exact: true }).click();

  await expect(
    page.locator('.Toastify__toast--success').filter({ hasText: 'Причина отмены сохранена' }).last()
  ).toBeVisible({ timeout: 20000 });

  await openTab(page, 'Отмененные мерчантом');
  const moved = orderRows(page, itemId);
  await expect(moved).toHaveCount(1, { timeout: 20000 });
  await expect(await columnCell(page, moved, 'Причина отмены')).toContainText(reason);
}

export async function addValidationThreadNote(
  page: Page,
  itemId: string,
  column: string,
  opener: string,
  text: string
): Promise<void> {
  const row = orderRows(page, itemId);
  const cell = await columnCell(page, row, column);
  await cell.scrollIntoViewIfNeeded();
  await cell.getByRole('button', { name: opener, exact: true }).click();

  const panel = page.locator('[data-slot="sheet-content"]').filter({
    has: page.getByPlaceholder('Новый комментарий…'),
  });
  const composer = panel.getByPlaceholder('Новый комментарий…');
  await expect(composer).toBeVisible({ timeout: 20000 });
  await composer.fill(text);
  const send = panel.getByRole('button', { name: 'Отправить', exact: true });
  await expect(send).toBeEnabled();
  await send.click();

  await expect(cell).toContainText(text, { timeout: 20000 });
}

export async function saveCancellationNote(page: Page, itemId: string, text: string): Promise<void> {
  const row = orderRows(page, itemId);
  const cell = await columnCell(page, row, 'Заметки по отмене');
  await cell.scrollIntoViewIfNeeded();
  await cell.getByRole('button', { name: 'Редактировать', exact: true }).click();
  await cell.getByRole('textbox', { name: 'Заметки по отмене' }).fill(text);
  await cell.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(cell).toContainText(text, { timeout: 20000 });
}

export async function saveCancellationLink(page: Page, itemId: string, url: string): Promise<void> {
  const row = orderRows(page, itemId);
  const cell = await columnCell(page, row, 'Документ отмены');
  await cell.scrollIntoViewIfNeeded();
  await cell.getByRole('button', { name: 'Ссылка', exact: true }).click();
  await cell.getByRole('textbox', { name: 'Ссылка на документы' }).fill(url);
  await cell.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(cell.locator(`a[href="${url}"]`)).toBeVisible({ timeout: 20000 });
}

export async function openBuyoutDetails(page: Page, itemId: string): Promise<void> {
  const row = orderRows(page, itemId);
  const button = row.getByRole('button', { name: 'Информация о выкупе' }).first();
  await button.scrollIntoViewIfNeeded();
  await button.click();

  const panel = page.locator('[data-slot="sheet-content"]').filter({ hasText: 'Информация о выкупе' });
  await expect(panel).toBeVisible();
  // В карточке «Номер заказа» — это display_id сделки (RHWHX1M-d01),
  // а не номер у мерчанта из колонки таблицы (MERCH-1001).
  // Платёжный метод догружается отдельным запросом сделки.
  await expect(detailValue(panel, 'Номер заказа')).toHaveText(/[A-Za-z0-9]/);
  await expect(detailValue(panel, 'Платежный метод')).toHaveText(/[A-Za-z0-9]/, {
    timeout: 20000,
  });
}

function detailValue(panel: Locator, label: string): Locator {
  return panel.getByText(label, { exact: true }).locator('xpath=following-sibling::*[1]');
}

/** Товар уже в «Отправленные»: карандаш меняет трек, вкладка та же. */
export async function editShippedTrack(page: Page, itemId: string): Promise<void> {
  await openTab(page, 'Отправленные');
  const row = orderRows(page, itemId);
  await expect(row).toHaveCount(1);
  const cell = await columnCell(page, row, 'Трек-номер и перевозчик');
  await cell.scrollIntoViewIfNeeded();

  const nextTrack = `ED${Date.now()}`;
  await cell.getByRole('button', { name: 'Редактировать', exact: true }).click();
  await cell.getByRole('textbox', { name: 'Трек-номер' }).fill(nextTrack);
  await cell.getByRole('button', { name: 'Сохранить', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Внимание!', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Подтвердить', exact: true }).click();

  await expect(cell).toContainText(nextTrack, { timeout: 20000 });
  await expect(page.getByRole('tab', { name: 'Отправленные', exact: true })).toHaveAttribute(
    'data-state',
    'active'
  );
  await expect(row).toHaveCount(1);
}

/**
 * Ошибка выкупа в контроллинге аннулирует товар в сделке.
 * Только тогда в причине отмены есть пункт «По нашему запросу».
 */
export async function prepareAnnulledValidationItem(page: Page): Promise<string> {
  const itemId = await prepareItemOnValidation(page);
  await openControllingSection(page);
  await searchControllingItems(page, itemId);
  await waitForControllingPlacement(page, itemId);
  await markBuyoutErrors(page, itemId, ['Неверный товар']);

  await openValidationSection(page);
  await searchValidationItems(page, itemId);
  await expect(async () => {
    for (const tabName of ['На валидации', 'Отправленные']) {
      await openTab(page, tabName);
      if ((await orderRows(page, itemId).count()) === 1) return;
    }
    await page.reload();
    throw new Error('Аннулированный товар не найден в валидации');
  }).toPass({ timeout: 180000 });

  return itemId;
}

/** «Отметить проблему» на «Отправленные»: товар остаётся, кнопка сменяется подписью. */
export async function markValidationLogisticProblem(page: Page, itemId: string): Promise<void> {
  await openTab(page, 'Отправленные');
  const row = orderRows(page, itemId);
  await expect(row).toHaveCount(1);
  const cell = await columnCell(page, row, 'Проблема логистики');
  await cell.scrollIntoViewIfNeeded();

  await cell.getByRole('button', { name: 'Отметить проблему', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Отметить проблему логистики?');
  await dialog.getByRole('button', { name: 'Подтвердить', exact: true }).click();

  await expect(cell.getByRole('button', { name: 'Отметить проблему', exact: true })).toHaveCount(0);
  await expect(cell).toContainText('Проблема логистики', { timeout: 20000 });
  await expect(row).toHaveCount(1);
}

/** Сделка без номера мерчанта: в ячейке поле, а не ссылка. */
export async function prepareItemWithoutMerchantOrder(page: Page): Promise<string> {
  const itemId = await conductRandomAwaitingItem(page, { skipMerchantOrder: true });
  await openValidationSection(page);
  await searchValidationItems(page, itemId);

  await expect(async () => {
    await openTab(page, 'На валидации');
    if ((await orderRows(page, itemId).count()) !== 1) {
      await page.reload();
      throw new Error('Товар ещё не на валидации');
    }
  }).toPass({ timeout: 180000 });

  return itemId;
}

export async function bindValidationMerchantOrder(
  page: Page,
  itemId: string,
  orderNumber = 'AT-ORDER-1001'
): Promise<void> {
  const row = orderRows(page, itemId);
  const cell = await columnCell(page, row, 'Номер заказа / мерчанта');
  await cell.scrollIntoViewIfNeeded();

  const input = cell.getByRole('textbox', { name: 'Номер заказа' });
  await expect(input).toBeVisible();
  await input.fill(orderNumber);
  await cell.getByRole('button', { name: 'Привязать заказ', exact: true }).click();

  await expect(input).toBeHidden({ timeout: 20000 });
  await expect(cell).toContainText(orderNumber);
}

/** Жёлтая кнопка у ID: тред `#validation-cs-request`, товар остаётся на вкладке. */
export async function discussValidationItem(page: Page, itemId: string, comment: string): Promise<void> {
  const row = orderRows(page, itemId);
  await expect(row).toHaveCount(1);
  await row
    .getByRole('button', { name: /Начать обсуждение|Есть комментарии|Есть открытые запросы/ })
    .click();

  const panel = page.locator('[data-slot="sheet-content"]').filter({ hasText: 'Спецтэги' });
  await expect(panel).toBeVisible();
  const section = panel.getByRole('heading', { name: 'Запрос в КС', exact: true }).locator('..');
  await section.getByRole('button', { name: '#validation-cs-request', exact: true }).click();
  await panel.getByPlaceholder('Новый комментарий…').fill(comment);
  const send = panel.getByRole('button', { name: 'Отправить', exact: true });
  await expect(send).toBeEnabled();
  await send.click();

  await expect(panel).toContainText(comment, { timeout: 20000 });
  await expect(row).toHaveCount(1);
}

/** «Показать» раскрывает пароль, «Скопировать» кладёт карточку в буфер. */
export async function revealAndCopyBuyoutPassword(page: Page, itemId: string): Promise<void> {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

  const row = orderRows(page, itemId);
  const button = row.getByRole('button', { name: 'Информация о выкупе' }).first();
  await button.scrollIntoViewIfNeeded();
  await button.click();

  const panel = page.locator('[data-slot="sheet-content"]').filter({ hasText: 'Информация о выкупе' });
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: 'Показать', exact: true }).click();

  const password = detailValue(panel, 'Пароль от аккаунта');
  await expect(password).toHaveText(/\S/, { timeout: 20000 });
  await expect(password).not.toContainText('Показать');

  await panel.getByRole('button', { name: 'Скопировать', exact: true }).click();
  await expect
    .poll(async () => page.evaluate(() => navigator.clipboard.readText()), { timeout: 20000 })
    .toContain('Пароль от аккаунта');
}
