import { expect, test } from '@playwright/test';
import { purchaseOrderRows, putFreshItemInProcessing } from '../helpers/purchaseAwaiting';
import { assignAnotherSpecialist, expectAssignedSpecialist } from '../helpers/purchaseSpecialist';

test.use({
  headless: true,
});

test.describe('Выкуп → В обработке → исполнитель', () => {
  test.setTimeout(420000);

  test('смена исполнителя оставляет товар в «В обработке»', async ({ page }) => {
    const orderNumber = await putFreshItemInProcessing(page);
    const name = await assignAnotherSpecialist(page, orderNumber);

    await expectAssignedSpecialist(page, orderNumber, name);
    await expect(purchaseOrderRows(page, orderNumber)).toHaveCount(1);
  });
});
