import { test } from '@playwright/test';
import {
  cancelItemWithReasons,
  expectItemOnPurchaseTab,
  markItemForCancellation,
} from '../helpers/purchaseCancellation';
import { putItemOnPurchaseTab, type PurchaseThreadTagCase } from '../helpers/purchaseThreadTags';

test.use({
  headless: true,
});

test.describe.configure({ mode: 'serial' });

const UNPURCHASED: PurchaseThreadTagCase = {
  section: 'Невыкуп',
  tag: '#unpurchase',
  reason: 'Out of stock',
  tab: 'Невыкупы',
  comment: 'Невыкуп перед отменой',
};

const CLIENT_REASONS = ['Out of stock', 'Authentication problem'] as const;

test.describe('Выкуп → На отмену', () => {
  test.setTimeout(420000);

  for (const clientReason of CLIENT_REASONS) {
    test(`из «Невыкупа» отмена с причиной клиенту «${clientReason}»`, async ({ page }) => {
      const orderNumber = await putItemOnPurchaseTab(page, UNPURCHASED);
      await markItemForCancellation(page, orderNumber);
      await expectItemOnPurchaseTab(page, orderNumber, 'На отмену');
      await cancelItemWithReasons(page, orderNumber, clientReason);
      await expectItemOnPurchaseTab(page, orderNumber, 'Отмененные');
    });
  }
});
