import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { markBuyoutErrors, putItemOnAdditionalCheck } from '../helpers/controlling';

test.use({
  headless: true,
});

test.describe('Контроллинг → ошибка выкупа из «Доп. проверка»', () => {
  test.setTimeout(1800000);

  test('«Неверный товар» переносит товар в «Ошибки выкупа»', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await putItemOnAdditionalCheck(page);
    await markBuyoutErrors(page, itemId, ['Неверный товар']);
  });
});
