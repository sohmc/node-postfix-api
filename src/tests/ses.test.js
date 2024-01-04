import expect from 'expect';
import { handler } from '../ses';

// https://jestjs.io/docs/asynchronous#callbacks
test('Check if email exists', done => {
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
