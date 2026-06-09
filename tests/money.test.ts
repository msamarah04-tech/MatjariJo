import test from 'node:test';
import assert from 'node:assert/strict';
import {
  minorUnitExponent,
  toMinor,
  parseMoney,
  applyBps,
  percentOf,
  taxFromBase,
  rescaleMinor,
  formatMoney,
} from '../shared/money.ts';
import { normalizeJordanMobile, isJordanMobile } from '../shared/phone.ts';

test('JOD uses 3 decimals (fils), USD uses 2', () => {
  assert.equal(minorUnitExponent('JOD'), 3);
  assert.equal(minorUnitExponent('USD'), 2);
  assert.equal(minorUnitExponent('jod'), 3); // case-insensitive
});

test('toMinor / parseMoney convert without float drift', () => {
  assert.equal(toMinor(12.5, 'JOD'), 12500);
  assert.equal(toMinor(12.5, 'USD'), 1250);
  assert.equal(parseMoney('12.500', 'JOD'), 12500);
  assert.equal(parseMoney('1,234.5', 'USD'), 123450);
  assert.equal(parseMoney('7', 'JOD'), 7000);
  assert.equal(parseMoney('JD 7.250', 'JOD'), 7250);
  assert.equal(parseMoney('', 'JOD'), null);
});

test('bps and percent math are integer half-up', () => {
  assert.equal(applyBps(2468, 1600), 395); // 16% of 2468 = 394.88 -> 395
  assert.equal(percentOf(2468, 10), 247); // 10% = 246.8 -> 247
  assert.equal(percentOf(100, 200), 100); // clamped to the base
});

test('taxFromBase handles exclusive vs inclusive', () => {
  assert.equal(taxFromBase(10000, 1600, false), 1600); // exclusive: 16% on top
  assert.equal(taxFromBase(11600, 1600, true), 1600); // inclusive: portion already inside
  assert.equal(taxFromBase(10000, 0, false), 0);
});

test('rescaleMinor migrates between currency exponents', () => {
  assert.equal(rescaleMinor(1500, 'USD', 'JOD'), 15000); // exp 2 -> 3, x10
  assert.equal(rescaleMinor(15000, 'JOD', 'USD'), 1500); // exp 3 -> 2, /10
  assert.equal(rescaleMinor(1500, 'USD', 'EUR'), 1500); // same exponent, unchanged
});

test('formatMoney renders the right number of decimals', () => {
  assert.match(formatMoney(12500, 'JOD', 'en-JO'), /12\.500/);
  assert.match(formatMoney(1250, 'USD', 'en-US'), /\$12\.50/);
});

test('Jordan mobile normalization accepts common formats', () => {
  assert.equal(normalizeJordanMobile('0791234567'), '+962791234567');
  assert.equal(normalizeJordanMobile('+962 79 123 4567'), '+962791234567');
  assert.equal(normalizeJordanMobile('00962781234567'), '+962781234567');
  assert.equal(normalizeJordanMobile('077-123-4567'), '+962771234567');
  assert.equal(normalizeJordanMobile('0761234567'), null); // 076 is not a mobile prefix
  assert.equal(isJordanMobile('0791234567'), true);
  assert.equal(isJordanMobile('12345'), false);
});
