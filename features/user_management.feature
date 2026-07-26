Feature: User Management

  Scenario: Create user
    Given an administrator for tenant "acme-corp"
    When the admin creates a new user with email "newmember@acme.com" and role "MEMBER"
    Then the user record is successfully saved in the tenant database

  Scenario: Delete user
    Given an administrator for tenant "acme-corp"
    And an existing member "member@acme.com"
    When the admin soft-deletes the member "member@acme.com"
    Then the user deletedAt timestamp is set

  Scenario: Validation failure
    Given an administrator for tenant "acme-corp"
    When the admin attempts to create a user with invalid email "not-an-email"
    Then the validation pipe rejects the request with status 400
