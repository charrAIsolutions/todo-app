# Upcoming Features

## High Impact

### 1. Due Dates & Reminders

Add a `dueDate` field to the `Task` type and a date picker on the task detail screen. Pair with `expo-notifications` for local reminders on iOS (already on TestFlight).

### 2. Task Notes / Description

Add a body text field to the task detail screen. Tasks currently only have `title` — a notes field lets you capture context without stuffing it into the title.

### 3. Search

Add a search bar to filter tasks by title across all lists. As task count grows across multiple lists, discoverability becomes a problem.

### 4. Move to List (Mobile)

Cross-list task moves only work via drag in web split-view. Add a "Move to list" picker on the task detail screen (`app/task/[id].tsx`) so mobile users can move tasks between lists.

### 5. Forgot Password

Add a password reset flow to the login screen. Supabase Auth supports `resetPasswordForEmail()` — small addition with real utility.

## Medium Impact

### 6. Category Colors

`Category.color` exists in the data model and reducer but is never surfaced in UI. Wire it up with color dots on category headers and a color picker in list settings, or remove the dead field.

### 7. List Reordering

`TodoList.sortOrder` exists but there's no UI to reorder tabs. Add up/down arrows in the list settings modal (same pattern as category reorder).

### 8. Clear Completed Tasks

Completed tasks can be shown/hidden globally, but there's no "clear all completed" bulk action or archive view.

### 9. Recurring Tasks

Support repeat tasks (e.g., "Take vitamins", "Weekly review") with a recurrence rule on the task detail screen.

## Low Priority / Polish

### 10. Bulk Operations

Multi-select mode for batch complete, delete, or move tasks.

### 11. Repurpose Tab Two

`app/(tabs)/two.tsx` is a dead placeholder. Remove it or repurpose it (e.g., a "Today" view filtering tasks by due date, or a search screen).

### 12. Custom App Icon

Replace the default Expo icon before App Store submission.
