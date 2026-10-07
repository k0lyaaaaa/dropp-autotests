import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { expectFreshValidationRow, prepareItemOnValidation } from '../helpers/validation';

test.use({
  headless: true,
});

test.describe('Валидация → на валидации', () => {
  test.setTimeout(900000);

  test('после сделки товар из «Ожидают» попадает в «На валидации»', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await prepareItemOnValidation(page);
    await expectFreshValidationRow(page, itemId);
  });
});
