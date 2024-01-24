/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.addColumn(
    'StockBalance',
    {
      internalCode: {
        type: 'varchar(255)',
        allowNull: true,
      },
      syncParams: {
        type: 'integer',
        allowNull: true,
      },
      partnumberInPrice: {
        type: 'varchar(255)',
        allowNull: true,
      },
    },
    { ifNotExists: true },
  );
};

exports.down = pgm => {
  pgm.dropColumns('StockBalance', ['internalCode', 'syncParams', 'partnumberInPrice'], { ifExists: true });
};
