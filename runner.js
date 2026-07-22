const { spawnSync } = require('child_process');
const { rmSync, existsSync } = require('fs');

const filter = process.argv[2] || '';

// Очищаем старые результаты и отчёт
['allure-results', 'allure-report'].forEach(dir => {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
});

// Запускаем тесты (с фильтром, если передан)
spawnSync(
  'npx',
  ['playwright', 'test', '--project=chromium', '--headed', filter].filter(Boolean),
  { stdio: 'inherit', shell: true }
);

// Генерируем отчёт
spawnSync(
  'npx',
  ['allure', 'generate', 'allure-results', '--clean', '-o', 'allure-report'],
  { stdio: 'inherit', shell: true }
);

// Открываем отчёт в браузере
spawnSync(
  'npx',
  ['allure', 'open', 'allure-report'],
  { stdio: 'inherit', shell: true }
);
