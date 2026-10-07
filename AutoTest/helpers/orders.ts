import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { AuthDMSAdmin } from './auth';

/**
 * Раздел «Заказы».
 *
 * Локаторы здесь, а не в тестах: подпись колонки или чипа меняется в одном месте.
 * Список и карточка ждут ответ сервера, а не паузу.
 * Браузер без окна и без искусственной паузы между шагами.
 *
 * Проверки конкретного заказа зовут `createOrderWithMultipleItems`:
 * чужой заказ из общего списка для этого не подходит.
 */
export const visibleBrowser = {
  headless: true,
  viewport: { width: 1600, height: 1000 },
};

export const ORDER_COLUMNS = [
  'Order ID',
  'Товаров',
  'Оплачен',
  'Состояния',
  'Статус в ЛК',
  'Ожидаемый срок',
  'Стоимость',
  'Клиент',
  'Паспорт',
  'Регион',
  'Исполнитель',
] as const;

export const ORDER_QUICK_FILTERS = [
  'Новый',
  'Ожидает назначения',
  'Ожидает обработки',
  'Заказ обрабатывается',
  'Запрошен Preorder check',
  'Проблема баинга',
  'Требует согласования',
  'Пошлина ожидает оплаты',
  'Возврат ожидает обработки',
] as const;

export const KANBAN_COLUMNS = ['Accepted', 'Processing', 'In progress', 'Canceled', 'Completed'] as const;

function pathname(response: Response): string {
  return new URL(response.url()).pathname;
}

function isOrdersList(response: Response, query?: string): boolean {
  if (response.request().method() !== 'GET' || !response.ok()) return false;
  const path = pathname(response);
  if (!path.endsWith('/dms/orders') && !path.endsWith('/dms/orders/search')) return false;
  if (query && !response.url().includes(encodeURIComponent(query))) return false;
  return true;
}

export function ordersSearch(page: Page): Locator {
  return page.getByPlaceholder('Поиск по номеру заказа');
}

export function pageSizeSelect(page: Page): Locator {
  return page.getByText('Строк на странице', { exact: true }).locator('..').getByRole('combobox');
}

export function orderCard(page: Page): Locator {
  return page.locator('[data-slot="sheet-content"]');
}

export async function openOrders(page: Page): Promise<void> {
  await AuthDMSAdmin(page);

  const link = page.getByRole('link', { name: 'Заказы', exact: true });
  await link.waitFor({ state: 'visible', timeout: 20000 });

  const listLoaded = page.waitForResponse((response) => isOrdersList(response));
  await link.click();
  await page.waitForURL(/\/orders/);
  await listLoaded;
  await showOrdersTable(page);
}

/** Вид запоминается в браузере, поэтому таблицу включаем явно. */
export async function showOrdersTable(page: Page): Promise<void> {
  const table = page.getByRole('button', { name: 'Таблица', exact: true });
  await expect(table).toBeVisible();
  if ((await table.getAttribute('aria-pressed')) !== 'true') {
    await table.click();
  }
  await expect(table).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('columnheader').getByText('Order ID', { exact: true })).toBeVisible();
}

export async function showOrdersKanban(page: Page): Promise<void> {
  const kanban = page.getByRole('button', { name: 'Канбан', exact: true });
  await kanban.click();
  await expect(kanban).toHaveAttribute('aria-pressed', 'true');
  for (const column of KANBAN_COLUMNS) {
    await expect(page.getByText(column, { exact: true }).first()).toBeVisible();
  }
}

/** Поиск дебаунсится и переключает список на `/dms/orders/search`. */
export async function searchOrders(page: Page, query: string): Promise<void> {
  const input = ordersSearch(page);
  await input.waitFor({ state: 'visible', timeout: 15000 });

  const found = page.waitForResponse((response) => isOrdersList(response, query));
  await input.fill(query);
  await found;
}

/**
 * Новый заказ появляется в DMS не в ту же секунду после оплаты.
 * Пока строки нет — обновляем страницу. Поиск остаётся в адресе.
 */
export async function expectOrderInTable(page: Page, displayId: string, itemsCount: number): Promise<void> {
  await expect(async () => {
    const row = page.getByRole('row').filter({ hasText: displayId });
    if ((await row.count()) !== 1) {
      const listLoaded = page.waitForResponse((response) => isOrdersList(response));
      await page.reload();
      await listLoaded;
      if ((await ordersSearch(page).inputValue()) !== displayId) {
        await searchOrders(page, displayId);
      }
      throw new Error('Новый заказ ещё не в списке');
    }

    const quantity = await columnCell(page, row, 'Товаров');
    await expect(quantity).toContainText(String(itemsCount));
  }).toPass({ timeout: 120000 });
}

