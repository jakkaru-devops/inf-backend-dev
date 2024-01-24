/* eslint-disable camelcase */

exports.shorthands = undefined;

// Миграция поля autoTypeId и autoBrandId
exports.up = pgm => {
  pgm.alterColumn('DescribedProductAutoBrands', 'autoTypeId', {
    type: 'string',
    notNull: true,
  });
  pgm.alterColumn('DescribedProductAutoBrands', 'autoBrandId', {
    type: 'string',
    notNull: true,
  });
};

exports.down = pgm => {
  pgm.alterColumn('DescribedProductAutoBrands', 'autoTypeId', {
    type: 'string',
    notNull: false,
  });
  pgm.alterColumn('DescribedProductAutoBrands', 'autoBrandId', {
    type: 'string',
    notNull: false,
  });
};
