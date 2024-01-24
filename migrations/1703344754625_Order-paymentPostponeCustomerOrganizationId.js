/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.addColumns(
    'Order',
    {
      paymentPostponeCustomerOrganizationId: {
        type: 'varchar(255)',
        notNull: false,
      },
    },
    { ifNotExists: true },
  );
};

exports.down = pgm => {
  pgm.dropColumns('Order', ['paymentPostponeCustomerOrganizationId'], { ifExists: true });
};
