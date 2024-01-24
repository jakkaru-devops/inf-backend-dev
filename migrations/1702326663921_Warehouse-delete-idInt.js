/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.dropColumns('Warehouse', ['idInt'], {
    ifExists: true,
  });
};

exports.down = pgm => {};
