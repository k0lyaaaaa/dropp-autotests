import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { conductRandomAwaitingItem } from './conductPurchaseDeal';
import { openControllingSection, passControlling, searchControllingItems } from './controlling';
import {
  openValidationSection,
  searchValidationItems,
  shipValidationItem,
  waitForItemOnValidation,
} from './validation';

/**
 * Раздел «Логистика → Отправления до МФ».
 *
 * Локаторы и ожидания ответа сервера живут здесь, а не в каждом тесте:
 * подпись вкладки меняется в одном месте. Это тот же приём, что у хелперов
 * выкупа и валидации.
 *
 * `waitForTimeout` нет: ждём конкретный запрос списка или элемент.
 * Браузер без окна и без искусственной паузы между шагами.
 */
export const visibleBrowser = {
  headless: true,
  viewport: { width: 1600, height: 1000 },
};

export const MERCHANT_TO_MF_TABS = [
  'Ожидают ввода в систему МФ',
  'Ожидают регистрации',
  'Ожидают форвардинга',
  'Отправленные',
] as const;

/** Колонки вкладки «Ожидают ввода в систему МФ», по которым раздел узнаётся. */
export const PENDING_ENTRY_COLUMNS = [
  'Item ID',
  'Товар',
  'Мерчант выкупа',
  'Пункт приема',
  'Клиент',
  'Получатель',
  'Время отправки',
  'Трек-номер',
  'Стоимость посылки',
  'Введен в систему',
  'Зарегистрирован на складе',
] as const;

/** Колонки, которые есть только на своей вкладке. Ими проверяем, что таблица переключилась. */
export const TAB_COLUMNS = {
  'Ожидают ввода в систему МФ': ['Трек-номер', 'Пункт приема', 'Введен в систему'],
  'Ожидают регистрации': ['Трек-номер', 'Пункт приема', 'Введен в систему'],
  'Ожидают форвардинга': ['Исходящий трек-номер', 'Пункт отправки', 'Автоотправление', 'Отправлен', 'Услуга применена'],
  'Отправленные': ['Исходящий трек-номер', 'Отправлен', 'Проблема логистики'],
} as const;

const TAB_STATUS = {
  'Ожидают ввода в систему МФ': 'pendingEntry',
  'Ожидают регистрации': 'pendingRegistration',
  'Ожидают форвардинга': 'pendingForwarding',
  'Отправленные': 'shipped',
} as const;

export type MerchantToMfTab = keyof typeof TAB_STATUS;

/** Спецуслуга без «Вернуть»: «Вернуть» уводит строку в возврат мерчанту. */
const HOLD_AT_WAREHOUSE = 'Задержать на складе';

function pathname(response: Response): string {
  return new URL(response.url()).pathname;
}

function isShipmentList(response: Response, query?: string): boolean {
  if (response.request().method() !== 'GET' || !response.ok()) return false;
  if (!pathname(response).endsWith('/dms/shipments')) return false;
  if (!response.url().includes('merchantToMf')) return false;
  if (query && !response.url().includes(encodeURIComponent(query))) return false;
  return true;
}

function shipmentRows(page: Page, itemId: string): Locator {
  return page.getByRole('row').filter({ hasText: itemId });
}

async function openTab(page: Page, name: string): Promise<void> {
  const tab = page.getByRole('tab', { name, exact: true });
  if ((await tab.getAttribute('data-state')) === 'active') return;
  await tab.click();
  await expect(tab).toHaveAttribute('data-state', 'active');
}

/** Смена вкладки запрашивает список заново. Ждём именно этот ответ. */
export async function openMerchantToMfTab(page: Page, name: MerchantToMfTab): Promise<void> {
  const tab = page.getByRole('tab', { name, exact: true });
  if ((await tab.getAttribute('data-state')) === 'active') return;

  const listLoaded = page.waitForResponse(
    (response) => isShipmentList(response) && response.url().includes(TAB_STATUS[name])
  );
  await tab.click();
  await expect(tab).toHaveAttribute('data-state', 'active');
  await listLoaded;
}

