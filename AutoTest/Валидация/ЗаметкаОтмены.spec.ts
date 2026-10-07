import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { prepareItemOnValidation, saveCancellationNote } from '../helpers/validation';

test.use({
  headless: true,
});

test.describe('Валидация → заметка отмены', () => {
  test.setTimeout(900000);

  test('заметка по отмене сохраняется в строке', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await prepareItemOnValidation(page);
    await saveCancellationNote(page, itemId, 'Автотест: заметка отмены');
  });
});
