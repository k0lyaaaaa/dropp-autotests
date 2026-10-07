import { test } from '@playwright/test';
import { putFreshItemInProcessing } from '../helpers/purchaseAwaiting';
import { expectItemAbsentFromPurchaseTab } from '../helpers/purchaseCancellation';
import { hidePurchaseItem } from '../helpers/purchaseToolbar';

test.use({
  headless: true,
});

test.describe('Выкуп → скрыть из выкупа', () => {
  test.setTimeout(420000);

  test('скрытый товар пропадает из «В обработке» и из «Ожидают»', async ({ page }) => {
    const orderNumber = await putFreshItemInProcessing(page);
    await hidePurchaseItem(page, orderNumber);

    await expectItemAbsentFromPurchaseTab(page, orderNumber, 'В обработке');
    await expectItemAbsentFromPurchaseTab(page, orderNumber, 'Ожидают');
  });
});
