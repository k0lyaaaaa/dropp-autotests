import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { cancelOnValidation, prepareItemOnValidation } from '../helpers/validation';

test.use({
  headless: true,
});

test.describe('Валидация → другое', () => {
  test.setTimeout(900000);

  test('причина «Другое» переносит товар в «Отмененные мерчантом»', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await prepareItemOnValidation(page);
    await cancelOnValidation(page, itemId, 'Другое');
  });
});
