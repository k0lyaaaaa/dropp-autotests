import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { markValidationViewed, prepareItemOnValidation } from '../helpers/validation';

test.use({
  headless: true,
});

test.describe('Валидация → просмотрено', () => {
  test.setTimeout(900000);

  test('галочка «Просмотрено» ставит дату вместо кнопки', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await prepareItemOnValidation(page);
    await markValidationViewed(page, itemId);
  });
});
