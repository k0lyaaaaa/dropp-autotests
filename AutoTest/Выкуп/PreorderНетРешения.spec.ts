import { test } from '@playwright/test';
import { setPurchaseThreadDecision } from '../helpers/purchaseResolution';
import { purchaseThreadCase, putItemOnPurchaseTab } from '../helpers/purchaseThreadTags';

test.use({
  headless: true,
});

test.describe('Выкуп → Preorder check → нет решения', () => {
  test.setTimeout(420000);

  test('«Нет решения» открывает кнопку «Закрыть»', async ({ page }) => {
    const orderNumber = await putItemOnPurchaseTab(page, purchaseThreadCase('Preorder check'));
    await setPurchaseThreadDecision(page, orderNumber, 'Нет решения', 'Закрыть');
  });
});
