import { expect, test } from '@playwright/test';
import { createOrderWithMultipleItems } from '../helpers/api/createDealBack';
import {
  expectOrderInTable,
  openOrders,
  searchOrders,
  showOrdersKanban,
  visibleBrowser,
} from '../helpers/orders';

test.use(visibleBrowser);
test.setTimeout(300000);

test.describe('Заказы → новый заказ', () => {
  test('свежий заказ находится в таблице и на канбане', async ({ page, request }) => {
    const order = await createOrderWithMultipleItems(request, 1);
    expect(order.itemsCount).toBe(1);
    expect(order.displayId).toMatch(/\S/);

    await openOrders(page);
    await searchOrders(page, order.displayId);
    await expectOrderInTable(page, order.displayId, order.itemsCount);

    await showOrdersKanban(page);
    const compact = page.getByRole('button', { name: 'Компактные карточки', exact: true });
    const detailed = page.getByRole('button', { name: 'Подробно', exact: true });
    await compact.click();
    await expect(compact).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('link', { name: order.displayId, exact: true })).toBeVisible();

    await detailed.click();
    await expect(detailed).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('link', { name: order.displayId, exact: true })).toBeVisible();
  });
});
