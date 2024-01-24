/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.addColumn(
    'OrganizationUpdateApplicationBranch',
    {
      creatorUserId: {
        type: 'varchar(255)',
        allowNull: true,
      },
      bankName: {
        type: 'varchar(255)',
        allowNull: true,
      },
      bankInn: {
        type: 'varchar(255)',
        allowNull: true,
      },
      bankBik: {
        type: 'varchar(255)',
        allowNull: true,
      },
      bankKs: {
        type: 'varchar(255)',
        allowNull: true,
      },
      bankRs: {
        type: 'varchar(255)',
        allowNull: true,
      },
    },
    { ifNotExists: true },
  );

  pgm.alterColumn('OrganizationUpdateApplicationBranch', 'branchId', {
    notNull: false,
  });
  pgm.alterColumn('OrganizationUpdateApplicationBranch', 'kpp', {
    notNull: false,
  });
};

exports.down = pgm => {
  pgm.dropColumns(
    'OrganizationUpdateApplicationBranch',
    ['creatorUserId', 'bankName', 'bankInn', 'bankBik', 'bankKs', 'bankRs'],
    {
      ifExists: true,
    },
  );

  pgm.alterColumn('OrganizationUpdateApplicationBranch', 'branchId', {
    notNull: true,
  });
  pgm.alterColumn('OrganizationUpdateApplicationBranch', 'kpp', {
    notNull: true,
  });
};
