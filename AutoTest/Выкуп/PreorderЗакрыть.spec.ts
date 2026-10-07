import { test } from '@playwright/test';
import { closePurchaseThread, setPurchaseThreadDecision } from '../helpers/purchaseResolution';
import { purchaseThreadCase, putItemOnPurchaseTab } from '../helpers/purchaseThreadTags';

test.use({
  headless: true,
});

test.describe('Выкуп → Preorder check → закрыть', () => {
  test.setTimeout(420000);

  test('«Закрыть» после «Есть решение» убирает товар с вкладки', async ({ page }) => {
    const orderNumber = await putItemOnPurchaseTab(page, purchaseThreadCase('Preorder check'));
    await setPurchaseThreadDecision(page, orderNumber, 'Есть решение', 'Закрыть');
    await closePurchaseThread(page, orderNumber, 'Закрыть', 'Есть решение');
  });
});
