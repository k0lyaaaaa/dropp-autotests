// Наша функция валидации
function validateRegistration(data) {
  if (!data) {
    return "Ошибка: данные не переданы";
  }
  
  if (!data.username) {
    return "Ошибка: имя пользователя пустое";
  }
  
  if (data.username.length <= 3) {
    return "Ошибка: имя пользователя должно быть длиннее 3 символов";
  }
  
  if (!data.email) {
    return "Ошибка: email отсутствует";
  }
  
  if (!data.email.includes('@')) {
    return "Ошибка: email должен содержать @";
  }
  
  if (data.age === undefined) {
    return "Ошибка: возраст не указан";
  }
  
  if (data.age < 18) {
    return "Ошибка: регистрация только с 18 лет";
  }
  
  if (!data.agreements) {
    return "Ошибка: нет данных о соглашениях";
  }
  
  if (!data.agreements.terms) {
    return "Ошибка: необходимо принять условия соглашения";
  }
  
  return "Регистрация возможна";
}

// ТЕСТЫ
test('1. Должен пропускать валидного пользователя', () => {
  const validUser = {
    username: "john_doe",
    email: "john@example.com",
    age: 19,
    agreements: { terms: true }
  };
  
  expect(validateRegistration(validUser)).toBe("Регистрация возможна");
});

test('2. Должен выдавать ошибку при отсутствии данных', () => {
  expect(validateRegistration()).toBe("Ошибка: данные не переданы");
});

test('3. Должен выдавать ошибку при пустом объекте', () => {
  expect(validateRegistration({})).toBe("Ошибка: имя пользователя пустое");
});

test('4. Должен выдавать ошибку при отсутствии email', () => {
  const userWithoutEmail = {
    username: "john_doe",
    age: 19,
    agreements: { terms: true }
  };
  
  expect(validateRegistration(userWithoutEmail)).toBe("Ошибка: email отсутствует");
});

test('5. Должен выдавать ошибку при email без @', () => {
  const userWithBadEmail = {
    username: "john_doe",
    email: "johnexample.com",
    age: 19,
    agreements: { terms: true }
  };
  
  expect(validateRegistration(userWithBadEmail)).toBe("Ошибка: email должен содержать @");
});

test('6. Должен выдавать ошибку при возрасте меньше 18', () => {
  const underageUser = {
    username: "john_doe",
    email: "john@example.com",
    age: 16,
    agreements: { terms: true }
  };
  
  expect(validateRegistration(underageUser)).toBe("Ошибка: регистрация только с 18 лет");
});

test('7. Должен выдавать ошибку при отсутствии agreements', () => {
  const userWithoutAgreements = {
    username: "john_doe",
    email: "john@example.com",
    age: 19
  };
  
  expect(validateRegistration(userWithoutAgreements)).toBe("Ошибка: нет данных о соглашениях");
});

test('8. Должен выдавать ошибку при непринятых условиях', () => {
  const userNotAgreed = {
    username: "john_doe",
    email: "john@example.com",
    age: 19,
    agreements: { terms: false }
  };
  
  expect(validateRegistration(userNotAgreed)).toBe("Ошибка: необходимо принять условия соглашения");
});

test('9. Должен выдавать ошибку при коротком имени', () => {
  const userWithShortName = {
    username: "jo",
    email: "john@example.com",
    age: 19,
    agreements: { terms: true }
  };
  
  expect(validateRegistration(userWithShortName)).toBe("Ошибка: имя пользователя должно быть длиннее 3 символов");
});