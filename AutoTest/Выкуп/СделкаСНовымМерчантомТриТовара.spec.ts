import { expect, test } from '@playwright/test';
import {
  conductJoinedDealWithNewMerchant,
  prepareOrderInProcessing,
} from '../helpers/conductPurchaseDeal';

test.use({
  headless: true,
});

test.describe('Выкуп → новый мерчант, три товара', () => {
  test.setTimeout(900000);

  test('три товара одного заказа проводятся с новым мерчантом', async ({ page, request }) => {
    const { itemIds } = await prepareOrderInProcessing(page, request, 3);
    expect(itemIds).toHaveLength(3);
    await conductJoinedDealWithNewMerchant(page, itemIds, `QA merchant ${Date.now()}`);
  });
});
