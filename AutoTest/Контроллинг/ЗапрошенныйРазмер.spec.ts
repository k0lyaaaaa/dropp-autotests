import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { editControllingSize, putControlledItem } from '../helpers/controlling';

test.use({
  headless: true,
});

test.describe('Контроллинг → запрошенный размер', () => {
  test.setTimeout(720000);

  test('карандаш сохраняет новый запрошенный размер', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await putControlledItem(page);
    await editControllingSize(page, itemId, 'Запрошенный размер', 'AT99');
  });
});
