import { expect, test } from '@playwright/test';
import { conductTwoSeparateDeals, prepareOrderInProcessing } from '../helpers/conductPurchaseDeal';

test.use({
  headless: true,
});

test.describe('Выкуп → две сделки из одного заказа', () => {
  test.setTimeout(900000);

  test('цена второго товара без «Добавить к сделке» открывает вторую сделку', async ({
    page,
    request,
  }) => {
    const { itemIds } = await prepareOrderInProcessing(page, request, 2);
    expect(itemIds).toHaveLength(2);
    await conductTwoSeparateDeals(page, itemIds);
  });
});
