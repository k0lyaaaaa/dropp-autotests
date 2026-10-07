import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { cancelOnValidation, prepareItemOnValidation } from '../helpers/validation';

test.use({
  headless: true,
});

test.describe('Валидация → нет в наличии', () => {
  test.setTimeout(900000);

  test('причина «Нет в наличии» переносит товар в «Отмененные мерчантом»', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await prepareItemOnValidation(page);
    await cancelOnValidation(page, itemId, 'Нет в наличии');
  });
});
