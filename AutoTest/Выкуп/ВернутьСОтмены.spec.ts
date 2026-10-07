import { test } from '@playwright/test';
import {
  expectItemAbsentFromPurchaseTab,
  expectItemOnPurchaseTab,
  markItemForCancellation,
  returnItemFromCancellation,
} from '../helpers/purchaseCancellation';
import { purchaseThreadCase, putItemOnPurchaseTab } from '../helpers/purchaseThreadTags';

test.use({
  headless: true,
});

test.describe('Выкуп → На отмену → вернуть', () => {
  test.setTimeout(420000);

  test('«Вернуть» отправляет товар обратно в «Невыкупы»', async ({ page }) => {
    const orderNumber = await putItemOnPurchaseTab(page, purchaseThreadCase('Невыкупы'));
    await markItemForCancellation(page, orderNumber);
    await expectItemOnPurchaseTab(page, orderNumber, 'На отмену');

    await returnItemFromCancellation(page, orderNumber);

    await expectItemOnPurchaseTab(page, orderNumber, 'Невыкупы');
    await expectItemAbsentFromPurchaseTab(page, orderNumber, 'На отмену');
  });
});
