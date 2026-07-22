import { validateGroupItem, validatePage, validateSchema } from '../validate';
import type { EngineSchema, EnginePage, GroupField, TextField } from '../types';

describe('interview-engine validate — page-level and group-entry validation', () => {
  const namePage: EnginePage = {
    name: 'names',
    title: 'Names',
    fields: [
      { type: 'text', name: 'name', title: 'Full name', isRequired: true } as TextField,
      { type: 'text', name: 'nickname', title: 'Nickname' } as TextField,
    ],
  };

  test('a required, empty field produces an error keyed by its name', () => {
    const errors = validatePage(namePage, {});
    expect(errors.name).toBe('Full name is required.');
    expect(errors.nickname).toBeUndefined();
  });

  test('a filled required field produces no error', () => {
    const errors = validatePage(namePage, { name: 'A. Kumar' });
    expect(errors.name).toBeUndefined();
  });

  test('a hidden conditional field is never validated, regardless of isRequired/requiredIf', () => {
    const page: EnginePage = {
      name: 'conditional',
      title: 'Conditional',
      fields: [
        { type: 'boolean', name: 'wantsFollowUp', title: 'Follow up?' },
        {
          type: 'text',
          name: 'followUp',
          title: 'Follow-up details',
          requiredIf: { field: 'wantsFollowUp', equals: true },
          visibleIf: { field: 'wantsFollowUp', equals: true },
        } as TextField,
      ],
    };
    // wantsFollowUp is false/absent -> followUp is hidden -> must not block validation
    expect(validatePage(page, {}).followUp).toBeUndefined();
    expect(validatePage(page, { wantsFollowUp: false }).followUp).toBeUndefined();
    // now visible and required-if-true, and empty -> must block
    expect(validatePage(page, { wantsFollowUp: true }).followUp).toBeDefined();
    // visible, required, and filled -> no error
    expect(validatePage(page, { wantsFollowUp: true, followUp: 'Detail' }).followUp).toBeUndefined();
  });

  const entryField: GroupField = {
    type: 'group',
    name: 'people',
    title: 'People',
    itemLabel: 'Person',
    minItems: 1,
    fields: [{ type: 'text', name: 'name', title: 'Full name', isRequired: true } as TextField],
  };

  test('validateGroupItem validates one entry object against the group template fields', () => {
    expect(validateGroupItem(entryField.fields, {}).name).toBe('Full name is required.');
    expect(validateGroupItem(entryField.fields, { name: 'A' }).name).toBeUndefined();
  });

  test('a group below minItems produces a count error keyed by the group name', () => {
    const page: EnginePage = { name: 'group-page', title: 'Group Page', fields: [entryField] };
    const errors = validatePage(page, { people: [] });
    expect(errors.people).toBe('Add at least one person.');
  });

  test('a group at/above minItems produces no count error, but still validates each entry', () => {
    const page: EnginePage = { name: 'group-page', title: 'Group Page', fields: [entryField] };
    const emptyEntry = validatePage(page, { people: [{}] });
    expect(emptyEntry.people).toBeUndefined(); // count satisfied
    expect(emptyEntry['people[0].name']).toBe('Full name is required.'); // but the one entry is itself invalid

    const filledEntry = validatePage(page, { people: [{ name: 'A. Kumar' }] });
    expect(filledEntry['people[0].name']).toBeUndefined();
  });

  test('multiple group entries are validated and keyed independently by index', () => {
    const page: EnginePage = { name: 'group-page', title: 'Group Page', fields: [entryField] };
    const errors = validatePage(page, { people: [{ name: 'A' }, {}, { name: 'C' }] });
    expect(errors['people[0].name']).toBeUndefined();
    expect(errors['people[1].name']).toBe('Full name is required.');
    expect(errors['people[2].name']).toBeUndefined();
  });

  describe('validateSchema — the one source of truth for "can this interview be generated"', () => {
    const schema: EngineSchema = {
      pages: [
        { name: 'p1', title: 'Page One', fields: [{ type: 'text', name: 'a', title: 'A', isRequired: true } as TextField] },
        { name: 'p2', title: 'Page Two', fields: [{ type: 'text', name: 'b', title: 'B', isRequired: true } as TextField] },
      ],
    };

    test('an interview with every page valid has no schema errors', () => {
      expect(validateSchema(schema, { a: '1', b: '2' })).toEqual({});
    });

    test('an incomplete EARLIER page is still caught even if the current/last page is itself valid — this is exactly the chip-jump-bypass case', () => {
      // Simulates a lawyer who jumped straight to the last page via a
      // progress chip, filled only that page, and reached Review without
      // ever validating page one.
      const errors = validateSchema(schema, { b: '2' });
      expect(errors.a).toBe('A is required.');
      expect(errors.b).toBeUndefined();
    });

    test('validateSchema is a strict superset merge of every validatePage call — no separate validation logic exists', () => {
      const answers = { a: '', b: '' };
      const merged = validateSchema(schema, answers);
      const perPage = schema.pages.reduce<Record<string, string>>((acc, page) => Object.assign(acc, validatePage(page, answers)), {});
      expect(merged).toEqual(perPage);
    });
  });
});
