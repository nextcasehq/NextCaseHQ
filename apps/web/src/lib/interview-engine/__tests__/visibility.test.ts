import { evaluateCondition, isFieldRequired, isFieldVisible } from '../visibility';
import type { TextField, BooleanField } from '../types';

describe('interview-engine visibility — generic condition evaluation, no legal vocabulary', () => {
  test('evaluateCondition is a plain equality check against the given scope', () => {
    expect(evaluateCondition({ field: 'wantsFollowUp', equals: true }, { wantsFollowUp: true })).toBe(true);
    expect(evaluateCondition({ field: 'wantsFollowUp', equals: true }, { wantsFollowUp: false })).toBe(false);
    expect(evaluateCondition({ field: 'category', equals: 'B' }, { category: 'A' })).toBe(false);
  });

  const followUp: TextField = { type: 'text', name: 'followUp', title: 'Follow-up', visibleIf: { field: 'wantsFollowUp', equals: true } };
  const always: TextField = { type: 'text', name: 'always', title: 'Always shown' };

  test('a field with no visibleIf is always visible', () => {
    expect(isFieldVisible(always, {})).toBe(true);
  });

  test('a field with visibleIf is hidden until its condition holds', () => {
    expect(isFieldVisible(followUp, { wantsFollowUp: false })).toBe(false);
    expect(isFieldVisible(followUp, {})).toBe(false);
    expect(isFieldVisible(followUp, { wantsFollowUp: true })).toBe(true);
  });

  test('isFieldRequired: plain isRequired applies regardless of any condition', () => {
    const required: TextField = { type: 'text', name: 'x', title: 'X', isRequired: true };
    expect(isFieldRequired(required, {})).toBe(true);
  });

  test('isFieldRequired: requiredIf only applies once its own condition holds', () => {
    const conditional: TextField = {
      type: 'text',
      name: 'followUp',
      title: 'Follow-up',
      requiredIf: { field: 'wantsFollowUp', equals: true },
    };
    expect(isFieldRequired(conditional, { wantsFollowUp: false })).toBe(false);
    expect(isFieldRequired(conditional, { wantsFollowUp: true })).toBe(true);
  });

  test('a hidden field can never be required, even if isRequired is true — invisible fields are never validated', () => {
    const hiddenButMarkedRequired: BooleanField = {
      type: 'boolean',
      name: 'followUp',
      title: 'Follow-up',
      isRequired: true,
      visibleIf: { field: 'wantsFollowUp', equals: true },
    };
    expect(isFieldRequired(hiddenButMarkedRequired, { wantsFollowUp: false })).toBe(false);
    expect(isFieldRequired(hiddenButMarkedRequired, { wantsFollowUp: true })).toBe(true);
  });
});
