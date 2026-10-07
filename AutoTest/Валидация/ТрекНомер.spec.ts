import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { prepareItemOnValidation, shipValidationItem } from '../helpers/validation';

test.use({
  headless: true,
});

test.describe('Валидация → трек-номер', () => {
  test.setTimeout(900000);

  test('трек-номер и перевозчик переносят товар в «Отправленные»', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await prepareItemOnValidation(page);
    await shipValidationItem(page, itemId);
  });
});
