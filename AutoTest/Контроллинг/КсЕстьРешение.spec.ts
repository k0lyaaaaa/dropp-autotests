import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { closeControllingCsRequest, putSuccessfulItemWithCsRequest } from '../helpers/controlling';

test.use({
  headless: true,
});

test.describe('Контроллинг → «Есть решение» и закрыть тикет', () => {
  test.setTimeout(720000);

  test('после «Есть решение» появляется «Закрыть», товар остаётся на вкладке', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await putSuccessfulItemWithCsRequest(page);
    await closeControllingCsRequest(page, itemId, 'Есть решение');
  });
});
