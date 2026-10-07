import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { putItemOnBuyoutError, requestControllingCs } from '../helpers/controlling';

test.use({
  headless: true,
});

test.describe('Контроллинг → запрос в КС из «Ошибки выкупа»', () => {
  test.setTimeout(720000);

  test('из «Ошибки выкупа» отправляется запрос в КС', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await putItemOnBuyoutError(page);
    await requestControllingCs(page, itemId, 'Ошибки выкупа', 'Автотест: запрос в КС из ошибки выкупа');
  });
});
