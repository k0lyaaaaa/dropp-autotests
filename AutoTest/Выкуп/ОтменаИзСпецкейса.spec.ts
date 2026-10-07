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

const SPECIAL_CASE: PurchaseThreadTagCase = {
  section: 'Спецкейс',
  tag: '#special-case',
  reason: 'Alo Yoga',
  tab: 'Спецкейсы',
  comment: 'Спецкейс перед отменой',
};

const CLIENT_REASONS = ['Out of stock', 'Authentication problem'] as const;

test.describe('Выкуп → Спецкейс → На отмену', () => {
  test.setTimeout(420000);

  for (const clientReason of CLIENT_REASONS) {
    test(`отмена с причиной клиенту «${clientReason}»`, async ({ page }) => {
      const orderNumber = await putItemOnPurchaseTab(page, SPECIAL_CASE);
      await markItemForCancellation(page, orderNumber);
      await expectItemOnPurchaseTab(page, orderNumber, 'На отмену');
      await cancelItemWithReasons(page, orderNumber, clientReason);
      await expectItemOnPurchaseTab(page, orderNumber, 'Отмененные');
    });
  }
});
