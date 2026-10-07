import { expect, Locator, Page, test } from '@playwright/test';
import { conductRandomAwaitingItem } from './conductPurchaseDeal';

function orderRows(page: Page, orderNumber: string) {
  return page.getByRole('row').filter({ hasText: orderNumber });
}

export async function openControllingSection(page: Page): Promise<void> {
  const link = page.getByRole('link', { name: 'Контроллинг', exact: true });
  await link.waitFor({ state: 'visible', timeout: 20000 });
  await link.click();
  await page.waitForURL(/\/controlling-items/);
}

/** Поиск в тулбаре дебаунсится, поэтому ждём запрос списка с этим номером. */
export async function searchControllingItems(page: Page, query: string): Promise<void> {
  const input = page.locator('[data-slot="table-toolbar-search"] input');
  await input.waitFor({ state: 'visible', timeout: 15000 });

  const listLoaded = page.waitForResponse(
    (response) =>
      response.url().includes('/dms/tables/controlling') &&
      response.url().includes(encodeURIComponent(query)) &&
      response.ok()
  );
  await input.fill(query);
  await listLoaded;
}

async function openTab(page: Page, name: string): Promise<void> {
  const tab = page.getByRole('tab', { name, exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute('data-state', 'active');
}

async function hasOrderRow(page: Page, orderNumber: string): Promise<boolean> {
  return (await orderRows(page, orderNumber).count()) === 1;
}

/** Подпись вкладки без счётчика: он в разметке, но в имя роли не входит. */
async function selectedTabName(page: Page): Promise<string> {
  return page.getByRole('tab', { selected: true }).evaluate((element) => {
    const clone = element.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[aria-hidden="true"]').forEach((node) => node.remove());
    return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
  });
}

/**
 * Решение и статус запроса КС в строке не перерисовываются сразу после PATCH.
 * Запрос уже успешен — рефреш заново грузит список, и ячейка показывает ответ.
 */
async function reloadControllingItem(page: Page, orderNumber: string): Promise<void> {
  const tabName = await selectedTabName(page);
  const listLoaded = page.waitForResponse(
    (response) => response.url().includes('/dms/tables/controlling') && response.ok()
  );
  await page.reload();
  await listLoaded;

  const input = page.locator('[data-slot="table-toolbar-search"] input');
  await input.waitFor({ state: 'visible', timeout: 15000 });
  if ((await input.inputValue()) !== orderNumber) {
    await searchControllingItems(page, orderNumber);
  }

  await openTab(page, tabName);
  await expect(orderRows(page, orderNumber)).toHaveCount(1, { timeout: 20000 });
}

async function clickManualSuccess(page: Page, orderNumber: string): Promise<void> {
  await orderRows(page, orderNumber).getByRole('button', { name: 'Успешно', exact: true }).click();
  await expect(page.locator('.Toastify__toast--info').filter({ hasText: 'Успешные' }).last()).toBeVisible({
    timeout: 20000,
  });
}

async function expectOnSuccessfulTab(page: Page, orderNumber: string): Promise<void> {
  await openTab(page, 'Успешные');
  await expect(orderRows(page, orderNumber)).toHaveCount(1);
}

/**
 * Ждём, куда автоконтроллинг положит товар.
 * «auto» — он уже в «Успешные», кнопку жать некуда.
 * «manual» — сами нажали «Успешно» на ручной или дополнительной проверке.
 */
export async function passControlling(page: Page, orderNumber: string): Promise<'auto' | 'manual'> {
  let outcome: 'auto' | 'manual' = 'auto';

  await expect(async () => {
    await openTab(page, 'Успешные');
    if (await hasOrderRow(page, orderNumber)) {
      outcome = 'auto';
      return;
    }

    for (const tabName of ['Ручная проверка', 'Доп. проверка']) {
      await openTab(page, tabName);
      if (!(await hasOrderRow(page, orderNumber))) continue;
      await clickManualSuccess(page, orderNumber);
      outcome = 'manual';
      return;
    }

    await page.reload();
    throw new Error('Товар ещё не вышел из автоконтроллинга');
  }).toPass({ timeout: 180000 });

  await expectOnSuccessfulTab(page, orderNumber);
  return outcome;
}

/**
 * Вторая сделка, когда первая уже прошла сама. Кнопку «Успешно» можно
 * нажать только с ручной или дополнительной проверки.
 */
export async function passControllingManually(page: Page, orderNumber: string): Promise<void> {
  await expect(async () => {
    for (const tabName of ['Ручная проверка', 'Доп. проверка']) {
      await openTab(page, tabName);
      if (!(await hasOrderRow(page, orderNumber))) continue;
      await clickManualSuccess(page, orderNumber);
      return;
    }

    await page.reload();
    throw new Error('Товар ещё не на ручной проверке');
  }).toPass({ timeout: 180000 });

  await expectOnSuccessfulTab(page, orderNumber);
}

/** «Успешно» на ручной или доп. проверке переносит товар в «Успешные». */
export async function sendManualItemToSuccessful(page: Page, orderNumber: string): Promise<void> {
  await clickManualSuccess(page, orderNumber);
  await expectOnSuccessfulTab(page, orderNumber);
}

export type ControllingPlacement = 'auto' | 'manual';

/**
 * Куда автоконтроллинг положил товар: «Успешные» или ручная/доп. проверка.
 * Кнопку «Успешно» не жмём — строка остаётся там, где её нашли.
 */
export async function waitForControllingPlacement(
  page: Page,
  orderNumber: string
): Promise<ControllingPlacement> {
  let placement: ControllingPlacement = 'auto';

  await expect(async () => {
    await openTab(page, 'Успешные');
    if (await hasOrderRow(page, orderNumber)) {
      placement = 'auto';
      return;
    }

    for (const tabName of ['Ручная проверка', 'Доп. проверка']) {
      await openTab(page, tabName);
      if (!(await hasOrderRow(page, orderNumber))) continue;
      placement = 'manual';
      return;
    }

    await page.reload();
    throw new Error('Товар ещё не вышел из автоконтроллинга');
  }).toPass({ timeout: 180000 });

  return placement;
}

async function columnCell(page: Page, row: Locator, header: string): Promise<Locator> {
  const headers = page.getByRole('columnheader');
  const count = await headers.count();

  for (let index = 0; index < count; index += 1) {
    const name = (await headers.nth(index).innerText()).replace(/\s+/g, ' ').trim();
    if (name === header || name.startsWith(`${header} `)) return row.getByRole('cell').nth(index);
  }

  throw new Error(`Колонка «${header}» не найдена`);
}

/**
 * Колонка «Ошибка выкупа»: галочки причин, затем обязательный комментарий.
 * Товар уходит в «Ошибки выкупа», и там эти причины уже только читаются.
 */
export async function markBuyoutErrors(
  page: Page,
  orderNumber: string,
  reasons: readonly string[]
): Promise<void> {
  const row = orderRows(page, orderNumber);
  await expect(row).toHaveCount(1);
  const cell = await columnCell(page, row, 'Ошибка выкупа');

  await cell.getByRole('button', { name: 'Не выбрано', exact: true }).click();
  for (const reason of reasons) {
    await page.getByRole('menuitemcheckbox', { name: reason, exact: true }).click();
  }
  // Меню модальное: пока оно открыто, галочку «Подтвердить» рядом не нажать.
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-slot="dropdown-menu-content"]')).toBeHidden();

  await cell.getByRole('button', { name: 'Подтвердить', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: /Ошибка выкупа/ })).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Оставьте комментарий' }).fill('Автотест: ошибка в товаре');
  const confirm = dialog.getByRole('button', { name: 'Подтвердить', exact: true });
  await expect(confirm).toBeEnabled();
  await confirm.click();

  await expect(
    page.locator('.Toastify__toast--info').filter({ hasText: 'Ошибки выкупа' }).last()
  ).toBeVisible({ timeout: 20000 });

  await openTab(page, 'Ошибки выкупа');
  const moved = orderRows(page, orderNumber);
  await expect(moved).toHaveCount(1);
  const result = await columnCell(page, moved, 'Ошибка выкупа');
  for (const reason of reasons) {
    await expect(result).toContainText(reason);
  }
}

