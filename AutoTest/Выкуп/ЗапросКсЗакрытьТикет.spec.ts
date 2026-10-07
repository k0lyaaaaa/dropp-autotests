import { test } from '@playwright/test';
import { closePurchaseThread, setPurchaseThreadDecision } from '../helpers/purchaseResolution';
import { purchaseThreadCase, putItemOnPurchaseTab } from '../helpers/purchaseThreadTags';

test.use({
  headless: true,
});

test.describe('Выкуп → Запрос КС → закрыть тикет', () => {
  test.setTimeout(420000);

  test('«Закрыть тикет» после «Есть решение» убирает товар с вкладки', async ({ page }) => {
    const orderNumber = await putItemOnPurchaseTab(page, purchaseThreadCase('Запрос КС'));
    await setPurchaseThreadDecision(page, orderNumber, 'Есть решение', 'Закрыть тикет');
    await closePurchaseThread(page, orderNumber, 'Закрыть тикет', 'Есть решение');
  });
});
