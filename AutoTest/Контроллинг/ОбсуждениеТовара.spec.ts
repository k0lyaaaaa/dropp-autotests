import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { discussControllingItem, putControlledItem } from '../helpers/controlling';

test.use({
  headless: true,
});

test.describe('Контроллинг → обсуждение у ID товара', () => {
  test.setTimeout(720000);

  test('тред #cs-request с причиной «Модель» не уводит товар с вкладки', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await putControlledItem(page);
    // Тот же список причин: «Размер», «Цвет», «Другое».
    await discussControllingItem(page, itemId, 'Модель', 'Автотест: обсуждение модели');
  });
});
