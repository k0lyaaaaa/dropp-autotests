import { test, expect } from '@playwright/test';

test('Авторизация на dropp.market', async ({ page }) => {
  test.setTimeout(60000);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('https://dev-dms.dropp.market/orders');
  console.log('✅ Сайт открыт');

  // Ввод логина
  const loginField = page.locator('input[name="email"]');
  await loginField.waitFor({ state: 'visible', timeout: 10000 });
  await loginField.fill('dms@dropp.market');
  console.log('✅ Логин введён');

  // Ввод пароля
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill('7H24`tLl7P{x}');
  console.log('✅ Пароль введён');

  // Вход
  const loginButton = page.locator('button[type="submit"]');
  await loginButton.click();
  console.log('✅ Нажали кнопку входа');

  // Ждём загрузки
  await page.waitForTimeout(5000);

  // ===== ДИАГНОСТИКА СТРУКТУРЫ =====
  console.log('\n🔍 ДИАГНОСТИКА СТРУКТУРЫ:');

  // 1. Найдём все ссылки на заказы
  const orderLinks = page.locator('a[href*="/orders?sidepage=order"]');
  const linksCount = await orderLinks.count();
  console.log(`\n📌 Всего ссылок на заказы: ${linksCount}`);

  // 2. Посмотрим на первую ссылку
  if (linksCount > 0) {
    const firstLink = orderLinks.first();
    
    // Что за ссылка?
    const linkText = await firstLink.textContent();
    const linkHref = await firstLink.getAttribute('href');
    console.log(`\n🔗 Первая ссылка:`);
    console.log(`   Текст: ${linkText}`);
    console.log(`   Href: ${linkHref}`);
    
    // Какой тег у ссылки?
    const tagName = await firstLink.evaluate(el => el.tagName);
    console.log(`   Тег: ${tagName}`);
    
    // Какие классы у ссылки?
    const classes = await firstLink.getAttribute('class');
    console.log(`   Классы: ${classes || 'нет'}`);
    
    // HTML ссылки
    const linkHtml = await firstLink.evaluate(el => el.outerHTML);
    console.log(`\n📄 HTML ссылки: ${linkHtml}`);
    
    // Поднимаемся на один уровень вверх
    const parent = firstLink.locator('..').first();
    const parentTag = await parent.evaluate(el => el.tagName);
    const parentHtml = await parent.evaluate(el => el.outerHTML);
    console.log(`\n📄 Родитель (${parentTag}): ${parentHtml.substring(0, 200)}...`);
    
    // Поднимаемся на два уровня вверх
    const grandParent = parent.locator('..').first();
    const grandParentTag = await grandParent.evaluate(el => el.tagName);
    const grandParentHtml = await grandParent.evaluate(el => el.outerHTML);
    console.log(`\n📄 Прародитель (${grandParentTag}): ${grandParentHtml.substring(0, 200)}...`);
    
    // Ищем ближайший элемент со статусом "Принят"
    const statusNearby = await page.evaluate((href) => {
      // Ищем ссылку по href
      const link = document.querySelector(`a[href="${href}"]`);
      if (!link) return null;
      
      // Ищем текст "Принят" рядом (в радиусе 5 родительских элементов)
      let current = link.parentElement;
      for (let i = 0; i < 5; i++) {
        if (!current) break;
        if (current.textContent?.includes('Принят')) {
          return {
            level: i + 1,
            tag: current.tagName,
            html: current.outerHTML.substring(0, 200)
          };
        }
        current = current.parentElement;
      }
      return null;
    }, linkHref);
    
    console.log(`\n📍 Статус "Принят" найден: ${statusNearby ? '✅' : '❌'}`);
    if (statusNearby) {
      console.log(`   Уровень: ${statusNearby.level}`);
      console.log(`   Тег: ${statusNearby.tag}`);
      console.log(`   HTML: ${statusNearby.html}...`);
    }
  }

  // 3. Найдём все элементы со статусом "Принят"
  const statusElements = page.locator(':has-text("Принят")');
  const statusCount = await statusElements.count();
  console.log(`\n📌 Всего элементов с текстом "Принят": ${statusCount}`);

  if (statusCount > 0) {
    const firstStatus = statusElements.first();
    const statusTag = await firstStatus.evaluate(el => el.tagName);
    const statusText = await firstStatus.textContent();
    const statusHtml = await firstStatus.evaluate(el => el.outerHTML);
    console.log(`\n🏷️ Первый статус:`);
    console.log(`   Тег: ${statusTag}`);
    console.log(`   Текст: "${statusText}"`);
    console.log(`   HTML: ${statusHtml.substring(0, 200)}...`);
  }

  throw new Error('Диагностика завершена');
});