import { test } from '@playwright/test';
import { setPurchaseThreadDecision } from '../helpers/purchaseResolution';
import { purchaseThreadCase, putItemOnPurchaseTab } from '../helpers/purchaseThreadTags';

test.use({
  headless: true,
});

test.describe('Выкуп → Запрос КС → нет решения', () => {
  test.setTimeout(420000);

  test('«Нет решения» открывает кнопку «Закрыть тикет»', async ({ page }) => {
    const orderNumber = await putItemOnPurchaseTab(page, purchaseThreadCase('Запрос КС'));
    await setPurchaseThreadDecision(page, orderNumber, 'Нет решения', 'Закрыть тикет');
  });
});