export async function openOrderCard(page: Page, displayId: string): Promise<void> {
  await page.getByRole('link', { name: displayId, exact: true }).click();
  await expect(orderCard(page).getByRole('heading', { name: `Заказ ${displayId}`, exact: true })).toBeVisible();
}

export async function expectOrderSections(page: Page): Promise<void> {
  const card = orderCard(page);
  for (const section of ['Основные данные', 'Получатель', 'Обсуждение']) {
    await expect(card.getByRole('heading', { name: section, exact: true })).toBeVisible();
  }
  await expect(card.getByRole('heading', { name: /^Состав/ })).toBeVisible();
}

/** Адрес нового заказа задаётся при создании в `createDealBack`. */
export async function expectNewOrderRecipient(page: Page): Promise<void> {
  const card = orderCard(page);
  await expect(card.getByText('Тестик', { exact: true }).first()).toBeVisible();
  await expect(card.getByText(/Санкт-Петербург/)).toBeVisible();
}

/** Форма получателя открывается и закрывается без сохранения. */
export async function previewRecipientEdit(page: Page): Promise<void> {
  const section = page.locator('[data-slot="order-card-section"]').filter({
    has: page.getByRole('heading', { name: 'Получатель', exact: true }),
  });
  await section.getByRole('button', { name: 'Редактировать', exact: true }).click();
  await expect(section.getByRole('textbox', { name: 'Фамилия', exact: true })).toBeVisible();
  await section.getByRole('button', { name: 'Отменить', exact: true }).click();
  await expect(section.getByRole('textbox', { name: 'Фамилия', exact: true })).toBeHidden();
}

export async function assignOrderToSelf(page: Page): Promise<void> {
  const card = orderCard(page);
  const assign = card.getByRole('button', { name: 'Назначить на меня', exact: true });
  await expect(assign).toBeVisible();

  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      pathname(response).includes('/dms/orders/') &&
      response.ok()
  );
  await assign.click();
  await saved;
  await expect(assign).toBeHidden();
}

export async function addOrderComment(page: Page, text: string): Promise<void> {
  const card = orderCard(page);
  const field = card.getByPlaceholder('Новый комментарий…');
  await field.scrollIntoViewIfNeeded();
  await field.fill(text);

  const sent = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      pathname(response).endsWith('/dms/comments') &&
      response.ok()
  );
  await card.getByRole('button', { name: 'Отправить', exact: true }).click();
  await sent;
  await expect(card.getByText(text, { exact: true })).toBeVisible();
}

export async function setOrdersPageSize(page: Page, size: 50 | 100 | 200): Promise<void> {
  const loaded = page.waitForResponse((response) => {
    if (!isOrdersList(response)) return false;
    return new URL(response.url()).searchParams.get('take') === String(size);
  });
  await pageSizeSelect(page).click();
  await page.getByRole('option', { name: String(size), exact: true }).click();
  await loaded;
  await expect(pageSizeSelect(page)).toContainText(String(size));
}

export async function setOrdersSort(page: Page, order: 'Сначала старые' | 'Сначала новые'): Promise<void> {
  const wire = order === 'Сначала старые' ? 'ASC' : 'DESC';
  const loaded = page.waitForResponse((response) => {
    if (!isOrdersList(response)) return false;
    return new URL(response.url()).searchParams.get('sortOrder') === wire;
  });
  await page.getByRole('button', { name: /^Сортировка:/ }).click();
  await page.getByRole('menuitemradio', { name: order, exact: true }).click();
  await loaded;
  await expect(page.getByRole('button', { name: `Сортировка: ${order}` })).toBeVisible();
}

export async function exportOrders(page: Page): Promise<void> {
  const exported = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      response.ok() &&
      pathname(response).endsWith('/dms/orders/export')
  );
  await page.getByRole('button', { name: 'Экспорт', exact: true }).click();
  await exported;
  await expect(page.getByRole('button', { name: 'Экспорт', exact: true })).toBeVisible();
}

export async function toggleQuickFilter(page: Page, name: string, queryFlag: string): Promise<void> {
  const target = page.getByRole('button', { name: new RegExp(`^${name}\\b`) });

  const applied = page.waitForResponse(
    (response) => isOrdersList(response) && response.url().includes(queryFlag)
  );
  await target.click();
  await applied;
  await expect(target).toHaveAttribute('aria-pressed', 'true');

  const cleared = page.waitForResponse(
    (response) => isOrdersList(response) && !response.url().includes(queryFlag)
  );
  await target.click();
  await cleared;
  await expect(target).toHaveAttribute('aria-pressed', 'false');
}

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
