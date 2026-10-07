import { test } from '@playwright/test';
import { setPurchaseThreadDecision } from '../helpers/purchaseResolution';
import { purchaseThreadCase, putItemOnPurchaseTab } from '../helpers/purchaseThreadTags';

test.use({
  headless: true,
});

test.describe('Выкуп → Запрос КС → есть решение', () => {
  test.setTimeout(420000);

  test('«Есть решение» открывает кнопку «Закрыть тикет»', async ({ page }) => {
    const orderNumber = await putItemOnPurchaseTab(page, purchaseThreadCase('Запрос КС'));
    await setPurchaseThreadDecision(page, orderNumber, 'Есть решение', 'Закрыть тикет');
  });
});
