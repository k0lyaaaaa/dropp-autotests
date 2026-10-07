import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { cancelOnValidation, prepareAnnulledValidationItem } from '../helpers/validation';

test.use({
  headless: true,
});

test.describe('Валидация → по нашему запросу', () => {
  test.setTimeout(1800000);

  test('у аннулированного товара причина «По нашему запросу» сохраняется', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await prepareAnnulledValidationItem(page);
    await cancelOnValidation(page, itemId, 'По нашему запросу');
  });
});
