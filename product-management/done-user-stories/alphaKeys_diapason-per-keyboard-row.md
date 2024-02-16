**User Story:**
As a user of the website's musical keyboard functionality, I want the ability to choose between different key mapping layouts, enabling me to select the layout that best suits the music I wish to play.

**Acceptance Criteria:**
1. A new option should be added to the System Configuration that allows users to select a Key Layout.
2. Two Key Layout options should be available: 'Sequential' and 'Diapason Rows'.
  1. The 'Sequential' option should utilize the existing `createAlphaKeyMap` function, which will be renamed to `createSequentialNoteKeyMap`.
  2. The 'Diapason Rows' option should utilize a new function named `createDiapasonRowKeyMap`.

**User Story: Diapasons per Keyboard Row**
As a user of the website's musical keyboard functionality, I want each keyboard row to represent a different diapason, enhancing my understanding of the key-note mapping and improving my user experience.

**Acceptance Criteria:**
When 'Diapason Rows' is selected as the Key Layout option, the keymap should be generated as follows:

1. Keyboard keys should be grouped into three separate rows, each corresponding to a distinct diapason: 'qwertyuiop', 'asdfghjkl;', and 'zxcvbnm,./'.
2. The `alphaKeyMap` should be generated to map each key in a row to a unique note within the corresponding diapason.
3. If a keyboard row has more keys than there are notes in its diapason, the extra keys should be assigned notes from the next diapason(s) in sequence, ensuring each key is associated with a unique note.
4. Once all keys in a row have been assigned notes, the next row should start with the following diapason. This process should continue until all rows have keys mapped to notes from distinct diapasons, ensuring a consistent key-note mapping across all keyboard rows.

## Bugs to fix

[] unassigned keys in a row are not being assigned notes in the subsequent diapason in sequence
