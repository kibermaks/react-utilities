# Coda Calls Page

A Next.js page component for logging calls with various parameters and saving them to Coda.

## Features

- Log calls with different types (Regular, Incoming, Incoming(Event), Skip)
- Set call duration with preset options or custom input
- Rate calls from 1 to 6 stars
- Set date and time for the call
- Add comments about the call
- Form validation
- Success animation with confetti
- Dark mode support
- Keyboard navigation
- Accessibility features

## URL Parameters

The page accepts the following URL parameters:

### Required Parameters

- `s` or `access_secret`: Access secret for Coda API authentication
- `r` or `RowID`: Row ID in Coda to update

### Optional Parameters

- `n` or `Name`: Name of the person for the call
- `t` or `callType`: Type of call (Regular, Incoming, Incoming(Event), Skip)
- `d` or `duration`: Call duration in minutes
- `c` or `comments`: Comments about the call

### Example URLs

```pseudo
# Basic usage with required parameters
/private/coda-calls?s=xxx&r=123

# Full usage with all parameters
/private/coda-calls?s=xxx&r=123&n=John%20Doe&t=Regular&d=15&c=Follow-up%20call

# Short parameter version
/private/coda-calls?s=xxx&r=123&n=John%20Doe&t=Regular&d=15&c=Follow-up%20call
```

## Form Validation

The form validates the following:

- RowID is required
- Name is required (if provided)
- Duration must be between 1 and 120 minutes
- Date and time cannot be in the future
- Comments cannot exceed 10000 characters

Note: Call type defaults to 'Regular' if not specified.

## UI Components

### Call Type Selection

- Radio button group with 4 options:
  - Regular (gray)
  - Incoming (green)
  - Incoming(Event) (green)
  - Skip (red)

### Duration Selection

- Grid of preset duration buttons (1, 3, 5, 10, 20, 30, 45, 60 minutes)
- Custom duration input option
- Input validation for custom duration

### Rating

- 6-star rating system
- Interactive star buttons
- Visual feedback for selected rating

### Date and Time

- Native datetime-local input
- Defaults to current date and time
- Prevents future dates

### Comments

- Textarea for call notes
- Character limit: 1000
- URL-encoded comments are automatically decoded

## Accessibility Features

- ARIA roles and labels for all interactive elements
- Keyboard navigation support
- Focus management
- Semantic HTML structure
- Color contrast compliance
- Screen reader friendly

## State Management

The page uses React's useState and useCallback hooks for:

- Form data
- Validation errors
- UI state (custom duration, confetti)
- Error handling

## API Integration

The page integrates with Coda API through the `createCodaRow` function to:

- Create new Call Log for Friend
- Handle API errors
- Show success feedback

## Error Handling

- Displays error messages in a card
- Validates form before submission
- Handles API errors gracefully
- Shows validation errors inline

## Success Feedback

- Shows confetti animation on successful submission
- Resets form after successful submission
- Clears validation errors

## Styling

- Uses Tailwind CSS for styling
- Responsive design
- Dark mode support
- Consistent spacing and layout
- Interactive hover and focus states

## Technical Details

- Built with Next.js 13+ App Router
- Client-side component ('use client')
- TypeScript for type safety
- React hooks for state management
- Modular component structure
