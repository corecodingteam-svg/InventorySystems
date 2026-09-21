/* eslint-disable camelcase */

const PERMISSIONS = [
  ['organization.view', 'View organization settings'],
  ['organization.update', 'Update organization settings'],
  ['user.view', 'View users'],
  ['user.create', 'Create users'],
  ['user.update', 'Update users'],
  ['user.delete', 'Delete users'],
  ['role.view', 'View roles and permissions'],
  ['role.create', 'Create roles'],
  ['role.update', 'Update role permissions'],
  ['product.view', 'View products'],
  ['product.create', 'Create products'],
  ['product.update', 'Update products'],
  ['product.delete', 'Delete products'],
  ['inventory.view', 'View inventory'],
  ['inventory.adjust', 'Adjust stock'],
  ['inventory.transfer', 'Transfer stock'],
  ['inventory.count', 'Perform stock counts'],
  ['purchase.view', 'View purchases'],
  ['purchase.create', 'Create purchases'],
  ['purchase.approve', 'Approve purchases'],
  ['sales.view', 'View sales'],
  ['sales.create', 'Create sales'],
  ['sales.approve', 'Approve sales'],
  ['category.view', 'View categories'],
  ['category.manage', 'Create/update/delete categories'],
  ['brand.view', 'View brands'],
  ['brand.manage', 'Create/update/delete brands'],
  ['unit.view', 'View units'],
  ['unit.manage', 'Create/update/delete units and conversions'],
  ['warehouse.view', 'View warehouses and locations'],
  ['warehouse.manage', 'Create/update/delete warehouses and locations'],
  ['batch.view', 'View batches'],
  ['batch.manage', 'Create/update batches'],
  ['serial.view', 'View serial numbers'],
  ['serial.manage', 'Create/update serial numbers'],
  ['supplier.view', 'View suppliers'],
  ['supplier.manage', 'Create/update/delete suppliers'],
  ['purchase.receive', 'Record goods receipts against a purchase order'],
  ['purchase.return', 'Create purchase returns'],
  ['customer.view', 'View customers'],
  ['customer.manage', 'Create/update/delete customers'],
  ['sales.dispatch', 'Dispatch stock against a sales order'],
  ['sales.return', 'Create sales returns'],
  ['custom_field.view', 'View custom field definitions'],
  ['custom_field.manage', 'Create/update/delete custom field definitions'],
  ['tax.view', 'View tax categories and rates'],
  ['tax.manage', 'Create/update/delete tax categories and rates'],
  ['pricing.view', 'View price lists'],
  ['pricing.manage', 'Create/update/delete price lists'],
  ['notification.view', 'View notifications'],
  ['workflow.manage', 'Configure approval workflow rules'],
  ['pos.operate', 'Open/close POS sessions and record POS sales'],
  ['pos.manage', 'Create/update POS registers'],
  ['webhook.manage', 'Create/update/delete webhook subscriptions'],
  ['integration.manage', 'Create/update/delete integration connections'],
  ['subscription.manage', 'View/update the organization subscription plan'],
];

exports.up = (pgm) => {
  for (const [code, description] of PERMISSIONS) {
    pgm.sql(
      `INSERT INTO permissions (id, code, description) VALUES (gen_random_uuid(), '${code}', '${description.replace(/'/g, "''")}') ON CONFLICT (code) DO NOTHING;`,
    );
  }
};

exports.down = (pgm) => {
  pgm.sql(
    `DELETE FROM permissions WHERE code IN (${PERMISSIONS.map((p) => `'${p[0]}'`).join(',')});`,
  );
};
