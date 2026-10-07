import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { prepareItemOnValidation, saveCancellationLink } from '../helpers/validation';

test.use({
  headless: true,
});

test.describe('Валидация → документ отмены', () => {
  test.setTimeout(900000);

  test('ссылка документа отмены сохраняется в строке', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await prepareItemOnValidation(page);
    await saveCancellationLink(page, itemId, 'https://example.com/cancel-doc');
  });
});