/**
 * Колонка «Доп. проверка» на вкладке «Ручная проверка».
 * Вердикт `additional_check` бэкенд принимает только отсюда: галочки
 * «Проверить товар» / «Проверить размер», затем обязательный комментарий.
 * Товар уходит в «Доп. проверка», и там эти причины уже только читаются.
 */
export async function requestAdditionalCheck(
  page: Page,
  orderNumber: string,
  reasons: readonly string[],
  comment = 'Автотест: доп. проверка'
): Promise<void> {
  await openTab(page, 'Ручная проверка');
  const row = orderRows(page, orderNumber);
  await expect(row).toHaveCount(1);
  const cell = await columnCell(page, row, 'Доп. проверка');
  await cell.scrollIntoViewIfNeeded();

  await cell.getByRole('button', { name: 'Не выбрано', exact: true }).click();
  for (const reason of reasons) {
    await page.getByRole('menuitemcheckbox', { name: reason, exact: true }).click();
  }
  // Меню модальное: пока оно открыто, галочку «Подтвердить» рядом не нажать.
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-slot="dropdown-menu-content"]')).toBeHidden();

  await cell.getByRole('button', { name: 'Подтвердить', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: /Доп\. проверка/ })).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Оставьте комментарий' }).fill(comment);
  const confirm = dialog.getByRole('button', { name: 'Подтвердить', exact: true });
  await expect(confirm).toBeEnabled();
  await confirm.click();

  await expect(
    page.locator('.Toastify__toast--info').filter({ hasText: 'Доп. проверка' }).last()
  ).toBeVisible({ timeout: 20000 });

  await openTab(page, 'Доп. проверка');
  const moved = orderRows(page, orderNumber);
  await expect(moved).toHaveCount(1);
  const result = await columnCell(page, moved, 'Доп. проверка');
  for (const reason of reasons) {
    await expect(result).toContainText(reason);
  }
  await expect(await columnCell(page, moved, '#controlling-check')).toContainText(comment);
}

