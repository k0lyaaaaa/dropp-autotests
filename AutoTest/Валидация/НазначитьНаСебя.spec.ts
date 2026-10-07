import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { assignValidationItemToSelf, prepareItemOnValidation } from '../helpers/validation';

test.use({
  headless: true,
});

test.describe('Валидация → назначить на себя', () => {
  test.setTimeout(900000);

  test('выбранный товар назначается на текущего пользователя', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await prepareItemOnValidation(page);
    await assignValidationItemToSelf(page, itemId);
  });
});
