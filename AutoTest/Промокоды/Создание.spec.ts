import { expect, test } from '@playwright/test';
import {
  chooseCategory,
  choosePromocodeType,
  createPromocode,
  deleteOpenPromocode,
  detailDialog,
  openCreatePromocode,
  openPromocodes,
  promocodeForm,
  uniqueEmail,
  uniquePromocodeCode,
  visibleBrowser,
} from '../helpers/promocodes';

test.use(visibleBrowser);
test.setTimeout(240000);

test.describe('Промокоды → создание', () => {
  test('пустая и некорректная форма не создаёт промокод', async ({ page }) => {
    await openPromocodes(page);
    await openCreatePromocode(page);
    const form = promocodeForm(page);

    await form.getByRole('button', { name: 'Создать', exact: true }).click();
    await expect(form.getByText('Код должен содержать от 3 до 200 символов')).toBeVisible();
    await expect(form.getByText('Укажите категорию')).toBeVisible();
    await expect(form.getByText('Укажите скидку')).toBeVisible();

    await form.getByLabel('Код').fill('AB');
    await chooseCategory(page);
    await form.getByLabel('Скидка, %').fill('10.5');
    await form.getByRole('button', { name: 'Создать', exact: true }).click();
    await expect(form.getByText('Код должен содержать от 3 до 200 символов')).toBeVisible();
    await expect(form.getByText('Значение должно быть целым числом')).toBeVisible();

    await form.getByLabel('Код').fill(uniquePromocodeCode());
    await form.getByLabel('Скидка, %').fill('0');
    await form.getByRole('button', { name: 'Создать', exact: true }).click();
    await expect(form.getByText('Скидка должна быть от 1 до 99')).toBeVisible();

    await choosePromocodeType(page, 'Персональный промокод');
    await form.getByLabel('Скидка, %').fill('10');
    await form.getByRole('button', { name: 'Создать', exact: true }).click();
    await expect(form.getByText('Укажите email')).toBeVisible();

    await form.getByLabel('Email').fill('не-email');
    await form.getByRole('button', { name: 'Создать', exact: true }).click();
    await expect(form.getByText('Введите корректный email')).toBeVisible();

    await choosePromocodeType(page, 'Купон');
    await form.getByLabel('Сумма баланса').fill('-1');
    await form.getByRole('button', { name: 'Создать', exact: true }).click();
    await expect(form.getByText('Сумма должна быть не меньше 0')).toBeVisible();

    await choosePromocodeType(page, 'Промокод');
    await form.getByLabel('Скидка, %').fill('10');
    await form.getByLabel('Окончание действия').fill('01.01.2020 12:00');
    await form.getByLabel('Код').click();
    await form.getByRole('button', { name: 'Создать', exact: true }).click();
    await expect(form.getByText('Дата окончания должна быть в будущем')).toBeVisible();

    await form.getByRole('button', { name: 'Отмена', exact: true }).click();
    await expect(form).toBeHidden();
  });

  test('тип промокода показывает свои поля и не стирает код', async ({ page }) => {
    await openPromocodes(page);
    await openCreatePromocode(page);
    const form = promocodeForm(page);
    const code = uniquePromocodeCode();

    await form.getByLabel('Код').fill(code);

    await choosePromocodeType(page, 'Купон');
    await expect(form.getByLabel('Сумма баланса')).toBeVisible();
    await expect(form.getByLabel('Email')).toHaveCount(0);
    await expect(form.getByRole('button', { name: 'Категории' })).toHaveCount(0);
    await expect(form.getByLabel('Код')).toHaveValue(code);

    await choosePromocodeType(page, 'Персональный промокод');
    await expect(form.getByLabel('Скидка, %')).toBeVisible();
    await expect(form.getByLabel('Email')).toBeVisible();
    await expect(form.getByLabel('Минимальная сумма заказа')).toBeVisible();
    await expect(form.getByRole('button', { name: 'Категории' })).toBeVisible();
    await expect(form.getByLabel('Код')).toHaveValue(code);

    await choosePromocodeType(page, 'Персональный купон');
    await expect(form.getByLabel('Сумма баланса')).toBeVisible();
    await expect(form.getByLabel('Email')).toBeVisible();
    await expect(form.getByLabel('Минимальная сумма заказа')).toHaveCount(0);
    await expect(form.getByRole('button', { name: 'Категории' })).toHaveCount(0);

    await choosePromocodeType(page, 'Глобальный купон');
    await expect(form.getByLabel('Сумма баланса')).toBeVisible();
    await expect(form.getByLabel('Минимальная сумма заказа')).toBeVisible();
    await expect(form.getByRole('checkbox', { name: 'Только первая покупка' })).toBeVisible();
    await expect(form.getByRole('checkbox', { name: 'Однократно' })).toBeVisible();
    await expect(form.getByRole('button', { name: 'Категории' })).toHaveCount(0);
    await expect(form.getByLabel('Код')).toHaveValue(code);

    await choosePromocodeType(page, 'Промокод');
    await expect(
      form.getByRole('checkbox', { name: 'Активация только в мобильном приложении' }),
    ).toBeVisible();

    const categories = form.getByRole('button', { name: 'Категории' });
    const merchants = form.getByRole('button', { name: 'Мерчанты' });
    await expect(merchants).toBeEnabled();
    await categories.click();
    const scopeOption = page
      .getByPlaceholder('Поиск', { exact: true })
      .locator('..')
      .getByRole('checkbox')
      .first();
    await expect(scopeOption).toBeVisible();
    await scopeOption.click();
    await expect(merchants).toBeDisabled();

    await form.getByRole('button', { name: 'Отмена', exact: true }).click();
    await expect(form).toBeHidden();
  });

  test('процентный промокод создаётся и виден в карточке', async ({ page }) => {
    await openPromocodes(page);

    const code = await createPromocode(page, {
      discount: '15',
      minOrderCost: '5000',
      once: true,
    });

    const card = detailDialog(page, code);
    await expect(card.getByRole('heading', { name: 'Общая информация' })).toBeVisible();
    await expect(card.getByRole('heading', { name: 'Параметры' })).toBeVisible();
    await expect(card.getByRole('heading', { name: 'Ограничения' })).toBeVisible();
    await expect(card.getByRole('heading', { name: 'Статистика' })).toBeVisible();
    await expect(card.getByText('15%')).toBeVisible();
    await expect(card.getByText('Глобальный')).toBeVisible();
    await expect(card.getByText('Акция')).toBeVisible();
    await expect(card.getByText('5 000.00 RUB')).toBeVisible();
    await expect(card.getByText('Однократно')).toBeVisible();
    await expect(card.getByText('Всего покупателей')).toBeVisible({ timeout: 20000 });
    await expect(card.getByLabel('Дата от')).toBeVisible();
    await expect(card.getByLabel('Дата до')).toBeVisible();

    await deleteOpenPromocode(page, code);
  });

  test('персональный промокод требует email и сохраняет его', async ({ page }) => {
    await openPromocodes(page);
    const email = uniqueEmail('personal');

    const code = await createPromocode(page, {
      type: 'Персональный промокод',
      email,
      discount: '20',
    });

    const card = detailDialog(page, code);
    await expect(card.getByText('Персональный')).toBeVisible();
    await expect(card.getByText(email)).toBeVisible();
    await expect(card.getByText('20%')).toBeVisible();

    await deleteOpenPromocode(page, code);
  });
});
