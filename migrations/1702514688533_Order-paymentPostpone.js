/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.addColumns(
    'Order',
    {
      paymentPostponeMaxSum: {
        type: 'double',
        notNull: false,
      },
      paymentPostponeOverMaxSumApproved: {
        type: 'boolean',
        notNull: false,
      },
    },
    { ifNotExists: true },
  );
};

exports.down = pgm => {
  pgm.dropColumns('Order', ['paymentPostponeMaxSum', 'paymentPostponeOverMaxSumApproved'], { ifExists: true });
};
