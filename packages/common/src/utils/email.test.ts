import { emailValid } from './email';

test.each([
  ['someDude@gmail.com', true],
  ['foo.bar@yahoo.net', true],
  ['foo.b.biz@gmail.com', true],
  ['foo', false],
  ['foo@', false],
  ['stupidM0nk3yA0l@aol.net', true],
  ['stupidM0nk3yA0l@aol.net.net', true],
  ['123+guy@domain', false],
  ['123+guy@domain.to', true],
  ['@@domain', false],
  ['@domain.com', false],
  ['!@ 2001:0db8:85a3:0000:0000:8a2e:0370:73345', false],
  ['customer/department=shipping@example.com', true],
  ['$A12345@example.com', true],
  ['!def!xyz%abc@example.com', true],
  ['_somename@example.com', true],
  ['', false],
  ['john@uk', false],
  ['john.a@uk', false],
  ['john.@uk', false],
  ['john..@uk', false],
  ['.john@uk', false],
  ['foo@.gmail.com', false],
])('email validation for %j should pass %j', (email, shouldPass) => {
  expect(emailValid(email)).toEqual(shouldPass);
});
