import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { preparePendingEntryShipment, stampShipmentDate, visibleBrowser } from '../helpers/merchantToMf';

test.use(visibleBrowser);

test.describe('Отправления до МФ → после валидации', () => {
  test.setTimeout(900000);

  test('схема не AM Direct приводит товар в МФ и проводит его по вкладкам', async ({ page }) => {
    await AuthDMSAdmin(page);

    let itemId = '';

    await test.step('Сделка не AM Direct, контроллинг, трек, товар на вводе в МФ', async () => {
      itemId = (await preparePendingEntryShipment(page)).itemId;
    });

    await test.step('«Введен в систему» переносит на «Ожидают регистрации»', async () => {
      await stampShipmentDate(page, itemId, 'Введен в систему', 'Ожидают регистрации');
    });

    await test.step('«Зарегистрирован на складе» переносит на «Ожидают форвардинга»', async () => {
      await stampShipmentDate(page, itemId, 'Зарегистрирован на складе', 'Ожидают форвардинга');
    });

    await test.step('«Отправлен» переносит на «Отправленные»', async () => {
      await stampShipmentDate(page, itemId, 'Отправлен', 'Отправленные');
    });
  });
});
