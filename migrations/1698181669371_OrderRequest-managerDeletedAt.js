/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.addColumns(
    'OrderRequest',
    {
      managerDeletedAt: {
        type: 'timestamp with time zone',
        notNull: false,
      },
    },
    { ifNotExists: true },
  );
};

exports.down = pgm => {
  pgm.dropColumns('OrderRequest', ['managerDeletedAt']);
};
