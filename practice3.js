const registrationData = {
  username: "john_doe",
  email: "john@example.com",
  age: 19,
  agreements: {
    terms: true,
    newsletter: false
  }
};

function validateRegistration(data) {
  if (!data) return "Ошибка: данные не переданы";
  
  // username проверяем
  if (!data.username) return "Ошибка: имя пользователя пустое";
  if (data.username.length <= 3) return "Ошибка: имя должно быть длиннее 3 символов";
  
  // email проверяем (с защитой!)
  if (!data.email) return "Ошибка: email отсутствует";
  if (!data.email.includes('@')) return "Ошибка: email должен содержать @";
  
  // age проверяем
  if (data.age === undefined) return "Ошибка: возраст не указан";
  if (data.age < 18) return "Ошибка: регистрация только с 18 лет";
  
  // agreements проверяем (осторожно с вложенными объектами!)
  if (!data.agreements) return "Ошибка: нет данных о соглашениях";
  if (!data.agreements.terms) return "Ошибка: необходимо принять условия";
  
  return "Регистрация возможна";
}


console.log(validateRegistration(registrationData));  // нормальные данные
console.log(validateRegistration());                   // без данных (undefined)
console.log(validateRegistration({}));                  // пустой объект
console.log(validateRegistration({ username: "john", age: 20 })); // частичные данные
