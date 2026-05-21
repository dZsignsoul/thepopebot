# Summary

Issue #3 requests adding `test/sample.test.js` containing one intentionally failing test that asserts `1 === 2`.

# Acceptance Criteria

- Create `test/sample.test.js`.
- The file contains exactly one test case.
- The test case fails by asserting that `1 === 2`.
- No unrelated code, configuration, or documentation changes are made.

# Affected Files (best guess)

- `test/sample.test.js`

# Suggested Approach

Add a new `test/` directory if it does not already exist, then create `sample.test.js` using the repository's expected test style. If no test framework is configured, choose the smallest conventional Node.js test format compatible with the intended runner before wiring anything broader.

# Risks

- The repository currently has a placeholder `npm test` script and no existing app test files, so the new test may not be discoverable until a real test runner is configured.
- Because the requested test is intentionally failing, any CI job that does discover and execute it will fail by design.
- Introducing a test framework or changing scripts would exceed the issue request unless explicitly approved.
