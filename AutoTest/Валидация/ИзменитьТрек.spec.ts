import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { editShippedTrack, prepareItemOnValidation, shipValidationItem } from '../helpers/validation';

test.use({
  headless: true,
});

test.describe('Валидация → изменить трек', () => {
  test.setTimeout(900000);

  test('карандаш на «Отправленные» меняет трек и оставляет товар на вкладке', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await prepareItemOnValidation(page);
    await shipValidationItem(page, itemId);
    await editShippedTrack(page, itemId);
  });
});
