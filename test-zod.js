const z = require('zod');

const baseSchema = z.object({
  a: z.string().optional(),
}).strict();

const refinedSchema = baseSchema.superRefine((data, ctx) => {
  if (!data.a) {
    ctx.addIssue({ code: 'custom', message: 'a is required' });
  }
});

const parentSchema = z.object({
  details: refinedSchema.default({}),
}).strict();

const childSchema = parentSchema.extend({
  details: baseSchema.default({}),
});

console.log('Testing parentSchema (should fail):');
try {
  parentSchema.parse({ details: {} });
  console.log('PASS');
} catch (e) {
  console.log('FAIL:', e.issues?.[0]?.message || e.message);
}

console.log('\nTesting childSchema (should pass):');
try {
  childSchema.parse({ details: {} });
  console.log('PASS');
} catch (e) {
  console.log('FAIL:', e.issues?.[0]?.message || e.message);
}

// Also test with actual product structure
const productDetailsBaseSchema = z.object({
  categoryKey: z.string().optional(),
  attributes: z.record(z.string(), z.string().optional()).optional(),
  fragranceFamily: z.string().optional(),
}).strict();

const productDetailsSchema = productDetailsBaseSchema.superRefine((data, ctx) => {
  if (data.categoryKey === 'perfume' && !data.attributes?.fragranceFamily) {
    ctx.addIssue({ code: 'custom', path: ['attributes', 'fragranceFamily'], message: 'Fragrance family is required.' });
  }
});

const productCreateSchema = z.object({
  name: z.string().min(1),
  details: productDetailsSchema.default({}),
}).strict();

const productBulkCreateSchema = productCreateSchema.extend({
  details: productDetailsBaseSchema.default({}),
});

const testProduct = {
  name: 'Test',
  details: { categoryKey: 'perfume', attributes: {} },
};

console.log('\nTesting productBulkCreateSchema with missing fragranceFamily:');
try {
  productBulkCreateSchema.parse(testProduct);
  console.log('PASS - accepted');
} catch (e) {
  console.log('FAIL - rejected:', e.issues?.[0]?.message || e.message);
}

console.log('\nTesting productCreateSchema with missing fragranceFamily:');
try {
  productCreateSchema.parse(testProduct);
  console.log('PASS - accepted');
} catch (e) {
  console.log('FAIL - rejected:', e.issues?.[0]?.message || e.message);
}
