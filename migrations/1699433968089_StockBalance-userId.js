/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.addColumns(
    'StockBalance',
    {
      userId: {
        type: 'varchar(255)',
        notNull: false,
      },
    },
    { ifNotExists: true },
  );
};

exports.down = pgm => {
  pgm.dropColumns('StockBalance', ['userId'], { ifExists: true });
};