/**
 * Колонка «#controlling-cs-request» на «Доп. проверке», «Успешных»
 * и «Ошибках выкупа». Пока запроса нет — это поле «Запрос в КС».
 * После «Отправить» поле пропадает, и в ячейке остаётся текст открытого запроса.
 * Товар при этом остаётся на той же вкладке.
 */
export async function requestControllingCs(
  page: Page,
  orderNumber: string,
  tab: 'Доп. проверка' | 'Успешные' | 'Ошибки выкупа',
  text = 'Автотест: запрос в КС'
): Promise<void> {
  await openTab(page, tab);
  const row = orderRows(page, orderNumber);
  await expect(row).toHaveCount(1);
  const cell = await columnCell(page, row, '#controlling-cs-request');
  await cell.scrollIntoViewIfNeeded();

  const input = cell.getByRole('textbox', { name: 'Запрос в КС' });
  await input.fill(text);
  const send = cell.getByRole('button', { name: 'Отправить', exact: true });
  await expect(send).toBeEnabled();
  await send.click();

  await expect(cell).toContainText(text, { timeout: 20000 });
  await expect(input).toBeHidden();
}

const ADDITIONAL_CHECK_REASON = 'Проверить товар';
const BUYOUT_ERROR_REASON = 'Неверный товар';

/**
 * Доп. проверку можно запросить только с «Ручной проверки».
 * Автоконтроллинг часто кладёт товар сразу в «Успешные» — тогда берём следующий.
 */
export async function putItemOnAdditionalCheck(page: Page): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const itemId = await conductRandomAwaitingItem(page);
    await openControllingSection(page);
    await searchControllingItems(page, itemId);
    const placement = await waitForControllingPlacement(page, itemId);
    if (placement !== 'manual') continue;

    const manualTab = page.getByRole('tab', { name: 'Ручная проверка', exact: true });
    if ((await manualTab.getAttribute('data-state')) !== 'active') continue;

    await requestAdditionalCheck(page, itemId, [ADDITIONAL_CHECK_REASON]);
    return itemId;
  }

  throw new Error('Не удалось получить товар на ручной проверке');
}

/** Ошибку выкупа можно поставить и с «Успешных», и с ручной проверки. */
export async function putItemOnBuyoutError(page: Page): Promise<string> {
  const itemId = await conductRandomAwaitingItem(page);
  await openControllingSection(page);
  await searchControllingItems(page, itemId);
  await waitForControllingPlacement(page, itemId);
  await markBuyoutErrors(page, itemId, [BUYOUT_ERROR_REASON]);
  return itemId;
}

