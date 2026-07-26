Feature: User Login

  Scenario: Successful login
    Given a registered user with email "admin@tenantkit.com" and password "SecurePass123!"
    When the user submits valid login credentials
    Then the authentication response returns an access token
    And the user session becomes active

  Scenario: Invalid password
    Given a registered user with email "user@tenantkit.com" and password "CorrectPassword123!"
    When the user submits login email "user@tenantkit.com" with password "WrongPassword"
    Then the authentication service rejects the request with an unauthorized error

  Scenario: Locked account
    Given a user account "locked@tenantkit.com" is locked due to security policy
    When the user attempts to log in with "locked@tenantkit.com"
    Then the authentication service denies access with account locked status
