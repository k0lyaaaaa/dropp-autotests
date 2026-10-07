import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { changeEveryControllingCsStatus, putSuccessfulItemWithCsRequest } from '../helpers/controlling';

test.use({
  headless: true,
});

test.describe('Контроллинг → статус запроса КС', () => {
  test.setTimeout(720000);

  test('один товар проходит все статусы запроса КС', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await putSuccessfulItemWithCsRequest(page);
    await changeEveryControllingCsStatus(page, itemId);
  });
});
