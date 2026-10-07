import { expect, type Page, type Response } from '@playwright/test';
import { AuthDMSAdmin } from './auth';

/**
 * Общие действия раздела «Промокоды».
 *
 * Локаторы живут здесь, а не в каждом тесте: если подпись кнопки изменится,
 * править нужно одно место. Это тот же приём, что Page Object, только функциями —
 * так уже устроены хелперы выкупа.
 *
 * Ждём ответ сервера или конкретный элемент. `waitForTimeout` здесь нет:
 * пауза «на всякий случай» не знает, загрузилась страница или нет.
 */
export const visibleBrowser = {
  headless: true,
  viewport: { width: 1600, height: 1000 },
  permissions: ['clipboard-read', 'clipboard-write'],
};

export const PROMOCODE_COLUMNS = [
  'Код',
  'ID',
  'Тип',
  'Категория',
  'Купон',
  'Скидка / Сумма',
  'Email',
  'Создан',
  'Обновлён',
  'Начало',
  'Окончание',
] as const;

export const GIFT_CARD_COLUMNS = [
  'ID',
  'ID промокода',
  'Статус',
  'Сумма',
  'Формат',
  'Email получателя',
  'Получатель',
  'Email отправителя',
] as const;

const PROMOCODE_TYPES = {
  Промокод: 'Промокод',
  'Персональный промокод': 'Персональный промокод',
  Купон: 'Купон',
  'Персональный купон': 'Персональный купон',
  'Глобальный купон': 'Глобальный купон',
} as const;

export type PromocodeTypeLabel = keyof typeof PROMOCODE_TYPES;

const COUPON_TYPES = new Set<PromocodeTypeLabel>([
  'Купон',
  'Персональный купон',
  'Глобальный купон',
]);

export function uniquePromocodeCode(): string {
  return `AT${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}@example.com`;
}

function pathname(response: Response): string {
  return new URL(response.url()).pathname;
}

function isOkGet(response: Response, endsWith: string): boolean {
  return (
    response.request().method() === 'GET' &&
    response.ok() &&
    pathname(response).endsWith(endsWith)
  );
}

