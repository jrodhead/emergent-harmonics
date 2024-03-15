# Diapason Generation for Secondary Roots

As a user of the website's musical keyboard functionality, I want the diapasons for secondary roots to be calculated based on their respective triad types. This will ensure that the musical system accurately reflects the characteristics of each secondary root.

**Acceptance Criteria:**

- The primaryCalculatorType should be used to generate rootNotes. This functionality is already in place and should continue to work as expected.
- The relationshipToRoot.triadType property of each rootNote should be used to determine the method for generating the diapasons for that rootNote.
- The system should handle any exceptions gracefully and provide meaningful error messages if the diapason generation fails for any reason.