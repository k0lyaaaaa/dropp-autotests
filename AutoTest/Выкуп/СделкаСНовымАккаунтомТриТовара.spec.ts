import { expect, test } from '@playwright/test';
import {
  conductJoinedDealWithNewAccount,
  prepareOrderInProcessing,
} from '../helpers/conductPurchaseDeal';

test.use({
  headless: true,
});

test.describe('Выкуп → новый аккаунт, три товара', () => {
  test.setTimeout(900000);

  test('три товара одного заказа проводятся с новым аккаунтом', async ({ page, request }) => {
    const { itemIds } = await prepareOrderInProcessing(page, request, 3);
    expect(itemIds).toHaveLength(3);
    await conductJoinedDealWithNewAccount(page, itemIds, `qa.account.${Date.now()}@example.com`);
  });
});
