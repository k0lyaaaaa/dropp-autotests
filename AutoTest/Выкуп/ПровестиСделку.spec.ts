import { expect, test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import {
  confirmDeal,
  fillBoughtSize,
  fillDealPanel,
  fillMerchantPriceInUsd,
  fillProductLink,
} from '../helpers/conductPurchaseDeal';
import {
  expectPurchaseOrderRows,
  movedItemIds,
  openAwaitingPurchaseTab,
  openProcessingTab,
  searchPurchaseItems,
  takeRandomAwaitingItem,
} from '../helpers/purchaseAwaiting';

test.use({
  headless: true,
});

test.describe('Выкуп → провести сделку', () => {
  test.setTimeout(420000);

  test('один товар из «Ожидают» проводится сделкой из «В обработке»', async ({ page }) => {
    await AuthDMSAdmin(page);
    await openAwaitingPurchaseTab(page);

    const toastText = await takeRandomAwaitingItem(page);
    const [itemId] = movedItemIds(toastText);
    expect(itemId).toMatch(/\S/);

    await openProcessingTab(page);
    await searchPurchaseItems(page, itemId);
    await expectPurchaseOrderRows(page, itemId, 1);

    await fillMerchantPriceInUsd(page, itemId);
    await fillProductLink(page, itemId);
    await fillBoughtSize(page, itemId);
    await fillDealPanel(page);
    await confirmDeal(page);
  });
});
