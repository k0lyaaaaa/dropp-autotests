import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import {
  markValidationLogisticProblem,
  prepareItemOnValidation,
  shipValidationItem,
} from '../helpers/validation';

test.use({
  headless: true,
});

test.describe('Валидация → проблема логистики', () => {
  test.setTimeout(900000);

  test('«Отметить проблему» на «Отправленные» оставляет подпись в строке', async ({ page }) => {
    await AuthDMSAdmin(page);
    const itemId = await prepareItemOnValidation(page);
    await shipValidationItem(page, itemId);
    await markValidationLogisticProblem(page, itemId);
  });
});
