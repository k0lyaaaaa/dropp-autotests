import { expect, test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import {
  MERCHANT_TO_MF_TABS,
  PENDING_ENTRY_COLUMNS,
  expectInvoiceUpload,
  expectTabColumns,
  openMerchantToMf,
  openMerchantToMfTab,
  shipmentSearch,
  visibleBrowser,
  type MerchantToMfTab,
} from '../helpers/merchantToMf';

test.use(visibleBrowser);

test.describe('Отправления до МФ → раздел', () => {
  test.setTimeout(120000);

  test('раздел открывается из «Логистика», у каждой вкладки свои колонки', async ({ page }) => {
    await AuthDMSAdmin(page);
    await openMerchantToMf(page);

    await expect(page).toHaveURL(/\/logistics\/merchant-to-mf/);
    await expect(shipmentSearch(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Экспорт', exact: true })).toBeVisible();

    for (const column of PENDING_ENTRY_COLUMNS) {
      await expect(page.getByRole('columnheader').getByText(column, { exact: true })).toBeVisible();
    }
    await expectInvoiceUpload(page, true);

    const uploadOnTab: Record<MerchantToMfTab, boolean> = {
      'Ожидают ввода в систему МФ': true,
      'Ожидают регистрации': true,
      'Ожидают форвардинга': false,
      'Отправленные': false,
    };

    for (const tab of MERCHANT_TO_MF_TABS) {
      await openMerchantToMfTab(page, tab);
      await expectTabColumns(page, tab);
      await expectInvoiceUpload(page, uploadOnTab[tab]);
    }
  });
});
