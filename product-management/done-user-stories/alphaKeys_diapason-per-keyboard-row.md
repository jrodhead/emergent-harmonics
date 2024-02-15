**User Story: Diapasons per row on the keyboard**

As a user interacting with the website's musical keyboard functionality, I want each row of keys on the keyboard to correspond to a different diapason. This organization will enhance my understanding of the mapping between keys and notes, improving usability and user experience.

**Acceptance Criteria:**

1. The keyboard keys should be divided into three separate rows, with each row representing a distinct diapason: 'qwertyuiop', 'asdfghjkl;', and 'zxcvbnm,./'.
2. The alphaKeyMap should be generated to include all notes within one diapason for each row. This ensures that each key within a row corresponds to a unique note within its assigned diapason.
3. In cases where a keyboard row contains more keys than there are notes in its assigned diapason, the additional keys should be assigned notes from subsequent diapasons in sequence. This guarantees that each key within a row remains associated with a unique note.
4. After assigning notes to all keys in a row, the subsequent row should utilize the next diapason in sequence. This sequential assignment process should continue until each row has been assigned keys associated with notes from distinct diapasons, maintaining clarity and consistency in the mapping between keys and notes across all keyboard rows.

## Bugs to fix

[] unassigned keys in a row are not being assigned notes in the subsequent diapason in sequence

# story split

**User Story:**
As a user of the website's musical keyboard functionality, I want the ability to choose between different key mapping layouts, enabling me to select the layout that best suits the music I wish to play.

**Acceptance Criteria:**
1. A new option should be added to the System Configuration that allows users to select a Key Layout.
2. Two Key Layout options should be available: 'Sequential' and 'Diapason Rows'.
  1. The 'Sequential' option should utilize the existing `createAlphaKeyMap` function, which will be renamed to `createSequentialNoteKeyMap`.
  2. The 'Diapason Rows' option should utilize a new function named `createDiapasonRowKeyMap`.