export function shipmentSearch(page: Page): Locator {
  return page.locator('[data-slot="table-toolbar-search"] input');
}

export function pageSizeSelect(page: Page): Locator {
  return page.getByText('Строк на странице', { exact: true }).locator('..').getByRole('combobox');
}

export function invoiceUploadButton(page: Page): Locator {
  return page.getByRole('button', { name: 'Загрузить накладные', exact: true });
}

/**
 * Заголовок колонки содержит кнопку ресайза, поэтому имя роли шире текста.
 * Сверяем видимый текст заголовка и берём ячейку с тем же индексом.
 */
async function columnCell(page: Page, row: Locator, header: string): Promise<Locator> {
  const headers = page.getByRole('columnheader');
  const count = await headers.count();

  for (let index = 0; index < count; index += 1) {
    const name = (await headers.nth(index).innerText())
      .replace(/Resize column/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (name === header || name.startsWith(`${header} `)) {
      return row.getByRole('cell').nth(index);
    }
  }

  throw new Error(`Колонка «${header}» не найдена`);
}

export async function openMerchantToMf(page: Page): Promise<void> {
  const link = page.getByRole('link', { name: 'Отправления до МФ', exact: true });
  if (!(await link.isVisible())) {
    await page.getByRole('button', { name: 'Логистика', exact: true }).click();
  }
  await link.waitFor({ state: 'visible', timeout: 20000 });

  const listLoaded = page.waitForResponse((response) => isShipmentList(response));
  await link.click();
  await page.waitForURL(/\/logistics\/merchant-to-mf/);
  await listLoaded;

  await expect(
    page.getByRole('tab', { name: 'Ожидают ввода в систему МФ', exact: true })
  ).toHaveAttribute('data-state', 'active');
}

/** Поиск в тулбаре дебаунсится, поэтому ждём запрос списка с этим номером. */
export async function searchMerchantToMf(page: Page, query: string): Promise<void> {
  const input = page.locator('[data-slot="table-toolbar-search"] input');
  await input.waitFor({ state: 'visible', timeout: 15000 });

  const listLoaded = page.waitForResponse((response) => isShipmentList(response, query));
  await input.fill(query);
  await listLoaded;
}

/**
 * Отправление создаётся после трека в валидации не в ту же секунду.
 * Пока строки нет — обновляем список и ищем снова.
 */
export async function expectShipmentOnTab(
  page: Page,
  itemId: string,
  trackNumber: string,
  tabName: string
): Promise<void> {
  await expect(async () => {
    await openTab(page, tabName);
    const row = shipmentRows(page, itemId);
    if ((await row.count()) !== 1) {
      const listLoaded = page.waitForResponse((response) => isShipmentList(response));
      await page.reload();
      await listLoaded;

      const input = page.locator('[data-slot="table-toolbar-search"] input');
      await input.waitFor({ state: 'visible', timeout: 15000 });
      if ((await input.inputValue()) !== itemId) {
        await searchMerchantToMf(page, itemId);
      }
      throw new Error(`Товар ещё не на вкладке «${tabName}»`);
    }

    await expect(row).toContainText(trackNumber);
  }).toPass({ timeout: 180000 });
}

/**
 * Пустая дата уже в режиме правки: «Ввести текущее», затем «Сохранить».
 * Бэкенд уводит строку на следующую вкладку, тост называет её.
 */
export async function stampShipmentDate(
  page: Page,
  itemId: string,
  column: string,
  nextTab: string
): Promise<void> {
  const row = shipmentRows(page, itemId);
  await expect(row).toHaveCount(1);
  const cell = await columnCell(page, row, column);
  await cell.scrollIntoViewIfNeeded();

  const setNow = cell.getByRole('button', { name: 'Ввести текущее', exact: true });
  await expect(setNow).toBeVisible();
  await setNow.click();

  const save = cell.getByRole('button', { name: 'Сохранить', exact: true });
  await expect(save).toBeEnabled();

  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      response.url().includes('/dms/shipments/') &&
      response.ok()
  );
  await save.click();
  await saved;

  await expect(
    page
      .locator('.Toastify__toast--info')
      .filter({ hasText: itemId })
      .filter({ hasText: nextTab })
      .last()
  ).toBeVisible({ timeout: 20000 });

  await openTab(page, nextTab);
  const moved = shipmentRows(page, itemId);
  await expect(moved).toHaveCount(1, { timeout: 20000 });
}

