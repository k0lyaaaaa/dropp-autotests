import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { conductRandomAwaitingItem } from '../helpers/conductPurchaseDeal';
import {
  markBuyoutErrors,
  openControllingSection,
  searchControllingItems,
  sendManualItemToSuccessful,
  waitForControllingPlacement,
  type ControllingPlacement,
} from '../helpers/controlling';

test.use({
  headless: true,
});

const ERROR_CASES = [
  ['Неверный товар'],
  ['Неверный размер'],
  ['Неверный товар', 'Неверный размер'],
];

test.describe('Контроллинг → ошибка в товаре', () => {
  test.setTimeout(1800000);

  test('три ошибки в «Успешные» и три в «Ручная проверка»', async ({ page }) => {
    await AuthDMSAdmin(page);

    const pending: Record<ControllingPlacement, string[][]> = {
      auto: ERROR_CASES.map((reasons) => [...reasons]),
      manual: ERROR_CASES.map((reasons) => [...reasons]),
    };

    for (let attempt = 0; attempt < 12; attempt += 1) {
      if (pending.auto.length === 0 && pending.manual.length === 0) return;

      const itemId = await conductRandomAwaitingItem(page);
      await openControllingSection(page);
      await searchControllingItems(page, itemId);
      let placement = await waitForControllingPlacement(page, itemId);
      // Кейсы ручной проверки уже закрыты, а «Успешные» ещё нет.
      // «Успешно» переносит этот товар, и ошибку выбираем уже там.
      if (placement === 'manual' && pending.manual.length === 0 && pending.auto.length > 0) {
        await sendManualItemToSuccessful(page, itemId);
        placement = 'auto';
      }

      const reasons = pending[placement].shift();
      if (!reasons) continue;

      const section = placement === 'auto' ? 'Успешные' : 'Ручная проверка';
      await test.step(`«${section}»: ${reasons.join(' и ')}`, async () => {
        await markBuyoutErrors(page, itemId, reasons);
      });
    }

    const left = [
      pending.auto.length > 0 ? `«Успешные» — ${pending.auto.length}` : '',
      pending.manual.length > 0 ? `«Ручная проверка» — ${pending.manual.length}` : '',
    ].filter(Boolean);
    throw new Error(`Не хватило товаров из «Ожидают». Осталось: ${left.join(', ')}`);
  });
});
