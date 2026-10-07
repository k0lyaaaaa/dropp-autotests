import { test } from '@playwright/test';
import { putFreshItemInProcessing } from '../helpers/purchaseAwaiting';
import {
  expectItemAbsentFromPurchaseTab,
  expectItemOnPurchaseTab,
} from '../helpers/purchaseCancellation';
import { unassignItemSpecialist } from '../helpers/purchaseSpecialist';

test.use({
  headless: true,
});

test.describe('Выкуп → В обработке → снять исполнителя', () => {
  test.setTimeout(420000);

  test('снятие возвращает товар в «Ожидают»', async ({ page }) => {
    const orderNumber = await putFreshItemInProcessing(page);
    await unassignItemSpecialist(page, orderNumber);

    await expectItemOnPurchaseTab(page, orderNumber, 'Ожидают');
    await expectItemAbsentFromPurchaseTab(page, orderNumber, 'В обработке');
  });
});