export async function openPromocodes(page: Page): Promise<void> {
  await AuthDMSAdmin(page);

  const section = page.getByRole('link', { name: 'Промокоды', exact: true });
  await section.waitFor({ state: 'visible', timeout: 20000 });

  const listLoaded = page.waitForResponse((response) =>
    isOkGet(response, '/dms/appsmith/promocodes'),
  );
  await section.click();
  await page.waitForURL(/\/promocodes/);
  await listLoaded;

  await expect(page.getByRole('tab', { name: 'Промокоды', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Создать промокод' })).toBeVisible();
}

export async function openGiftCardsTab(page: Page): Promise<void> {
  const listLoaded = page.waitForResponse((response) =>
    isOkGet(response, '/dms/appsmith/gift-cards'),
  );
  await page.getByRole('tab', { name: 'Подарочные карты', exact: true }).click();
  await page.waitForURL(/tab=giftCards/);
  await listLoaded;
  await expect(page.getByRole('button', { name: 'Создать подарочную карту' })).toBeVisible();
}

export function promocodeSearch(page: Page) {
  return page.getByPlaceholder('Поиск по коду');
}

export function giftCardSearch(page: Page) {
  return page.getByRole('tabpanel').getByRole('textbox', { name: /Поиск/ });
}

export async function searchPromocodes(page: Page, code: string): Promise<void> {
  const expected = code.trim().toUpperCase();
  const found = page.waitForResponse((response) => {
    if (!isOkGet(response, '/dms/appsmith/promocodes')) return false;
    return new URL(response.url()).searchParams.get('code') === expected;
  });
  await promocodeSearch(page).fill(code);
  await found;
}

export async function searchGiftCards(page: Page, query: string): Promise<void> {
  const found = page.waitForResponse((response) => {
    if (!isOkGet(response, '/dms/appsmith/gift-cards')) return false;
    return new URL(response.url()).searchParams.get('query') === query.trim();
  });
  await giftCardSearch(page).fill(query);
  await found;
}

export function promocodeForm(page: Page) {
  return page.getByRole('dialog').filter({ has: page.getByLabel('Код') });
}

export function detailDialog(page: Page, code: string) {
  return page.getByRole('dialog', { name: code, exact: true });
}

export async function openCreatePromocode(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Создать промокод' }).click();
  await expect(promocodeForm(page)).toBeVisible();
}

export async function choosePromocodeType(page: Page, type: PromocodeTypeLabel): Promise<void> {
  const typeSelect = promocodeForm(page).getByLabel('Тип');
  await typeSelect.selectOption({ label: type });
  await expect(typeSelect).toHaveValue(typeValue(type));
}

function typeValue(type: PromocodeTypeLabel): string {
  switch (type) {
    case 'Промокод':
      return 'promocode';
    case 'Персональный промокод':
      return 'personal-promocode';
    case 'Купон':
      return 'coupon';
    case 'Персональный купон':
      return 'personal-coupon';
    case 'Глобальный купон':
      return 'global-coupon';
  }
}

export async function chooseCategory(page: Page, category = 'Акция'): Promise<void> {
  await promocodeForm(page).getByRole('combobox', { name: 'Категория' }).click();
  await page.getByRole('option', { name: category, exact: true }).click();
}

type CreatePromocodeInput = {
  type?: PromocodeTypeLabel;
  code?: string;
  category?: string;
  discount?: string;
  email?: string;
  minOrderCost?: string;
  once?: boolean;
};

export async function createPromocode(
  page: Page,
  input: CreatePromocodeInput = {},
): Promise<string> {
  const type = input.type ?? 'Промокод';
  const code = (input.code ?? uniquePromocodeCode()).toUpperCase();

  await openCreatePromocode(page);
  await choosePromocodeType(page, type);

  const form = promocodeForm(page);
  await form.getByLabel('Код').fill(code);
  await chooseCategory(page, input.category ?? 'Акция');
  await form.getByLabel(COUPON_TYPES.has(type) ? 'Сумма баланса' : 'Скидка, %').fill(
    input.discount ?? '10',
  );

  if (input.email) await form.getByLabel('Email').fill(input.email);
  if (input.minOrderCost) {
    await form.getByLabel('Минимальная сумма заказа').fill(input.minOrderCost);
  }
  if (input.once) await form.getByRole('checkbox', { name: 'Однократно' }).click();

  const created = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.ok() &&
      pathname(response).endsWith('/dms/appsmith/promocode'),
  );
  await form.getByRole('button', { name: 'Создать', exact: true }).click();
  await created;

  await expect(detailDialog(page, code)).toBeVisible();
  return code;
}

export async function closeDialog(page: Page, name: string): Promise<void> {
  const dialog = page.getByRole('dialog', { name, exact: true });
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
}

export async function deleteOpenPromocode(page: Page, code: string): Promise<void> {
  const detail = detailDialog(page, code);
  await detail.getByRole('button', { name: 'Удалить', exact: true }).click();

  const confirm = page.getByRole('dialog', { name: 'Удаление промокода', exact: true });
  await expect(confirm).toContainText(code);

  const deleted = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.ok() &&
      pathname(response).endsWith('/dms/appsmith/promocode-delete'),
  );
  await confirm.getByRole('button', { name: 'Удалить', exact: true }).click();
  await deleted;
  await expect(detail).toBeHidden();
}

export function pageSizeSelect(page: Page) {
  return page
    .getByRole('tabpanel')
    .getByText('Строк на странице', { exact: true })
    .locator('..')
    .getByRole('combobox');
}

export function giftCardForm(page: Page) {
  return page.getByRole('dialog', { name: 'Создать подарочную карту', exact: true });
}

export async function openCreateGiftCard(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Создать подарочную карту' }).click();
  await expect(giftCardForm(page)).toBeVisible();
}

/** «Формат» — обычный select без связи с подписью. Рядом лежит скрытый select дизайна. */
export async function chooseGiftCardFormat(page: Page, format: 'Виртуальная' | 'Пластиковая'): Promise<void> {
  await giftCardForm(page).getByRole('combobox').first().selectOption({ label: format });
}
