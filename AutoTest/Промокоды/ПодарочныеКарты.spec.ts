import { expect, test } from '@playwright/test';
import {
  chooseGiftCardFormat,
  giftCardForm,
  openCreateGiftCard,
  openGiftCardsTab,
  openPromocodes,
  searchGiftCards,
  uniqueEmail,
  visibleBrowser,
} from '../helpers/promocodes';

test.use(visibleBrowser);
test.setTimeout(240000);

async function fillVirtualRequired(
  page: import('@playwright/test').Page,
  recipientEmail: string,
) {
  const form = giftCardForm(page);
  await form.getByLabel('Сумма').fill('10000');
  await expect(form.getByRole('combobox', { name: 'Дизайн' })).toBeEnabled({ timeout: 20000 });
  await form.getByLabel('Email получателя').fill(recipientEmail);
  await form.getByLabel('Имя получателя').fill('Автотест');
  await form.getByLabel('Email отправителя').fill(uniqueEmail('sender'));
}

test.describe('Промокоды → подарочные карты', () => {
  test('виртуальная карта не создаётся с пустой формой, мелкой суммой и длинным пожеланием', async ({
    page,
  }) => {
    await openPromocodes(page);
    await openGiftCardsTab(page);
    await openCreateGiftCard(page);
    const form = giftCardForm(page);

    await form.getByRole('button', { name: 'Создать', exact: true }).click();
    await expect(form.getByText('Укажите сумму')).toBeVisible();
    await expect(form.getByText('Укажите email').first()).toBeVisible();
    await expect(form.getByText('Обязательное поле')).toBeVisible();

    await form.getByLabel('Сумма').fill('10.5');
    await form.getByRole('button', { name: 'Создать', exact: true }).click();
    await expect(form.getByText('Сумма должна быть целым числом')).toBeVisible();

    await form.getByLabel('Сумма').fill('999');
    await form.getByRole('button', { name: 'Создать', exact: true }).click();
    await expect(form.getByText('Сумма должна быть от 10 000 до 3 000 000')).toBeVisible();

    await fillVirtualRequired(page, uniqueEmail('gift'));
    await form.getByLabel('Пожелание').fill('а'.repeat(241));
    await form.getByRole('button', { name: 'Создать', exact: true }).click();
    await expect(form.getByText('Сообщение не должно превышать 240 символов')).toBeVisible();

    await form.getByRole('button', { name: 'Отмена', exact: true }).click();
    await expect(form).toBeHidden();
  });

  test('пластиковая карта показывает адрес и проверяет телефон', async ({ page }) => {
    await openPromocodes(page);
    await openGiftCardsTab(page);
    await openCreateGiftCard(page);
    const form = giftCardForm(page);

    await chooseGiftCardFormat(page, 'Пластиковая');
    await expect(form.getByLabel('Дизайн')).toHaveCount(0);
    await expect(form.getByLabel('Email отправителя')).toHaveCount(0);
    await expect(form.getByLabel('Фамилия получателя')).toBeVisible();
    await expect(form.getByLabel('Телефон получателя')).toBeVisible();
    await expect(form.getByLabel('Город')).toBeVisible();
    await expect(form.getByLabel('Улица')).toBeVisible();
    await expect(form.getByLabel('Квартира')).toBeVisible();
    await expect(form.getByLabel('Индекс')).toBeVisible();

    await form.getByLabel('Сумма').fill('10000');
    await form.getByLabel('Email получателя').fill(uniqueEmail('plastic'));
    await form.getByLabel('Имя получателя').fill('Автотест');
    await form.getByLabel('Фамилия получателя').fill('Тестов');
    await form.getByLabel('Телефон получателя').fill('123');
    await form.getByLabel('Город').fill('Москва');
    await form.getByLabel('Улица').fill('Тверская 1');
    await form.getByLabel('Квартира').fill('10');
    await form.getByLabel('Индекс').fill('101000');
    await form.getByRole('button', { name: 'Создать', exact: true }).click();
    await expect(form.getByText('Введите корректный номер телефона')).toBeVisible();

    await form.getByRole('button', { name: 'Отмена', exact: true }).click();
    await expect(form).toBeHidden();
  });

  test('виртуальная карта создаётся и открывается из поиска', async ({ page }) => {
    await openPromocodes(page);
    await openGiftCardsTab(page);
    await openCreateGiftCard(page);

    const recipientEmail = uniqueEmail('virtual');
    await fillVirtualRequired(page, recipientEmail);

    const created = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.ok() &&
        new URL(response.url()).pathname.endsWith('/dms/appsmith/gift-card'),
    );
    await giftCardForm(page).getByRole('button', { name: 'Создать', exact: true }).click();
    await created;

    const card = page.getByRole('dialog').filter({ hasText: 'Общая информация' });
    await expect(card.getByRole('heading', { name: 'Общая информация' })).toBeVisible();
    await expect(card.getByRole('heading', { name: 'Получатель' })).toBeVisible();
    await expect(card.getByRole('heading', { name: 'Отправитель' })).toBeVisible();
    await expect(card.getByText('Виртуальная')).toBeVisible();
    await expect(card.getByText('10000', { exact: true })).toBeVisible();
    await expect(card.getByText(recipientEmail)).toBeVisible();
    await expect(card.getByRole('heading', { name: 'Связанный промокод' })).toBeVisible();

    await card.getByRole('button', { name: 'Close' }).click();
    await expect(card).toBeHidden();

    await searchGiftCards(page, recipientEmail);
    const row = page.getByRole('row').filter({ hasText: recipientEmail });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Открыть', exact: true }).click();
    await expect(page.getByRole('dialog').filter({ hasText: recipientEmail })).toBeVisible();
  });

  test('пластиковая карта создаётся с адресом доставки', async ({ page }) => {
    await openPromocodes(page);
    await openGiftCardsTab(page);
    await openCreateGiftCard(page);
    const form = giftCardForm(page);

    const recipientEmail = uniqueEmail('plastic-ok');
    await chooseGiftCardFormat(page, 'Пластиковая');
    await form.getByLabel('Сумма').fill('15000');
    await form.getByLabel('Email получателя').fill(recipientEmail);
    await form.getByLabel('Имя получателя').fill('Автотест');
    await form.getByLabel('Фамилия получателя').fill('Тестов');
    await form.getByLabel('Телефон получателя').fill('+79990001122');
    await form.getByLabel('Город').fill('Москва');
    await form.getByLabel('Улица').fill('Тверская 1');
    await form.getByLabel('Квартира').fill('10');
    await form.getByLabel('Индекс').fill('101000');
    await form.getByLabel('Пожелание').fill('Автотест пластиковой карты');

    const created = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.ok() &&
        new URL(response.url()).pathname.endsWith('/dms/appsmith/gift-card'),
    );
    await form.getByRole('button', { name: 'Создать', exact: true }).click();
    await created;

    const card = page.getByRole('dialog').filter({ hasText: 'Общая информация' });
    await expect(card.getByText('Пластиковая')).toBeVisible();
    await expect(card.getByText('15000', { exact: true })).toBeVisible();
    await expect(card.getByText('Тестов')).toBeVisible();
    await expect(card.getByText('+79990001122')).toBeVisible();
    await expect(card.getByText('Адрес доставки')).toBeVisible();
    await expect(card.getByText(recipientEmail)).toBeVisible();
  });
});
