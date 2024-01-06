import expect from 'expect';
import { handler, removeSubAddressExtension } from '../ses';

// https://jestjs.io/docs/asynchronous#callbacks
test('Initial Encounter - Check if email exists', done => {
  const lambdaEvent = {
    'Records': [
      {
        'ses': {
          'mail': {
            'destination': [
              'testing.trumpet@capricadev.tk',
              // 'testing.trumpet+abcd@capricadev.tk',
              // 'testing.trumpet=abcd+123845@capricadev.tk',
              // 'doesnotexist@capricadev.tk',
            ],
            'headers': [
              {
                'name': 'X-SES-Spam-Verdict',
                'value': 'PASS',
              },
              {
                'name': 'X-SES-Virus-Verdict',
                'value': 'PASS',
              },
            ],
          },
        },
      },
    ],
  };

  function checkResult(_isNull = null, sesDisposition) {
    expect(sesDisposition.disposition).toBe('STOP_RULE');
    done();
  }

  handler(lambdaEvent, {}, checkResult);
});

test('Second Encounter - This email is active and not ignored', done => {
  const lambdaEvent = {
    'Records': [
      {
        'ses': {
          'mail': {
            'destination': [
              'testing.trumpet@capricadev.tk',
            ],
            'headers': [
              {
                'name': 'X-SES-Spam-Verdict',
                'value': 'PASS',
              },
              {
                'name': 'X-SES-Virus-Verdict',
                'value': 'PASS',
              },
              {
                'name': 'X-Postfix-Check-2',
                'value': 'true',
              },
            ],
          },
        },
      },
    ],
  };

  function checkResult(_isNull = null, sesDisposition) {
    expect(sesDisposition.disposition).toBe('STOP_RULE');
    done();
  }

  handler(lambdaEvent, {}, checkResult);
});

test('Second Encounter - This email is active but set to be ignored', done => {
  const lambdaEvent = {
    'Records': [
      {
        'ses': {
          'mail': {
            'destination': [
              'testing.ignore@capricadev.tk',
            ],
            'headers': [
              {
                'name': 'X-SES-Spam-Verdict',
                'value': 'PASS',
              },
              {
                'name': 'X-SES-Virus-Verdict',
                'value': 'PASS',
              },
              {
                'name': 'X-Postfix-Check-2',
                'value': 'true',
              },
            ],
          },
        },
      },
    ],
  };

  function checkResult(_isNull = null, sesDisposition) {
    expect(sesDisposition.disposition).toBe('CONTINUE');
    done();
  }

  handler(lambdaEvent, {}, checkResult);
});

test.each([
  ['testing.trumpet=abcd+123845@capricadev.tk', 'testing.trumpet@capricadev.tk'],
  ['testing.trumpet--abcd#12345@capricadev.tk', 'testing.trumpet@capricadev.tk'],
  ['doesnotexist@capricadev.tk', 'doesnotexist@capricadev.tk'],
])('Test separator removal', (email, expected) => {
  expect(removeSubAddressExtension(email)).toBe(expected);
});
