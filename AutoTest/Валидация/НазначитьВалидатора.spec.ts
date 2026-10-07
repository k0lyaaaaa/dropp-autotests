import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { assignValidator, prepareItemOnValidation } from '../helpers/validation';

test.use({
  headless: true,
});

test.describe('Валидация → валидатор', () => {
  test.setTimeout(900000);

  test('на «На валидации» товару назначается валидатор', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await prepareItemOnValidation(page);
    await assignValidator(page, itemId);
  });
});
