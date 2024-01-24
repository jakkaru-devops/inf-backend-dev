/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.addColumns(
    'StockBalance',
    {
      forSale: {
        type: 'boolean',
        notNull: true,
        default: false,
      },
    },
    { ifNotExists: true },
  );
};

exports.down = pgm => {
  pgm.dropColumns('StockBalance', ['forSale'], { ifExists: true });
};
