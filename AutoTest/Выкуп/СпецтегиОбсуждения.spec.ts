import { test } from '@playwright/test';
import { AuthDMSAdmin } from '../helpers/auth';
import { openAwaitingPurchaseTab, readRandomAwaitingItemId } from '../helpers/purchaseAwaiting';
import {
  expectItemInThreadTab,
  PURCHASE_THREAD_TAG_CASES,
  sendItemToThreadTag,
} from '../helpers/purchaseThreadTags';

test.use({
  headless: true,
});

test.describe.configure({ mode: 'serial' });

test.describe('Выкуп → Ожидают → спецтег обсуждения', () => {
  test.setTimeout(420000);

  for (const item of PURCHASE_THREAD_TAG_CASES) {
    test(`${item.section}: товар уходит в «${item.tab}» с причиной «${item.reason}»`, async ({
      page,
    }) => {
      await AuthDMSAdmin(page);
      await openAwaitingPurchaseTab(page);
      const itemId = await readRandomAwaitingItemId(page);

      await sendItemToThreadTag(page, itemId, item);
      await expectItemInThreadTab(page, itemId, item);
    });
  }
});
