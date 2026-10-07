import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { changeCheckCategories, putItemOnBuyoutError } from '../helpers/controlling';

test.use({
  headless: true,
});

test.describe('Контроллинг → категории на «Ошибки выкупа»', () => {
  test.setTimeout(720000);

  test('карандаш заводит проверку и оставляет товар на вкладке', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await putItemOnBuyoutError(page);
    await changeCheckCategories(
      page,
      itemId,
      ['Проверить товар'],
      'Автотест: категория с ошибки выкупа'
    );
  });
});
