Feature: Dashboard

  Scenario: User views dashboard
    Given an authenticated user logged into tenant "acme-corp"
    When the user requests the dashboard metrics page
    Then the system returns 200 OK with tenant metrics data

  Scenario: Unauthorized access
    Given an unauthenticated visitor
    When the visitor attempts to access tenant "acme-corp" dashboard
    Then the system rejects access with a 401 Unauthorized redirect