export async function expectTabColumns(page: Page, tab: MerchantToMfTab): Promise<void> {
  for (const column of TAB_COLUMNS[tab]) {
    await expect(page.getByRole('columnheader').getByText(column, { exact: true })).toBeVisible();
  }
}

export async function expectInvoiceUpload(page: Page, visible: boolean): Promise<void> {
  const button = invoiceUploadButton(page);
  if (visible) {
    await expect(button).toBeVisible();
    return;
  }
  await expect(button).toHaveCount(0);
}

/** Поиск, которого нет в данных: список пустой, строка поиска сохраняет запрос. */
export async function expectNoShipments(page: Page): Promise<void> {
  await expect(page.getByText('Данные отсутствуют', { exact: true })).toBeVisible();
}

export async function setPageSize(page: Page, size: 50 | 100 | 200): Promise<void> {
  const loaded = page.waitForResponse((response) => {
    if (!isShipmentList(response)) return false;
    return new URL(response.url()).searchParams.get('take') === String(size);
  });
  await pageSizeSelect(page).click();
  await page.getByRole('option', { name: String(size), exact: true }).click();
  await loaded;
  await expect(pageSizeSelect(page)).toContainText(String(size));
}

export async function setSortOrder(page: Page, order: 'Сначала старые' | 'Сначала новые'): Promise<void> {
  const wire = order === 'Сначала старые' ? 'ASC' : 'DESC';
  const loaded = page.waitForResponse((response) => {
    if (!isShipmentList(response)) return false;
    return new URL(response.url()).searchParams.get('sortOrder') === wire;
  });
  await page.getByRole('button', { name: /^Сортировка:/ }).click();
  await page.getByRole('menuitemradio', { name: order, exact: true }).click();
  await loaded;
  await expect(page.getByRole('button', { name: `Сортировка: ${order}` })).toBeVisible();
}

export async function exportShipmentList(page: Page): Promise<void> {
  const exported = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      response.ok() &&
      pathname(response).endsWith('/dms/shipments/export')
  );
  await page.getByRole('button', { name: 'Экспорт', exact: true }).click();
  await exported;
  await expect(page.getByRole('button', { name: 'Экспорт', exact: true })).toBeVisible();
}

/** Фильтр колонки «Item ID». Несуществующий номер оставляет пустую таблицу. */
export async function filterByItemId(page: Page, itemId: string): Promise<void> {
  const header = page.getByRole('columnheader').filter({
    has: page.getByText('Item ID', { exact: true }),
  });
  await header.getByRole('button', { name: 'Открыть меню фильтра', exact: true }).click();

  const field = page.locator('#table-filter-text-search');
  await expect(field).toBeVisible();
  await field.fill(itemId);

  const loaded = page.waitForResponse(
    (response) => isShipmentList(response) && response.url().includes(encodeURIComponent(itemId))
  );
  await field.locator('xpath=ancestor::div[1]').getByRole('button', { name: 'Применить', exact: true }).click();
  await loaded;
}

export async function resetShipmentFilters(page: Page, absentQuery: string): Promise<void> {
  const reset = page.getByRole('button', { name: 'Сбросить фильтры', exact: true });
  await expect(reset).toBeVisible();

  const loaded = page.waitForResponse(
    (response) => isShipmentList(response) && !response.url().includes(encodeURIComponent(absentQuery))
  );
  await reset.click();
  await loaded;
  await expect(reset).toHaveCount(0);
}

