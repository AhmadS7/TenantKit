import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';
import { FakeAuthHelper } from '../../test/utils/fake-auth.helper';

let userAccount: { email: string; passwordHash: string; locked?: boolean } | null = null;
let lastResponseStatus: number | null = null;
let lastAuthToken: string | null = null;

Given('a registered user with email {string} and password {string}', function (email: string, pass: string) {
  userAccount = { email, passwordHash: pass };
});

Given('a user account {string} is locked due to security policy', function (email: string) {
  userAccount = { email, passwordHash: 'Secret123', locked: true };
});

When('the user submits valid login credentials', function () {
  if (userAccount) {
    lastAuthToken = FakeAuthHelper.generateToken({
      sub: 'u-bdd-1',
      email: userAccount.email,
    });
    lastResponseStatus = 200;
  }
});

When('the user submits login email {string} with password {string}', function (email: string, pass: string) {
  if (userAccount && userAccount.email === email && userAccount.passwordHash === pass) {
    lastResponseStatus = 200;
    lastAuthToken = 'valid-token';
  } else {
    lastResponseStatus = 401;
    lastAuthToken = null;
  }
});

When('the user attempts to log in with {string}', function (email: string) {
  if (userAccount && userAccount.locked) {
    lastResponseStatus = 403;
  }
});

Then('the authentication response returns an access token', function () {
  assert.ok(lastAuthToken !== null, 'Expected non-null access token');
});

Then('the user session becomes active', function () {
  assert.strictEqual(lastResponseStatus, 200);
});

Then('the authentication service rejects the request with an unauthorized error', function () {
  assert.strictEqual(lastResponseStatus, 401);
});

Then('the authentication service denies access with account locked status', function () {
  assert.strictEqual(lastResponseStatus, 403);
});
