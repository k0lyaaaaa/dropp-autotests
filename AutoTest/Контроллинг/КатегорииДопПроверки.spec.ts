import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { changeCheckCategories, putItemOnAdditionalCheck } from '../helpers/controlling';

test.use({
  headless: true,
});

test.describe('Контроллинг → категории на «Доп. проверка»', () => {
  test.setTimeout(1800000);

  test('карандаш дописывает причину и оставляет товар на вкладке', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await putItemOnAdditionalCheck(page);
    await changeCheckCategories(
      page,
      itemId,
      ['Проверить размер'],
      'Автотест: ещё одна категория доп. проверки'
    );
  });
});
