# Generate alpha keymap for as many notes as possible (proceed to next diapason)

**User Story:**
As a website visitor, I want each key in the `alphaKeyMap` to be assigned a musical note, so that I can use all of the alpha keys on my keyboard to play a note.

**Acceptance Criteria:**
1. The `alphaKeyMap` should initially be created for all of the notes in one diapason.
2. All notes in a diapason should be used before moving onto the next one.
3. If there are more alpha keys than notes in the current diapason, the remaining keys should be assigned notes from the succeeding diapasons, in order.
4. All alpha keys should have a note assigned, even if this requires using notes from multiple diapasons.
5. The functionality to create the `alphaKeyMap` for all of the notes in one diapason should be maintained.
6. The assignment of keys should stop once all keys have been assigned, even if there are remaining notes in the diapason.
