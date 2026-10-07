import { expect, test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import {
  expectAutoForwardOff,
  expectDispatchBlocked,
  openAndCloseOutgoingTrack,
  preparePendingEntryShipment,
  setHoldAtWarehouse,
  stampDateInPlace,
  stampShipmentDate,
  visibleBrowser,
} from '../helpers/merchantToMf';

test.use(visibleBrowser);

test.describe('Отправления до МФ → форвардинг', () => {
  test.setTimeout(900000);

  test('со спецуслугой автоотправление выключено, товар уходит только вручную', async ({
    page,
  }) => {
    await AuthDMSAdmin(page);

    const { itemId, trackNumber } = await preparePendingEntryShipment(page);
    await setHoldAtWarehouse(page, itemId);

    await stampShipmentDate(page, itemId, 'Введен в систему', 'Ожидают регистрации');
    await stampShipmentDate(page, itemId, 'Зарегистрирован на складе', 'Ожидают форвардинга');

    await expectAutoForwardOff(page, itemId);
    await openAndCloseOutgoingTrack(page, itemId);

    await expectDispatchBlocked(page, itemId);
    await stampDateInPlace(page, itemId, 'Услуга применена');
    await stampShipmentDate(page, itemId, 'Отправлен', 'Отправленные');

    await expect(page.getByRole('row').filter({ hasText: itemId })).toContainText(trackNumber);
  });
});
