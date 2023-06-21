import { safeExpect, usingEnv } from '@paradoxical-io/common-test';

import { redact } from './redaction';

describe('shows redaction in dev', () => {
  test('redacts nested', () => {
    const result = redact({
      password: 'bad',
      nested: {
        ssn: 'bad',
        password: 'bad',
      },
      good: 'ok',
    });

    safeExpect(result).toMatchObject({
      password: '<redactable(bad)>',
      nested: {
        ssn: '<redactable(bad)>',
        password: '<redactable(bad)>',
      },
      good: 'ok',
    });
  });

  test('redacts top level explicit fields and auto redacts bad fields', () => {
    const result = redact(
      {
        password: 'bad',
        nested: {
          ssn: 'bad',
          password: 'bad',
          ignore: 'ok',
        },
        good: 'ok',
      },
      { keys: ['good'] }
    );

    safeExpect(result).toMatchObject({
      password: '<redactable(bad)>',
      nested: {
        ssn: '<redactable(bad)>',
        password: '<redactable(bad)>',
        ignore: 'ok',
      },
      good: '<redactable(ok)>',
    });
  });

  test('auto redacts snake case fields', () => {
    const result = redact({
      pin_number: 'bad',
      card_number: 'bad',
      pinNumber: 'bad',
      cardNumber: 'bad',
    });

    safeExpect(result).toMatchObject({
      pin_number: '<redactable(bad)>',
      card_number: '<redactable(bad)>',
      pinNumber: '<redactable(bad)>',
      cardNumber: '<redactable(bad)>',
    });
  });

  test('redacts top level explicit fields but not inner fields', () => {
    const result = redact(
      {
        nested: {
          good: 'ok',
        },
        good: 'ok',
      },
      { keys: ['good'] }
    );

    safeExpect(result).toMatchObject({
      nested: {
        good: 'ok',
      },
      good: '<redactable(ok)>',
    });
  });

  test('redacts top level explicit fields and auto redacts bad fields even when other custom fields are included', () => {
    const result = redact(
      {
        password: 'bad',
        nested: {
          ssn: 'bad',
          password: 'bad',
          ignore: 'ok',
        },
        good: 'ok',
      },
      { fieldNames: ['good'] }
    );

    safeExpect(result).toMatchObject({
      password: '<redactable(bad)>',
      nested: {
        ssn: '<redactable(bad)>',
        password: '<redactable(bad)>',
        ignore: 'ok',
      },
      good: '<redactable(ok)>',
    });
  });
});

describe('hard redacts in prod', () => {
  test('all keys show redaction and no inner data', async () => {
    await usingEnv('prod', async () => {
      const result = redact(
        {
          password: 'bad',
          nested: {
            ssn: 'bad',
            password: 'bad',
            ignore: 'ok',
          },
          good: 'ok',
        },
        { fieldNames: ['good'] }
      );

      safeExpect(result).toMatchObject({
        password: '<redacted>',
        nested: {
          ssn: '<redacted>',
          password: '<redacted>',
          ignore: 'ok',
        },
        good: '<redacted>',
      });
    });
  });
});
