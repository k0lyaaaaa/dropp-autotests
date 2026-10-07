import { test } from '@playwright/test';
import { setPurchaseThreadDecision } from '../helpers/purchaseResolution';
import { purchaseThreadCase, putItemOnPurchaseTab } from '../helpers/purchaseThreadTags';

test.use({
  headless: true,
});

test.describe('Выкуп → Preorder check → передан', () => {
  test.setTimeout(420000);

  test('«Передан» открывает кнопку «Закрыть»', async ({ page }) => {
    const orderNumber = await putItemOnPurchaseTab(page, purchaseThreadCase('Preorder check'));
    await setPurchaseThreadDecision(page, orderNumber, 'Передан', 'Закрыть');
  });
});