/**
 * Свежее отправление на «Ожидают ввода в систему МФ».
 * Схема сделки не AM Direct, иначе товар в этот раздел не попадает.
 */
export async function preparePendingEntryShipment(
  page: Page
): Promise<{ itemId: string; trackNumber: string }> {
  const itemId = await conductRandomAwaitingItem(page, { excludeAmDirect: true });

  await openControllingSection(page);
  await searchControllingItems(page, itemId);
  await passControlling(page, itemId);

  await openValidationSection(page);
  await searchValidationItems(page, itemId);
  await waitForItemOnValidation(page, itemId);
  const trackNumber = await shipValidationItem(page, itemId);

  await openMerchantToMf(page);
  await searchMerchantToMf(page, itemId);
  await expectShipmentOnTab(page, itemId, trackNumber, 'Ожидают ввода в систему МФ');
  return { itemId, trackNumber };
}

async function servicePopover(page: Page): Promise<Locator> {
  const service = page.getByRole('checkbox', { name: HOLD_AT_WAREHOUSE, exact: true });
  await expect(service).toBeVisible();
  return service.locator('xpath=ancestor::*[@role="dialog"][1]');
}

/** Черновик спецуслуг сохраняется только по «Сохранить», «Отменить» его выбрасывает. */
export async function setHoldAtWarehouse(page: Page, itemId: string): Promise<void> {
  const row = shipmentRows(page, itemId);
  const cell = await columnCell(page, row, 'Спецуслуги');
  await cell.scrollIntoViewIfNeeded();
  await cell.getByRole('button', { name: 'Редактировать', exact: true }).click();

  const popover = await servicePopover(page);
  await popover.getByRole('checkbox', { name: 'Не переупаковывать', exact: true }).check();
  await popover.getByRole('button', { name: 'Отменить', exact: true }).click();
  await expect(row).not.toContainText('Не переупаковывать');

  await cell.getByRole('button', { name: 'Редактировать', exact: true }).click();
  const again = await servicePopover(page);
  await again.getByRole('checkbox', { name: HOLD_AT_WAREHOUSE, exact: true }).check();

  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      response.url().includes('/dms/shipments/') &&
      response.ok()
  );
  await again.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await saved;
  await expect(row).toContainText(HOLD_AT_WAREHOUSE);
}

/**
 * Со спецуслугой товар не уходит сам: галочку не трогаем и не ждём PATCH.
 * На стенде она может быть уже включена, но отправка всё равно только ручная.
 * Товар остаётся на «Ожидают форвардинга».
 */
export async function expectAutoForwardOff(page: Page, itemId: string): Promise<void> {
  const row = shipmentRows(page, itemId);
  const cell = await columnCell(page, row, 'Автоотправление');
  await cell.scrollIntoViewIfNeeded();
  await expect(cell.getByRole('checkbox', { name: 'Автоотправление', exact: true })).toBeVisible();
  await expect(row).toHaveCount(1);
  await expect(page.getByRole('tab', { name: 'Ожидают форвардинга', exact: true })).toHaveAttribute(
    'data-state',
    'active'
  );
}

/** Панель исходящего трека. Номер не меняем: это отделило бы товар от посылки. */
export async function openAndCloseOutgoingTrack(page: Page, itemId: string): Promise<void> {
  const cell = await columnCell(page, shipmentRows(page, itemId), 'Исходящий трек-номер');
  await cell.scrollIntoViewIfNeeded();
  await cell.getByRole('button', { name: 'Редактировать', exact: true }).click();

  const panel = page.locator('[data-slot="sheet-content"]').filter({ hasText: 'Исходящий трек-номер' });
  await expect(panel.getByRole('heading', { name: 'Изменить трек-номер', exact: true })).toBeVisible();
  await expect(panel.getByRole('heading', { name: 'История изменения', exact: true })).toBeVisible();
  await panel.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(panel).toBeHidden();
}

