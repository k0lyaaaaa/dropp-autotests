import { expect, test } from '@playwright/test';
import {
  closeDialog,
  createPromocode,
  deleteOpenPromocode,
  detailDialog,
  openPromocodes,
  promocodeForm,
  searchPromocodes,
  visibleBrowser,
} from '../helpers/promocodes';

test.use(visibleBrowser);
test.setTimeout(240000);

test.describe('Промокоды → карточка', () => {
  test('клик по коду копирует его, иконка открывает карточку', async ({ page }) => {
    await openPromocodes(page);
    const code = await createPromocode(page, { discount: '11' });
    await closeDialog(page, code);

    await searchPromocodes(page, code);
    const row = page.getByRole('row').filter({ hasText: code });
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: code, exact: true }).click();
    await expect(page.getByText('Copied', { exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(code);
    await expect(detailDialog(page, code)).toBeHidden();

    await row.getByRole('button', { name: 'Открыть', exact: true }).click();
    await expect(detailDialog(page, code)).toBeVisible();
    await deleteOpenPromocode(page, code);
  });

  test('без изменений сохранять нечего, новая скидка записывается', async ({ page }) => {
    await openPromocodes(page);
    const code = await createPromocode(page, { discount: '12' });

    await detailDialog(page, code).getByRole('button', { name: 'Редактировать' }).click();
    const form = promocodeForm(page);
    await expect(page.getByRole('dialog', { name: 'Редактировать промокод' })).toBeVisible();
    await expect(form.getByLabel('Код')).toBeDisabled();
    await expect(form.getByLabel('Код')).toHaveValue(code);

    await form.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await expect(form.getByText('Нет изменений для сохранения')).toBeVisible();

    await form.getByLabel('Скидка, %').fill('33');
    const saved = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.ok() &&
        new URL(response.url()).pathname.endsWith('/dms/appsmith/promocode-update'),
    );
    await form.getByRole('button', { name: 'Сохранить', exact: true }).click();
    await saved;

    await expect(page.getByRole('dialog', { name: 'Редактировать промокод' })).toBeHidden();
    await expect(detailDialog(page, code).getByText('33%')).toBeVisible();
    await deleteOpenPromocode(page, code);
  });

  test('удалённый промокод больше не находится поиском', async ({ page }) => {
    await openPromocodes(page);
    const code = await createPromocode(page, { discount: '8' });

    await deleteOpenPromocode(page, code);
    await searchPromocodes(page, code);
    await expect(page.getByText('Промокоды не найдены')).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: code })).toHaveCount(0);
  });

  test('баланс купона не принимает дробь и пополняется целой суммой', async ({ page }) => {
    await openPromocodes(page);
    const created = await createPromocode(page, { type: 'Купон', discount: '100' });
    let card = detailDialog(page, created);
    let ownCode: string | null = created;

    if ((await card.getByRole('heading', { name: 'Пополнить баланс' }).count()) === 0) {
      await deleteOpenPromocode(page, created);
      ownCode = null;
      const listed = await openListedCoupon(page);
      card = detailDialog(page, listed);
    } else {
      await expect(card.getByText('100', { exact: true })).toBeVisible();
    }

    await expect(card.getByRole('heading', { name: 'Пополнить баланс' })).toBeVisible();
    await expect(card.getByText('Баланс', { exact: true })).toBeVisible();

    const amount = card.getByPlaceholder('RUB');
    await amount.fill('1.5');
    await card.getByRole('button', { name: 'Пополнить', exact: true }).click();
    await expect(card.getByText('Сумма должна быть целым числом')).toBeVisible();

    await amount.fill('25');
    const toppedUp = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.ok() &&
        new URL(response.url()).pathname.endsWith('/dms/appsmith/promocode-add-balance'),
    );
    await card.getByRole('button', { name: 'Пополнить', exact: true }).click();
    await toppedUp;
    await expect(amount).toHaveValue('');
    await expect(card.getByText('Сумма должна быть целым числом')).toHaveCount(0);

    if (ownCode) await deleteOpenPromocode(page, ownCode);
  });
});

/** Стенд иногда сохраняет новый «Купон» как обычный промокод без блока баланса. */
async function openListedCoupon(page: import('@playwright/test').Page): Promise<string> {
  const headers = page.getByRole('columnheader');
  const headerCount = await headers.count();
  let couponIndex = -1;

  for (let index = 0; index < headerCount; index += 1) {
    const name = (await headers.nth(index).innerText()).replace(/\s+/g, ' ').trim();
    if (name === 'Купон' || name.startsWith('Купон ')) couponIndex = index;
  }
  if (couponIndex === -1) throw new Error('Колонка «Купон» не найдена');

  const rows = page.getByRole('row');
  const rowCount = await rows.count();
  for (let index = 0; index < rowCount; index += 1) {
    const row = rows.nth(index);
    const cells = row.getByRole('cell');
    if ((await cells.count()) <= couponIndex) continue;
    if ((await cells.nth(couponIndex).innerText()).replace(/\s+/g, ' ').trim() !== 'Да') continue;

    await row.getByRole('button', { name: 'Открыть', exact: true }).click();
    const card = page.getByRole('dialog').filter({
      has: page.getByRole('heading', { name: 'Пополнить баланс' }),
    });
    await expect(card).toBeVisible();
    return (await card.getByRole('heading').first().innerText()).trim();
  }

  throw new Error('В списке нет купона, у которого можно пополнить баланс');
}
