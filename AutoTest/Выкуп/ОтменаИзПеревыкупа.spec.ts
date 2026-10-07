import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import {
  cancelItemWithReasons,
  expectItemOnPurchaseTab,
  markItemForCancellation,
} from '../helpers/purchaseCancellation';
import { moveRandomItemToRepurchase } from '../helpers/purchaseRepurchase';

test.use({
  headless: true,
});

test.describe.configure({ mode: 'serial' });

const CLIENT_REASONS = ['Out of stock', 'Authentication problem'] as const;

test.describe('Выкуп → Перевыкуп → На отмену', () => {
  test.setTimeout(900000);

  for (const clientReason of CLIENT_REASONS) {
    test(`отмена с причиной клиенту «${clientReason}»`, async ({ page }) => {
      await AuthDMSAdmin(page);
      const itemId = await moveRandomItemToRepurchase(page);
      await markItemForCancellation(page, itemId);
      await expectItemOnPurchaseTab(page, itemId, 'На отмену');
      await cancelItemWithReasons(page, itemId, clientReason);
      await expectItemOnPurchaseTab(page, itemId, 'Отмененные');
    });
  }
});
