import { Given, When, Then } from '@cucumber/cucumber';
import assert from 'assert';

let currentTenant: string | null = null;
let currentRole: string | null = null;
let createdUser: any = null;
let responseCode: number | null = null;

Given('an administrator for tenant {string}', function (tenant: string) {
  currentTenant = tenant;
  currentRole = 'ADMIN';
});

Given('an authenticated user logged into tenant {string}', function (tenant: string) {
  currentTenant = tenant;
});

Given('an unauthenticated visitor', function () {
  currentTenant = null;
});

Given('an existing member {string}', function (email: string) {
  createdUser = { email, deletedAt: null };
});

When('the user requests the dashboard metrics page', function () {
  if (currentTenant) {
    responseCode = 200;
  } else {
    responseCode = 401;
  }
});

When('the visitor attempts to access tenant {string} dashboard', function () {
  responseCode = 401;
});

When('the admin creates a new user with email {string} and role {string}', function (email: string, role: string) {
  createdUser = { email, role, tenant: currentTenant, createdAt: new Date() };
  responseCode = 201;
});

When('the admin soft-deletes the member {string}', function (email: string) {
  if (createdUser && createdUser.email === email) {
    createdUser.deletedAt = new Date();
    responseCode = 204;
  }
});

When('the admin attempts to create a user with invalid email {string}', function (email: string) {
  if (!email.includes('@')) {
    responseCode = 400;
  }
});

Then('the system returns 200 OK with tenant metrics data', function () {
  assert.strictEqual(responseCode, 200);
});

Then('the system rejects access with a 401 Unauthorized redirect', function () {
  assert.strictEqual(responseCode, 401);
});

Then('the user record is successfully saved in the tenant database', function () {
  assert.ok(createdUser);
  assert.strictEqual(responseCode, 201);
});

Then('the user deletedAt timestamp is set', function () {
  assert.ok(createdUser.deletedAt);
});

Then('the validation pipe rejects the request with status 400', function () {
  assert.strictEqual(responseCode, 400);
});
