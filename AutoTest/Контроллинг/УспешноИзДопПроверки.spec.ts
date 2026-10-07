import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { putItemOnAdditionalCheck, sendManualItemToSuccessful } from '../helpers/controlling';

test.use({
  headless: true,
});

test.describe('Контроллинг → «Успешно» из «Доп. проверка»', () => {
  test.setTimeout(1800000);

  test('галочка «Успешно» переносит товар в «Успешные»', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await putItemOnAdditionalCheck(page);
    await sendManualItemToSuccessful(page, itemId);
  });
});