/**
 * «Отправлен» при выбранной спецуслуге без «Услуга применена» не уходит на сервер.
 * Строка остаётся на «Ожидают форвардинга».
 */
export async function expectDispatchBlocked(page: Page, itemId: string): Promise<void> {
  const row = shipmentRows(page, itemId);
  const cell = await columnCell(page, row, 'Отправлен');
  await cell.scrollIntoViewIfNeeded();
  await cell.getByRole('button', { name: 'Ввести текущее', exact: true }).click();
  await cell.getByRole('button', { name: 'Сохранить', exact: true }).click();

  await expect(page.getByText('Спецуслуга не была применена').last()).toBeVisible();
  await expect(row).toHaveCount(1);
  await expect(page.getByRole('tab', { name: 'Ожидают форвардинга', exact: true })).toHaveAttribute(
    'data-state',
    'active'
  );
}

/** Дата, которая не меняет вкладку: «Услуга применена» без услуги «Вернуть». */
export async function stampDateInPlace(page: Page, itemId: string, column: string): Promise<void> {
  const row = shipmentRows(page, itemId);
  const cell = await columnCell(page, row, column);
  await cell.scrollIntoViewIfNeeded();
  await cell.getByRole('button', { name: 'Ввести текущее', exact: true }).click();

  const save = cell.getByRole('button', { name: 'Сохранить', exact: true });
  await expect(save).toBeEnabled();
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      response.url().includes('/dms/shipments/') &&
      response.ok()
  );
  await save.click();
  await saved;

  await expect(shipmentRows(page, itemId)).toHaveCount(1);
  await expect(
    (await columnCell(page, shipmentRows(page, itemId), column)).getByRole('button', {
      name: 'Ввести текущее',
      exact: true,
    })
  ).toHaveCount(0);
}

/** «Стоимость отправления» пишется на всю посылку. Пустая ячейка уже в режиме правки. */
export async function fillParcelCost(page: Page, itemId: string, amount: string): Promise<void> {
  const cell = await columnCell(page, shipmentRows(page, itemId), 'Стоимость отправления');
  await cell.scrollIntoViewIfNeeded();

  const currency = cell.getByRole('combobox');
  if (!(await currency.innerText()).includes('USD')) {
    await currency.click();
    await page.getByRole('option', { name: 'USD', exact: true }).click();
  }

  await cell.getByPlaceholder('Сумма').fill(amount);
  const save = cell.getByRole('button', { name: 'Сохранить', exact: true });
  await expect(save).toBeEnabled();

  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      response.url().includes('/dms/shipments/') &&
      response.ok()
  );
  await save.click();
  await saved;

  const updated = await columnCell(page, shipmentRows(page, itemId), 'Стоимость отправления');
  await expect(updated).toContainText('USD');
  await expect(updated).toContainText(amount);
}

/** На «Отправленных» проблема не уводит строку с вкладки. */
export async function markLogisticProblem(page: Page, itemId: string): Promise<void> {
  const row = shipmentRows(page, itemId);
  await row.getByRole('button', { name: 'Отметить проблему', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Внимание!', exact: true })).toBeVisible();
  await expect(dialog).toContainText('Отметить отправление как проблему логистики?');

  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      response.url().includes('/dms/shipments/') &&
      response.ok()
  );
  await dialog.getByRole('button', { name: 'Подтвердить', exact: true }).click();
  await saved;

  const stayed = shipmentRows(page, itemId);
  await expect(stayed).toHaveCount(1, { timeout: 20000 });
  await expect(stayed.getByRole('button', { name: 'Отметить проблему', exact: true })).toHaveCount(0);
  await expect(stayed).toContainText('Проблема логистики');
  await expect(page.getByRole('tab', { name: 'Отправленные', exact: true })).toHaveAttribute(
    'data-state',
    'active'
  );
}
