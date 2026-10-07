import { expect, test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { createOrderWithMultipleItems } from '../helpers/api/createDealBack';
import {
  expectPurchaseOrderRows,
  movedItemIds,
  openAwaitingPurchaseTab,
  openProcessingTab,
  searchPurchaseItems,
  takeAllItemsFromOrder,
  takeOneItem,
} from '../helpers/purchaseAwaiting';

test.describe('Выкуп → Ожидают → взять в обработку', () => {
  test.setTimeout(300000);

  test('один товар уходит в «В обработке», остальные остаются в «Ожидают»', async ({
    page,
    request,
  }) => {
    const order = await createOrderWithMultipleItems(request, 2);
    expect(order.itemsCount).toBe(2);
    expect(order.displayId).toMatch(/[A-Z0-9]{4,}/);
    const orderNumber = order.displayId;

    await AuthDMSAdmin(page);
    await openAwaitingPurchaseTab(page);
    await searchPurchaseItems(page, orderNumber);
    await expectPurchaseOrderRows(page, orderNumber, 2);

    const toastText = await takeOneItem(page, orderNumber);
    expect(movedItemIds(toastText)).toHaveLength(1);

    await expectPurchaseOrderRows(page, orderNumber, 1);

    await openProcessingTab(page);
    await expectPurchaseOrderRows(page, orderNumber, 1);
  });

  test('ALL забирает все товары заказа из «Ожидают» в «В обработке»', async ({
    page,
    request,
  }) => {
    const order = await createOrderWithMultipleItems(request, 2);
    expect(order.itemsCount).toBe(2);
    expect(order.displayId).toMatch(/[A-Z0-9]{4,}/);
    const orderNumber = order.displayId;

    await AuthDMSAdmin(page);
    await openAwaitingPurchaseTab(page);
    await searchPurchaseItems(page, orderNumber);
    await expectPurchaseOrderRows(page, orderNumber, 2);

    const toastText = await takeAllItemsFromOrder(page, orderNumber);
    expect(movedItemIds(toastText)).toHaveLength(2);

    await expectPurchaseOrderRows(page, orderNumber, 0);

    await openProcessingTab(page);
    await expectPurchaseOrderRows(page, orderNumber, 2);
  });
});
