// Shared fixtures for unit tests: the real spec and seed, plus a fully
// mapped copy of the seed mappings.
import spec from '../../src/spec/conversion-v1.json';
import seed from '../../src/seed/juniper-moss.json';

export { spec, seed };

/** Seed mappings plus the one the demo leaves for the user (amount). */
export const fullMappings = [
  ...seed.mappings,
  { targetField: 'amount', sourcePath: 'order.total_price', transform: 'toCents', notes: '' },
];

export const answers = seed.project.scope.answers;
