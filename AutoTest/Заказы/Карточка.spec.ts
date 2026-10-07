import { expect, test } from '@playwright/test';
import { createOrderWithMultipleItems } from '../helpers/api/createDealBack';
import {
  addOrderComment,
  assignOrderToSelf,
  expectNewOrderRecipient,
  expectOrderInTable,
  expectOrderSections,
  openOrderCard,
  openOrders,
  previewRecipientEdit,
  searchOrders,
  visibleBrowser,
} from '../helpers/orders';

test.use(visibleBrowser);
test.setTimeout(300000);

test.describe('Заказы → карточка', () => {
  test('новый заказ открывается, назначается и принимает комментарий', async ({ page, request }) => {
    const order = await createOrderWithMultipleItems(request, 1);
    expect(order.itemsCount).toBe(1);

    await openOrders(page);
    await searchOrders(page, order.displayId);
    await expectOrderInTable(page, order.displayId, order.itemsCount);
    await openOrderCard(page, order.displayId);

    await expectOrderSections(page);
    await expect(page.getByRole('heading', { name: /^Состав \(1\)/ })).toBeVisible();
    await expectNewOrderRecipient(page);
    await previewRecipientEdit(page);
    await assignOrderToSelf(page);
    await addOrderComment(page, `Заметка автотеста ${Date.now()}`);
  });
});
