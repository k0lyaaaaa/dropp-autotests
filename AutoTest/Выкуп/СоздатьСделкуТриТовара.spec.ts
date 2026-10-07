import { expect, test } from '@playwright/test';
import { conductBulkDeal, prepareOrderInProcessing } from '../helpers/conductPurchaseDeal';

test.use({
  headless: true,
});

test.describe('Выкуп → создать сделку из трёх товаров', () => {
  test.setTimeout(900000);

  test('кнопка «Создать сделку» собирает три товара одного заказа', async ({ page, request }) => {
    const { itemIds } = await prepareOrderInProcessing(page, request, 3);
    expect(itemIds).toHaveLength(3);
    await conductBulkDeal(page, itemIds);
  });
});
