import { expect, test } from '@playwright/test';
import {
  exportOrders,
  openOrders,
  ordersSearch,
  pageSizeSelect,
  searchOrders,
  setOrdersPageSize,
  setOrdersSort,
  toggleQuickFilter,
  visibleBrowser,
} from '../helpers/orders';

test.use(visibleBrowser);
test.setTimeout(180000);

test.describe('Заказы → список', () => {
  test('поиск без такого номера показывает пустой список', async ({ page }) => {
    await openOrders(page);

    const missing = `ATORD${Date.now()}`;
    await searchOrders(page, missing);
    await expect(ordersSearch(page)).toHaveValue(missing);
    await expect(page.getByText('Данные отсутствуют', { exact: true })).toBeVisible();
  });

  test('размер страницы меняется, с первой страницы нельзя назад', async ({ page }) => {
    await openOrders(page);

    const previous = page.getByRole('button', { name: 'Перейти на предыдущую страницу' });
    await expect(previous).toBeDisabled();

    const current = (await pageSizeSelect(page).innerText()).replace(/\s+/g, '');
    const first = current === '200' ? 50 : 200;
    const second = first === 200 ? 100 : 200;
    await setOrdersPageSize(page, first);
    await setOrdersPageSize(page, second);
    await expect(previous).toBeDisabled();
  });

  test('сортировка переключает сначала новые и сначала старые', async ({ page }) => {
    await openOrders(page);

    await expect(page.getByRole('button', { name: 'Сортировка: Сначала новые' })).toBeVisible();
    await setOrdersSort(page, 'Сначала старые');
    await setOrdersSort(page, 'Сначала новые');
  });

  test('экспорт запрашивает файл текущего списка', async ({ page }) => {
    await openOrders(page);
    await exportOrders(page);
  });

  test('чип «Новый» включает и снимает фильтр', async ({ page }) => {
    await openOrders(page);
    await toggleQuickFilter(page, 'Новый', 'is_new');
  });

  test('чип «Возвратный» включает и снимает фильтр', async ({ page }) => {
    await openOrders(page);
    await toggleQuickFilter(page, 'Возвратный', 'is_returnable');
  });
});
