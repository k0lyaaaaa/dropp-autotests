import { expect, Locator, Page } from '@playwright/test';
import { purchaseOrderRows } from './purchaseAwaiting';

const MOVED_TO_PROCESSING = /–>\s*В обработке/;

function isSpecialistHeader(name: string): boolean {
  return ['Исполнитель', 'Назначить'].some(
    (header) => name === header || name.startsWith(`${header} `),
  );
}

async function specialistCell(page: Page, orderNumber: string): Promise<Locator> {
  const row = purchaseOrderRows(page, orderNumber).first();
  await expect(row).toBeVisible();
  const headers = row.locator('xpath=ancestor::table[1]').getByRole('columnheader');
  const count = await headers.count();

  for (let index = 0; index < count; index += 1) {
    const name = (await headers.nth(index).evaluate((el) => el.textContent || ''))
      .replace(/\s+/g, ' ')
      .trim();
    if (isSpecialistHeader(name)) return row.getByRole('cell').nth(index);
  }

  throw new Error('Колонка «Исполнитель» не найдена');
}

async function confirmSpecialistChange(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog').filter({
    has: page.getByRole('heading', { name: 'Смена исполнителя' }),
  });
  await expect(dialog).toBeVisible();
  const confirm = dialog.getByRole('button', { name: 'Подтвердить', exact: true });
  const box = await confirm.boundingBox();
  if (box == null) throw new Error('Кнопка «Подтвердить» не видна');
  // Кнопка мыши ещё зажата на пункте списка. Отпускание на «Подтвердить»
  // кликом не считается: нажатие было на другом элементе. Сначала отпускаем,
  // потом жмём кнопку уже отдельным кликом.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.up();
  await confirm.click();
}

/**
 * Пункт списка выбирается нажатием кнопки мыши, не полным кликом.
 * `dispatchEvent` до обработчика React не доходит, диалог не открывается.
 * Настоящее нажатие открывает его; кнопку мыши отпускаем уже на «Подтвердить»,
 * иначе отпускание попадает в подложку и диалог тут же закрывается.
 */
async function pressMouseDown(target: Locator): Promise<void> {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (box == null) throw new Error('Пункт списка не виден');
  const page = target.page();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
}

function specialistNamePattern(name: string): RegExp {
  const parts = name
    .replace(/\u00A0/g, ' ')
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(parts.join('\\s+'), 'i');
}

function normalizeSpecialistName(value: string): string {
  return value.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function namesMatch(left: string, right: string): boolean {
  const normalizedLeft = normalizeSpecialistName(left);
  const normalizedRight = normalizeSpecialistName(right);
  if (normalizedLeft === '' || normalizedRight === '') return false;
  return normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft);
}

async function specialistOptions(page: Page, orderNumber: string): Promise<{ input: Locator; current: string }> {
  const cell = await specialistCell(page, orderNumber);
  const input = cell.locator('input');
  await input.scrollIntoViewIfNeeded();
  const current = (await input.inputValue()).trim();
  await input.click();

  const options = page.locator('[data-slot="autocomplete-list"] button');
  await expect(options.first()).toBeVisible();
  return { input, current };
}

async function optionText(option: Locator): Promise<{ label: string; normalized: string }> {
  const raw = await option.innerText();
  return {
    label: visibleOptionLabel(raw),
    normalized: normalizeSpecialistName(raw),
  };
}

/** Первая строка пункта — инициалы «ТМ», в поле их нет. Берём имя или почту. */
function visibleOptionLabel(raw: string): string {
  const lines = raw
    .split('\n')
    .map((line) => line.replace(/\u00A0/g, ' ').trim())
    .filter(Boolean);
  const name = lines.find((line) => line.includes(' ') && !line.includes('@'));
  if (name) return name;
  const email = lines.find((line) => line.includes('@'));
  return email ?? lines[0] ?? '';
}

function isUnassignedOption(normalized: string): boolean {
  return normalized === '' || normalized.includes('не назначен');
}

async function confirmAssignment(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog').filter({ hasText: 'Изменение исполнителя' });
  await expect(dialog).toBeVisible();
  await confirmSpecialistChange(page);
  await expect(
    page.locator('.Toastify__toast--success').filter({ hasText: MOVED_TO_PROCESSING }).last(),
  ).toBeVisible({ timeout: 20000 });
}

/** Что сейчас написано в ячейке исполнителя. Пустая строка — товар ни на кого не назначен. */
export async function readSpecialistField(page: Page, orderNumber: string): Promise<string> {
  const cell = await specialistCell(page, orderNumber);
  const input = cell.locator('input');
  await input.scrollIntoViewIfNeeded();
  return (await input.inputValue()).trim();
}

export async function expectAssignedSpecialist(page: Page, orderNumber: string, name: string): Promise<void> {
  await expect(async () => {
    const cell = await specialistCell(page, orderNumber);
    await expect(cell.locator('input')).toHaveValue(specialistNamePattern(name));
  }).toPass({ timeout: 20000 });
}

/**
 * Любой исполнитель, кроме текущего и пункта «Не назначен».
 * Назначение — это переход в «В обработке»: тост есть и когда товар уже там.
 */
export async function assignAnotherSpecialist(page: Page, orderNumber: string): Promise<string> {
  const { current } = await specialistOptions(page, orderNumber);
  const currentName = normalizeSpecialistName(current);
  const options = page.locator('[data-slot="autocomplete-list"] button');
  const count = await options.count();

  for (let index = 0; index < count; index += 1) {
    const option = options.nth(index);
    const { label, normalized } = await optionText(option);
    if (isUnassignedOption(normalized) || namesMatch(currentName, normalized)) continue;
    await pressMouseDown(option);
    await confirmAssignment(page);
    return label;
  }

  throw new Error('В списке нет другого исполнителя');
}

/**
 * Назначить конкретного человека: его имя — это подстрока сохранённого поля.
 * Берём самое длинное совпадение, чтобы «Иван» не перебил «Иван Иванов».
 */
export async function assignSpecialistMatching(
  page: Page,
  orderNumber: string,
  savedField: string,
): Promise<string> {
  await specialistOptions(page, orderNumber);
  const options = page.locator('[data-slot="autocomplete-list"] button');
  const count = await options.count();
  let matchIndex = -1;
  let matchName = '';

  const savedName = normalizeSpecialistName(savedField);

  for (let index = 0; index < count; index += 1) {
    const { label, normalized } = await optionText(options.nth(index));
    if (isUnassignedOption(normalized)) continue;
    if (namesMatch(savedName, normalized) && normalized.length > matchName.length) {
      matchName = label;
      matchIndex = index;
    }
  }

  if (matchIndex === -1) throw new Error('В списке нет исполнителя из сохранённого поля');

  await pressMouseDown(options.nth(matchIndex));
  await confirmAssignment(page);
  return matchName;
}

/**
 * Крестик виден у уже выбранного исполнителя. Снятие возвращает товар
 * в «Ожидают», тоста при этом фронт не показывает.
 */
export async function unassignItemSpecialist(page: Page, orderNumber: string): Promise<void> {
  const cell = await specialistCell(page, orderNumber);
  await cell.scrollIntoViewIfNeeded();
  await cell.hover();
  const clear = cell.getByRole('button', { name: 'clear' });
  await expect(clear).toBeVisible();
  await pressMouseDown(clear);
  await expect(page.getByRole('dialog')).toContainText('Снять этот товар с исполнителя');
  await confirmSpecialistChange(page);
}
