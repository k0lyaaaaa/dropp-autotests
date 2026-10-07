import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { openBuyoutDetails, prepareItemOnValidation } from '../helpers/validation';

test.use({
  headless: true,
});

test.describe('Валидация → информация о выкупе', () => {
  test.setTimeout(900000);

  test('карточка выкупа показывает номер заказа и платёжный метод', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await prepareItemOnValidation(page);
    await openBuyoutDetails(page, itemId);
  });
});
