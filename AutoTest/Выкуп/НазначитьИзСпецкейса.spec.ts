import { test } from '@playwright/test';
import { expectItemOnPurchaseTab } from '../helpers/purchaseCancellation';
import { assignAnotherSpecialist, expectAssignedSpecialist } from '../helpers/purchaseSpecialist';
import { purchaseThreadCase, putItemOnPurchaseTab } from '../helpers/purchaseThreadTags';

test.use({
  headless: true,
});

test.describe('Выкуп → Спецкейсы → назначить исполнителя', () => {
  test.setTimeout(420000);

  test('назначение уводит товар в «В обработке»', async ({ page }) => {
    const orderNumber = await putItemOnPurchaseTab(page, purchaseThreadCase('Спецкейсы'));
    const name = await assignAnotherSpecialist(page, orderNumber);

    await expectItemOnPurchaseTab(page, orderNumber, 'В обработке');
    await expectAssignedSpecialist(page, orderNumber, name);
  });
});
