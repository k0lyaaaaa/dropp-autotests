import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { addValidationThreadNote, prepareItemOnValidation } from '../helpers/validation';

test.use({
  headless: true,
});

test.describe('Валидация → статус', () => {
  test.setTimeout(900000);

  test('в колонке #validation-status сохраняется заметка', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await prepareItemOnValidation(page);
    await addValidationThreadNote(
      page,
      itemId,
      '#validation-status',
      'Add a note',
      'Автотест: статус валидации'
    );
  });
});