/** Товар уже вышел из автоконтроллинга и виден в поиске. Кнопки не жмём. */
export async function putControlledItem(page: Page): Promise<string> {
  const itemId = await conductRandomAwaitingItem(page);
  await openControllingSection(page);
  await searchControllingItems(page, itemId);
  await waitForControllingPlacement(page, itemId);
  return itemId;
}

/** «Успешные» плюс открытый запрос в КС — общая подготовка для решения и статуса. */
export async function putSuccessfulItemWithCsRequest(
  page: Page,
  text = 'Автотест: запрос в КС из успешных'
): Promise<string> {
  const itemId = await conductRandomAwaitingItem(page);
  await openControllingSection(page);
  await searchControllingItems(page, itemId);
  await passControlling(page, itemId);
  await requestControllingCs(page, itemId, 'Успешные', text);
  return itemId;
}

/**
 * Карандаш «Изменить категории проверки» заводит новый тред и не переносит товар.
 * На «Доп. проверке» причины уже выбраны, на «Ошибках выкупа» список пустой —
 * оба случая открываются одной кнопкой.
 */
export async function changeCheckCategories(
  page: Page,
  orderNumber: string,
  reasons: readonly string[],
  comment: string
): Promise<void> {
  const row = orderRows(page, orderNumber);
  await expect(row).toHaveCount(1);
  const cell = await columnCell(page, row, 'Доп. проверка');
  await cell.scrollIntoViewIfNeeded();

  await cell.getByRole('button', { name: 'Изменить категории проверки', exact: true }).click();
  await cell.getByRole('button', { name: /Не выбрано|Проверить товар|Проверить размер/ }).click();
  for (const reason of reasons) {
    await page.getByRole('menuitemcheckbox', { name: reason, exact: true }).click();
  }
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-slot="dropdown-menu-content"]')).toBeHidden();

  await cell.getByRole('button', { name: 'Подтвердить', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: /Доп\. проверка/ })).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Оставьте комментарий' }).fill(comment);
  const confirm = dialog.getByRole('button', { name: 'Подтвердить', exact: true });
  await expect(confirm).toBeEnabled();
  await confirm.click();

  await expect(await columnCell(page, row, '#controlling-check')).toContainText(comment, {
    timeout: 20000,
  });
  await expect(row).toHaveCount(1);
}

export type ControllingCsDecision = 'Есть решение' | 'Нет решения';

async function resolutionCell(page: Page, orderNumber: string): Promise<Locator> {
  const row = orderRows(page, orderNumber);
  await expect(row).toHaveCount(1);
  const cell = await columnCell(page, row, 'Решение');
  await cell.scrollIntoViewIfNeeded();
  return cell;
}

/**
 * «Есть решение» / «Нет решения», затем «Закрыть».
 * В контроллинге кнопка называется «Закрыть»: «Закрыть тикет» только у тега `#cs-request`.
 * После каждого шага строка не обновляется сама — сначала рефреш, потом проверка.
 */
export async function closeControllingCsRequest(
  page: Page,
  orderNumber: string,
  decision: ControllingCsDecision
): Promise<void> {
  const cell = await resolutionCell(page, orderNumber);
  await expect(cell.getByRole('button', { name: 'Закрыть', exact: true })).toHaveCount(0);

  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      response.url().includes('/dms/comments/') &&
      response.ok()
  );
  await cell.getByRole('button', { name: decision, exact: true }).click();
  await saved;
  await reloadControllingItem(page, orderNumber);

  const revealed = (await resolutionCell(page, orderNumber)).getByRole('button', {
    name: 'Закрыть',
    exact: true,
  });
  await expect(revealed).toBeVisible();

  const closed = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' && response.url().includes('/close') && response.ok()
  );
  await revealed.click();
  await closed;
  await reloadControllingItem(page, orderNumber);

  await expect(
    (await resolutionCell(page, orderNumber)).getByRole('button', { name: 'Закрыть', exact: true })
  ).toHaveCount(0);
  await expect(await resolutionCell(page, orderNumber)).toContainText(decision);
  await expect(orderRows(page, orderNumber)).toHaveCount(1);
}

