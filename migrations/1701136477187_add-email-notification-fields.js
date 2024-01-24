/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.addColumn('SellerUpdateApplication', {
    emailNotification: {
      type: 'string',
      allowNull: true,
    },
    isAgreeEmailNotification: {
      type: 'boolean',
      allowNull: true,
      default: false,
    },
  });
};

exports.down = pgm => {
  pgm.dropColumns('SellerUpdateApplication', ['emailNotification', 'isAgreeEmailNotification']);
};
