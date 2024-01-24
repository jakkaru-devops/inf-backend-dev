/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.addColumns(
    'ProductGroup',
    {
      order: {
        type: 'integer',
        notNull: false,
      },
    },
    { ifNotExists: true },
  );
};

exports.down = pgm => {
  pgm.dropColumns('ProductGroup', ['order']);
};
