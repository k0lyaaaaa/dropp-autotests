import { test } from '@playwright/test';
import { putFreshItemInProcessing } from '../helpers/purchaseAwaiting';
import { readSpecialistField } from '../helpers/purchaseSpecialist';
import { expectItemInThreadTab, purchaseThreadCase, sendItemToThreadTag } from '../helpers/purchaseThreadTags';
import {
  bringPreorderItemBackToMe,
  expectCreateDealBlocked,
  selectPurchaseOrders,
} from '../helpers/purchaseToolbar';

test.use({
  headless: true,
});

test.describe('Выкуп → В обработке → сделка при Preorder check', () => {
  test.setTimeout(720000);

  test('открытый Preorder check показывает предупреждение и не создаёт сделку', async ({ page }) => {
    const preorder = purchaseThreadCase('Preorder check');
    const orderNumber = await putFreshItemInProcessing(page);
    const myField = await readSpecialistField(page, orderNumber);

    await sendItemToThreadTag(page, orderNumber, preorder);
    await expectItemInThreadTab(page, orderNumber, preorder);
    await bringPreorderItemBackToMe(page, orderNumber, myField);
    await selectPurchaseOrders(page, [orderNumber]);
    await expectCreateDealBlocked(page, 'Ожидается проверка предзаказа', 'Закрыть');
  });
});
