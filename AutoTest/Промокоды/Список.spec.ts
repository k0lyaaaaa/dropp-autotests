import { expect, test } from '@playwright/test';
import {
  GIFT_CARD_COLUMNS,
  PROMOCODE_COLUMNS,
  giftCardSearch,
  openGiftCardsTab,
  openPromocodes,
  pageSizeSelect,
  promocodeSearch,
  searchPromocodes,
  uniquePromocodeCode,
  visibleBrowser,
} from '../helpers/promocodes';

test.use(visibleBrowser);
test.setTimeout(180000);

test.describe('Промокоды → список', () => {
  test('раздел открывается из меню и показывает обе вкладки', async ({ page }) => {
    await openPromocodes(page);

    await expect(page).toHaveURL(/\/promocodes/);
    await expect(page.getByRole('tab', { name: 'Промокоды', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByRole('tab', { name: 'Подарочные карты' })).toBeVisible();
    await expect(promocodeSearch(page)).toBeVisible();

    for (const column of PROMOCODE_COLUMNS) {
      await expect(page.getByRole('columnheader').getByText(column, { exact: true })).toBeVisible();
    }

    await openGiftCardsTab(page);
    await expect(page.getByRole('tab', { name: 'Подарочные карты', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    for (const column of GIFT_CARD_COLUMNS) {
      await expect(page.getByRole('columnheader').getByText(column, { exact: true })).toBeVisible();
    }
    await expect(giftCardSearch(page)).toBeVisible();

    const promocodesLoaded = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.ok() &&
        new URL(response.url()).pathname.endsWith('/dms/appsmith/promocodes'),
    );
    await page.getByRole('tab', { name: 'Промокоды', exact: true }).click();
    await promocodesLoaded;
    await expect(page.getByRole('button', { name: 'Создать промокод' })).toBeVisible();
  });

  test('поиск по несуществующему коду показывает пустой список', async ({ page }) => {
    await openPromocodes(page);

    const missing = uniquePromocodeCode();
    await searchPromocodes(page, missing.toLowerCase());

    await expect(promocodeSearch(page)).toHaveValue(missing);
    await expect(page.getByText('Промокоды не найдены')).toBeVisible();
  });

  test('размер страницы меняется, с первой страницы нельзя вернуться назад', async ({ page }) => {
    await openPromocodes(page);

    const previous = page.getByRole('button', { name: 'Перейти на предыдущую страницу' });
    const next = page.getByRole('button', { name: 'Перейти на следующую страницу' });
    await expect(previous).toBeDisabled();

    const pageSize = pageSizeSelect(page);
    await expect(pageSize).toContainText('50');

    const resized = page.waitForResponse((response) => {
      if (response.request().method() !== 'GET' || !response.ok()) return false;
      const url = new URL(response.url());
      return url.pathname.endsWith('/dms/appsmith/promocodes') && url.searchParams.get('limit') === '25';
    });
    await pageSize.click();
    await page.getByRole('option', { name: '25', exact: true }).click();
    await resized;
    await expect(pageSize).toContainText('25');

    if (await next.isEnabled()) {
      await next.click();
      await expect(previous).toBeEnabled();
      await previous.click();
      await expect(previous).toBeDisabled();
    }
  });
});
