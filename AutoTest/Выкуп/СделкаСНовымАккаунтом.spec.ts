import { expect, test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import {
  confirmDeal,
  createAndSelectAccount,
  fillBoughtSize,
  fillDealPanel,
  fillMerchantPriceInUsd,
  fillProductLink,
} from '../helpers/conductPurchaseDeal';
import {
  movedItemIds,
  openAwaitingPurchaseTab,
  openProcessingTab,
  searchPurchaseItems,
  takeRandomAwaitingItem,
} from '../helpers/purchaseAwaiting';

test.use({
  headless: true,
});

test.describe('Выкуп → новый аккаунт в черновике', () => {
  test.setTimeout(420000);

  test('случайный товар из «Ожидают» проводится с новым аккаунтом', async ({ page }) => {
    await AuthDMSAdmin(page);
    await openAwaitingPurchaseTab(page);

    const toastText = await takeRandomAwaitingItem(page);
    const [itemId] = movedItemIds(toastText);
    expect(itemId).toMatch(/\S/);

    await openProcessingTab(page);
    await searchPurchaseItems(page, itemId);
    await fillMerchantPriceInUsd(page, itemId);
    await fillProductLink(page, itemId);
    await fillBoughtSize(page, itemId);

    const login = `qa.account.${Date.now()}@example.com`;
    await createAndSelectAccount(page, login);
    await fillDealPanel(page, { skipMerchant: true, skipAccount: true });
    await confirmDeal(page);
  });
});
