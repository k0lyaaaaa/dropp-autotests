import { expect, type Page } from '@playwright/test';
import { AuthDMSAdmin } from './auth';
import {
  openAwaitingPurchaseTab,
  purchaseOrderRows,
  readRandomAwaitingItemId,
  searchPurchaseItems,
} from './purchaseAwaiting';

/** Четыре спецтега, которые уводят товар из текущего подраздела. */
export const PURCHASE_THREAD_TAG_CASES: PurchaseThreadTagCase[] = [
  {
    section: 'Проверка товара',
    tag: '#pre-order-check',
    reason: 'Модель',
    tab: 'Preorder check',
    comment: 'Проверка товара: модель',
  },
  {
    section: 'Спецкейс',
    tag: '#special-case',
    reason: 'Alo Yoga',
    tab: 'Спецкейсы',
    comment: 'Спецкейс: Alo Yoga',
  },
  {
    section: 'Невыкуп',
    tag: '#unpurchase',
    reason: 'Out of stock',
    tab: 'Невыкупы',
    comment: 'Невыкуп: нет в наличии',
  },
  {
    section: 'Запрос в КС',
    tag: '#cs-request',
    reason: 'Модель',
    tab: 'Запрос КС',
    comment: 'Запрос КС: модель',
  },
];

export type PurchaseThreadTagCase = {
  /** Заголовок секции в колонке «Спецтэги». */
  section: string;
  /** Плитка владельца, как её рисует фронт: `#cs-request`. */
  tag: string;
  /** Под-тег — причина. Без него бэкенд тред не примет. */
  reason: string;
  /** Вкладка, куда товар уходит после создания треда. */
  tab: string;
  /** Текст комментария, который должен быть виден уже в подразделе. */
  comment: string;
};

function discussionPanel(page: Page) {
  return page.locator('[data-slot="sheet-content"]').filter({ hasText: 'Спецтэги' });
}

/**
 * Одна и та же причина («Модель») есть у нескольких владельцев.
 * После клика по нужному тегу доступна только его причина.
 */
async function enabledReasonButton(panel: ReturnType<typeof discussionPanel>, reason: string) {
  const buttons = panel.getByRole('button', { name: reason, exact: true });
  await expect(buttons.first()).toBeAttached({ timeout: 10000 });

  const count = await buttons.count();
  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    if (await button.isEnabled()) return button;
  }

  throw new Error(`Причина «${reason}» не стала доступной`);
}

/**
 * Иконка обсуждения живёт в колонке Item ID. Спецтег и причина выбираются
 * в секции, а не «первой кнопкой Модель»: одна и та же причина есть и у
 * «Проверки товара», и у «Запроса в КС», и чужая плитка ещё недоступна.
 */
export async function sendItemToThreadTag(
  page: Page,
  orderNumber: string,
  item: PurchaseThreadTagCase,
  triggerName: string | RegExp = 'Начать обсуждение'
): Promise<void> {
  const row = purchaseOrderRows(page, orderNumber).first();
  await row.getByRole('button', { name: triggerName }).click();

  const panel = discussionPanel(page);
  await expect(panel).toBeVisible();

  const owner = panel.getByRole('button', { name: item.tag, exact: true });
  await owner.scrollIntoViewIfNeeded();
  await owner.click();
  const reason = await enabledReasonButton(panel, item.reason);
  await reason.scrollIntoViewIfNeeded();
  if ((await reason.getAttribute('aria-pressed')) !== 'true') await reason.click();

  await panel.getByPlaceholder('Новый комментарий…').fill(item.comment);
  await panel.getByRole('button', { name: 'Отправить', exact: true }).click();

  await expect(page.locator('.Toastify__toast--success').filter({ hasText: item.tab }).last()).toBeVisible({
    timeout: 20000,
  });
}

export async function expectItemInThreadTab(
  page: Page,
  orderNumber: string,
  item: PurchaseThreadTagCase
): Promise<void> {
  const tab = page.getByRole('tab', { name: item.tab, exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute('data-state', 'active');
  await searchPurchaseItems(page, orderNumber);

  const row = purchaseOrderRows(page, orderNumber);
  await expect(async () => {
    if ((await row.count()) !== 1) {
      await page.reload();
      await searchPurchaseItems(page, orderNumber);
    }
    await expect(row).toHaveCount(1, { timeout: 15000 });
  }).toPass({ timeout: 180000 });

  await expect(row).toContainText(item.reason);
  await expect(row).toContainText(item.comment);
}

/** Товар уже с тредом: подпись кнопки зависит от `comment_state` с бэкенда. */
export const OPEN_THREAD_TRIGGER = /Есть открытые запросы|Есть комментарии|Начать обсуждение/;

/** Готовый спецтег вкладки. Причина берётся из общего списка, не из нового заказа. */
export function purchaseThreadCase(tab: string): PurchaseThreadTagCase {
  const found = PURCHASE_THREAD_TAG_CASES.find((item) => item.tab === tab);
  if (found == null) throw new Error(`Нет спецтега для вкладки «${tab}»`);
  return found;
}

/**
 * Товар, который уже лежит в «Ожидают», сразу уходит в нужный подраздел.
 * Новый заказ для одного товара не создаём.
 */
export async function putItemOnPurchaseTab(
  page: Page,
  start: PurchaseThreadTagCase
): Promise<string> {
  await AuthDMSAdmin(page);
  await openAwaitingPurchaseTab(page);
  const itemId = await readRandomAwaitingItemId(page);
  await sendItemToThreadTag(page, itemId, start);
  await expectItemInThreadTab(page, itemId, start);
  return itemId;
}
