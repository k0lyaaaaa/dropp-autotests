import { expect, test } from '@playwright/test';
import { conductTwoOfThree, prepareOrderInProcessing } from '../helpers/conductPurchaseDeal';

test.use({
  headless: true,
});

test.describe('Выкуп → сделка из двух товаров из трёх', () => {
  test.setTimeout(900000);

  test('третий товар того же заказа остаётся вне сделки', async ({ page, request }) => {
    const { itemIds } = await prepareOrderInProcessing(page, request, 3);
    expect(itemIds).toHaveLength(3);
    await conductTwoOfThree(page, itemIds);
  });
});
