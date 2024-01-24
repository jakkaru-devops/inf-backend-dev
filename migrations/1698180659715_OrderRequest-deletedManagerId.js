/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.addColumns(
    'OrderRequest',
    {
      deletedManagerId: {
        type: 'varchar(255)',
        notNull: false,
      },
    },
    { ifNotExists: true },
  );
};

exports.down = pgm => {
  pgm.dropColumns('OrderRequest', ['deletedManagerId']);
};
