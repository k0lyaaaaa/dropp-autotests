const users = [
  { name: "Анна", password: "1231" },
  { name: "Иван", password: "123456" },
  { name: "Мария", password: "securePass123" },
  { name: "Петр", password: "" },  // Пустой пароль
  { name: "Пе3тр", password: "2131231231231231231231231231" }, 
  { name: "Елена", password: "1234567890123" } // Длинный пароль
];

function checkPasswordLength(user) {
    // Сначала проверяем, есть ли вообще пароль
    if (!user.password) {
        return `Имя: ${user.name} — Ошибка: пароль отсутствует`;
    }

    if (user.password.length > 20) {
        return `Имя: ${user.name} — Слишком длинный пароль(макс 20 символов)`;
    }
    const length = user.password.length;

    // Теперь проверяем длину
    if (length >= 6 && length <= 12) {
        return `Имя: ${user.name}, пароль: ${user.password} — OK`;
    } else if (length < 6) {
        return `Имя: ${user.name}, пароль: ${user.password} — Слишком короткий`;
    } else {
        return `Имя: ${user.name}, пароль: ${user.password} — Слишком длинный`;
    }
}

users.forEach(user => {
    console.log(checkPasswordLength(user));
});