import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { addValidationThreadNote, prepareItemOnValidation } from '../helpers/validation';

test.use({
  headless: true,
});

test.describe('Валидация → заметка мерчанту', () => {
  test.setTimeout(900000);

  test('в колонке #merchant-service сохраняется заметка', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await prepareItemOnValidation(page);
    await addValidationThreadNote(
      page,
      itemId,
      '#merchant-service',
      'Добавить заметку',
      'Автотест: заметка мерчанту'
    );
  });
});
