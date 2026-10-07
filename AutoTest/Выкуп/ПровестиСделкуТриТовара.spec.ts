import { expect, test } from '@playwright/test';
import { conductJoinedDeal, prepareOrderInProcessing } from '../helpers/conductPurchaseDeal';

test.use({
  headless: true,
});

test.describe('Выкуп → провести сделку из трёх товаров', () => {
  test.setTimeout(900000);

  test('три товара одного заказа проводятся одной сделкой', async ({ page, request }) => {
    const { itemIds } = await prepareOrderInProcessing(page, request, 3);
    expect(itemIds).toHaveLength(3);
    await conductJoinedDeal(page, itemIds);
  });
});
