import { Page } from '@playwright/test';

// ==================== АВТОРИЗАЦИЯ НА САЙТЕ ====================

export async function loginAsUser(page: Page) {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('https://dev.dropp.market/men');
  console.log('✅ Сайт открыт (авторизация)');

  const userIcon = page.locator('div.HeaderMenu_customer__ymyVN').first();
  await userIcon.waitFor({ state: 'visible', timeout: 10000 });
  await userIcon.click();
  console.log('✅ Кликнули по иконке пользователя');

  await page.waitForSelector('input[type="email"], input[name="email"], input[name="login"]');
  console.log('✅ Форма авторизации загружена');

  const loginField = page.locator('input[name="login"]');
  await loginField.waitFor({ state: 'visible', timeout: 10000 });
  await loginField.fill(process.env.DROPP_EMAIL || '');
  console.log('✅ Логин введён');

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(process.env.DROPP_PASSWORD || '');
  console.log('✅ Пароль введён');

  const submitButton = page.locator('[data-test-id="popup-sign-in-button"]');
  await submitButton.click();
  console.log('✅ Нажали кнопку входа');

  await page.waitForTimeout(1000);
}

// ==================== АВТОРИЗАЦИЯ В АДМИНКЕ (DMS) ====================

type DmsRole = 'admin' | 'fin-manager';

const DMS_CREDENTIALS: Record<DmsRole, { email: string; password: string }> = {
  'admin': {
    email:    process.env.DMS_EMAIL || '',
    password: process.env.DMS_PASSWORD || '',
  },
  'fin-manager': {
    email:    process.env.DMS_EMAIL_FIN_MANAGER || '',
    password: process.env.DMS_PASSWORD_FIN_MANAGER || '',
  },
};

/**
 * Авторизация в DMS-админке.
 * @param role 'admin' — обычный менеджер, 'fin-manager' — финансовый менеджер
 */
export async function loginDms(page: Page, role: DmsRole = 'admin') {
  const { email, password } = DMS_CREDENTIALS[role];
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('https://dev-dms.dropp.market/orders');
  console.log('✅ Сайт админки открыт');

  const adminLogin = page.locator('input[name="email"]');
  await adminLogin.waitFor({ state: 'visible', timeout: 10000 });
  await adminLogin.fill(email);
  console.log('✅ Логин введён');

  const adminPassword = page.locator('input[type="password"]').first();
  await adminPassword.fill(password);
  console.log('✅ Пароль введён');

  const adminLoginButton = page.locator('button[type="submit"]');
  await adminLoginButton.click();
  console.log('✅ Нажали кнопку входа в админку');

  await page.waitForTimeout(1000);
}

// Обратная совместимость — старые имена функций продолжают работать
export const AuthDMSFin = (page: Page) => loginDms(page, 'fin-manager');