/** Все статусы запроса КС. «Ожидает байера» сюда не входит — это статус предзаказа. */
export const CONTROLLING_CS_STATUSES = [
  'Ожидание КС',
  'Ожидает ответа клиента',
  'Идет обсуждение',
  'Есть решение клиента',
] as const;

export type ControllingCsStatus = (typeof CONTROLLING_CS_STATUSES)[number];

/**
 * Клик по пункту и сразу рефреш. Потом в колонке должен быть новый статус,
 * а предыдущий — уже нет.
 */
export async function changeControllingCsStatus(
  page: Page,
  orderNumber: string,
  from: ControllingCsStatus,
  to: ControllingCsStatus
): Promise<void> {
  const row = orderRows(page, orderNumber);
  await expect(row).toHaveCount(1);
  const cell = await columnCell(page, row, 'Статус запроса КС');
  await cell.scrollIntoViewIfNeeded();
  await expect(cell).toContainText(from);

  await cell.getByRole('button', { name: 'Сменить статус', exact: true }).click();
  await page.getByRole('option', { name: to, exact: true }).click();
  await reloadControllingItem(page, orderNumber);

  const updated = await columnCell(page, orderRows(page, orderNumber), 'Статус запроса КС');
  await expect(updated).toContainText(to);
  await expect(updated).not.toContainText(from);
}

/** Тот же товар: каждый следующий статус только после проверки предыдущего. */
export async function changeEveryControllingCsStatus(page: Page, orderNumber: string): Promise<void> {
  let current: ControllingCsStatus = CONTROLLING_CS_STATUSES[0];
  const nextStatuses = [...CONTROLLING_CS_STATUSES.slice(1), CONTROLLING_CS_STATUSES[0]];

  for (const next of nextStatuses) {
    await test.step(`«${current}» → «${next}»`, async () => {
      await changeControllingCsStatus(page, orderNumber, current, next);
    });
    current = next;
  }
}

/** Карандаш в ячейке размера. Пустое значение показывает его сразу, заполненное — по наведению. */
export async function editControllingSize(
  page: Page,
  orderNumber: string,
  column: 'Выкупленный размер' | 'Запрошенный размер',
  value: string
): Promise<void> {
  const row = orderRows(page, orderNumber);
  await expect(row).toHaveCount(1);
  const cell = await columnCell(page, row, column);
  await cell.scrollIntoViewIfNeeded();
  await cell.hover();

  await cell.getByRole('button', { name: 'Редактировать', exact: true }).click();
  await cell.getByRole('textbox', { name: column, exact: true }).fill(value);

  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      response.ok() &&
      (response.url().includes('/dms/deal-items/') || response.url().includes('/dms/items/'))
  );
  await cell.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await saved;
  await expect(cell).toContainText(value, { timeout: 20000 });
}

/**
 * Обсуждение у ID товара — тред `#cs-request`, не колонка «Запрос в КС».
 * Причина одна из четырёх: «Модель», «Размер», «Цвет», «Другое».
 * Товар остаётся на той же вкладке контроллинга.
 */
export async function discussControllingItem(
  page: Page,
  orderNumber: string,
  reason: string,
  comment: string
): Promise<void> {
  const row = orderRows(page, orderNumber);
  await expect(row).toHaveCount(1);
  await row
    .getByRole('button', { name: /Начать обсуждение|Есть комментарии|Есть открытые запросы/ })
    .click();

  const panel = page.locator('[data-slot="sheet-content"]').filter({ hasText: 'Спецтэги' });
  await expect(panel).toBeVisible();

  const section = panel.getByRole('heading', { name: 'Запрос в КС', exact: true }).locator('..');
  await section.getByRole('button', { name: '#cs-request', exact: true }).click();
  const reasonButton = section.getByRole('button', { name: reason, exact: true });
  await expect(reasonButton).toBeEnabled();
  await reasonButton.click();

  await panel.getByPlaceholder('Новый комментарий…').fill(comment);
  await panel.getByRole('button', { name: 'Отправить', exact: true }).click();
  await expect(panel).toContainText(comment, { timeout: 20000 });
  await expect(row).toHaveCount(1);
}
