import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { discussValidationItem, prepareItemOnValidation } from '../helpers/validation';

test.use({
  headless: true,
});

test.describe('Валидация → обсуждение у ID товара', () => {
  test.setTimeout(900000);

  test('тред #validation-cs-request не уводит товар с вкладки', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await prepareItemOnValidation(page);
    await discussValidationItem(page, itemId, 'Автотест: запрос валидации в КС');
  });
});
