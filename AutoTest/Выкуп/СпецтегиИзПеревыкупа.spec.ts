import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { moveRandomItemToRepurchase } from '../helpers/purchaseRepurchase';
import {
  expectItemInThreadTab,
  OPEN_THREAD_TRIGGER,
  PURCHASE_THREAD_TAG_CASES,
  sendItemToThreadTag,
} from '../helpers/purchaseThreadTags';

test.use({
  headless: true,
});

test.describe.configure({ mode: 'serial' });

test.describe('Выкуп → Перевыкуп → спецтег обсуждения', () => {
  test.setTimeout(900000);

  for (const item of PURCHASE_THREAD_TAG_CASES) {
    test(`${item.section}: товар уходит в «${item.tab}» с причиной «${item.reason}»`, async ({
      page,
    }) => {
      await AuthDMSAdmin(page);
      const itemId = await moveRandomItemToRepurchase(page);
      // Ошибка контроллинга уже оставляет комментарий, поэтому кнопка
      // может называться не «Начать обсуждение».
      await sendItemToThreadTag(page, itemId, item, OPEN_THREAD_TRIGGER);
      await expectItemInThreadTab(page, itemId, item);
    });
  }
});
