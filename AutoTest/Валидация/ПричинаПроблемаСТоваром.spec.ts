import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { cancelOnValidation, prepareItemOnValidation } from '../helpers/validation';

test.use({
  headless: true,
});

test.describe('Валидация → проблема с товаром', () => {
  test.setTimeout(900000);

  test('причина «Проблема с товаром» переносит товар в «Отмененные мерчантом»', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await prepareItemOnValidation(page);
    await cancelOnValidation(page, itemId, 'Проблема с товаром');
  });
});
