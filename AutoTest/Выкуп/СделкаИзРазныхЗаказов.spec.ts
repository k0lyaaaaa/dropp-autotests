import { expect, test } from '@playwright/test';
import { createOrderWithMultipleItems } from '../helpers/api/createDealBack';
import { AuthDMSAdmin } from '../helpers/auth';
import { takeSearchedOrderIntoProcessing } from '../helpers/purchaseAwaiting';
import { expectCreateDealBlocked, openMyNewestProcessing, selectPurchaseOrders } from '../helpers/purchaseToolbar';

test.use({
  headless: true,
});

test.describe('Выкуп → В обработке → сделка из разных заказов', () => {
  test.setTimeout(420000);

  test('товары из разных заказов нельзя собрать в одну сделку', async ({ page, request }) => {
    const first = await createOrderWithMultipleItems(request, 1);
    const second = await createOrderWithMultipleItems(request, 1);
    expect(first.displayId).toMatch(/[A-Z0-9]{4,}/);
    expect(second.displayId).toMatch(/[A-Z0-9]{4,}/);

    await AuthDMSAdmin(page);
    await takeSearchedOrderIntoProcessing(page, first.displayId);
    await takeSearchedOrderIntoProcessing(page, second.displayId);
    await openMyNewestProcessing(page);
    await selectPurchaseOrders(page, [first.displayId, second.displayId]);
    await expectCreateDealBlocked(page, 'разных заказов', 'Подтвердить');
  });
});
