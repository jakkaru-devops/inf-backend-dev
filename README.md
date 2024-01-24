# Миграции
Миграции работают через библиотеку node-pg-migrate https://salsita.github.io/node-pg-migrate/#/. Используем миграции для добавления новых полей (колонок) в существующие таблицы и в редких случаях для создания новых таблиц (если sequelize ругается и не создает новую таблицу сам).

Для работы миграций требуется добавить ключ DATABASE_URL в .env (пример есть в .env.example).

### Добавление миграции на создание полей
```bash
yarn migrate create [Таблица] [поле]
```
Для создания полей используем метод pgm.addColumns, для удаления pgm.dropColumns.
Все параметры полей описаны здесь https://salsita.github.io/node-pg-migrate/#/columns.

Создание/удаление таблиц - https://salsita.github.io/node-pg-migrate/#/tables.

### Запуск созданных миграций
```bash
yarn migrate up
```

### Отмена произведенных миграций
```bash
yarn migrate down
```
