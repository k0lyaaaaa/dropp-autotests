import { expect, test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import {
  expectNoShipments,
  exportShipmentList,
  filterByItemId,
  openMerchantToMf,
  openMerchantToMfTab,
  pageSizeSelect,
  resetShipmentFilters,
  searchMerchantToMf,
  setPageSize,
  setSortOrder,
  shipmentSearch,
  visibleBrowser,
} from '../helpers/merchantToMf';

test.use(visibleBrowser);
test.setTimeout(180000);

test.describe('Отправления до МФ → список', () => {
  test('поиск без совпадений пустой и не сбрасывается на другой вкладке', async ({ page }) => {
    await AuthDMSAdmin(page);
    await openMerchantToMf(page);

    const missing = `ATMF${Date.now()}`;
    await searchMerchantToMf(page, missing);
    await expect(shipmentSearch(page)).toHaveValue(missing);
    await expectNoShipments(page);

    await openMerchantToMfTab(page, 'Ожидают регистрации');
    await expect(shipmentSearch(page)).toHaveValue(missing);
    await expectNoShipments(page);
  });

  test('размер страницы меняется, с первой страницы нельзя назад', async ({ page }) => {
    await AuthDMSAdmin(page);
    await openMerchantToMf(page);

    const previous = page.getByRole('button', { name: 'Перейти на предыдущую страницу' });
    await expect(previous).toBeDisabled();

    // Размер страницы запоминается у пользователя, стартовать может не с 50.
    const current = (await pageSizeSelect(page).innerText()).replace(/\s+/g, '');
    const first = current === '200' ? 50 : 200;
    const second = first === 200 ? 100 : 200;
    await setPageSize(page, first);
    await setPageSize(page, second);
    await expect(previous).toBeDisabled();
  });

  test('сортировка переключает сначала старые и сначала новые', async ({ page }) => {
    await AuthDMSAdmin(page);
    await openMerchantToMf(page);

    await expect(page.getByRole('button', { name: 'Сортировка: Сначала старые' })).toBeVisible();
    await setSortOrder(page, 'Сначала новые');
    await setSortOrder(page, 'Сначала старые');
  });

  test('экспорт запрашивает файл текущего списка', async ({ page }) => {
    await AuthDMSAdmin(page);
    await openMerchantToMf(page);
    await exportShipmentList(page);
  });

  test('фильтр Item ID сужает список, сброс возвращает его', async ({ page }) => {
    await AuthDMSAdmin(page);
    await openMerchantToMf(page);

    const missing = `ATMF${Date.now()}`;
    await filterByItemId(page, missing);
    await expectNoShipments(page);
    await resetShipmentFilters(page, missing);
    await expect(page.getByText('Данные отсутствуют', { exact: true })).toHaveCount(0);
  });
});
