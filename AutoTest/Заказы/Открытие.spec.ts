import { expect, test } from '@playwright/test';
import {
  KANBAN_COLUMNS,
  ORDER_COLUMNS,
  ORDER_QUICK_FILTERS,
  openOrders,
  ordersSearch,
  showOrdersKanban,
  showOrdersTable,
  visibleBrowser,
} from '../helpers/orders';

test.use(visibleBrowser);
test.setTimeout(120000);

test.describe('Заказы → раздел', () => {
  test('раздел открывается таблицей, чипами и канбаном', async ({ page }) => {
    await openOrders(page);

    await expect(page).toHaveURL(/\/orders/);
    await expect(ordersSearch(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Экспорт', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Сортировка: Сначала новые' })).toBeVisible();

    for (const column of ORDER_COLUMNS) {
      await expect(page.getByRole('columnheader').getByText(column, { exact: true })).toBeVisible();
    }
    for (const chip of ORDER_QUICK_FILTERS) {
      await expect(page.getByRole('button', { name: new RegExp(`^${chip}\\b`) })).toBeVisible();
    }
    await expect(page.getByRole('button', { name: 'Возвратный', exact: true })).toBeVisible();

    await showOrdersKanban(page);
    await expect(page.getByRole('button', { name: 'Компактные карточки', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Подробно', exact: true })).toBeVisible();
    for (const column of KANBAN_COLUMNS) {
      await expect(page.getByText(column, { exact: true }).first()).toBeVisible();
    }

    await showOrdersTable(page);
  });
});
