import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import {
  markLogisticProblem,
  preparePendingEntryShipment,
  stampShipmentDate,
  visibleBrowser,
} from '../helpers/merchantToMf';

test.use(visibleBrowser);

test.describe('Отправления до МФ → проблема логистики', () => {
  test.setTimeout(900000);

  test('отметка проблемы оставляет товар на «Отправленные»', async ({ page }) => {
    await AuthDMSAdmin(page);

    const { itemId } = await preparePendingEntryShipment(page);
    await stampShipmentDate(page, itemId, 'Введен в систему', 'Ожидают регистрации');
    await stampShipmentDate(page, itemId, 'Зарегистрирован на складе', 'Ожидают форвардинга');
    await stampShipmentDate(page, itemId, 'Отправлен', 'Отправленные');
    await markLogisticProblem(page, itemId);
  });
});
