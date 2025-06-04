# TaskMaster Form Components Documentation

## Overview

The TaskMaster Form Components library provides a comprehensive set of reusable, accessible, and type-safe form components built with React Hook Form, Zod validation, and shadcn/ui design system.

## Architecture

### Core Technologies
- **React Hook Form**: Form state management and validation
- **Zod**: Schema validation and type inference
- **shadcn/ui**: Base UI components and design system
- **Tailwind CSS**: Styling and responsive design
- **TypeScript**: Type safety and developer experience

### Design Principles
1. **Accessibility First**: WCAG 2.1 AA compliance
2. **Type Safety**: Comprehensive TypeScript support
3. **Composability**: Components work together seamlessly
4. **Consistency**: Unified design language
5. **Developer Experience**: Easy to use and extend

## Component Categories

### Core Input Components

#### FormInput
Versatile input component supporting text, email, number, password, and other input types.

**Features:**
- Built-in validation with error display
- Support for all HTML input types
- Required field indicators
- Accessible labels and descriptions
- Number input with proper type conversion

**Props:**
- `name`: Field name for form control
- `type`: HTML input type (text, email, number, etc.)
- `label`: Field label
- `placeholder`: Placeholder text
- `description`: Help text
- `required`: Required field indicator
- `disabled`: Disabled state
- `min`, `max`, `step`: Number input constraints

#### FormTextarea
Multi-line text input with auto-resize capabilities.

**Features:**
- Auto-resize based on content
- Character count display
- Validation support
- Accessible labeling

#### FormSelect
Dropdown selection component with search functionality.

**Features:**
- Searchable options
- Custom option rendering
- Placeholder support
- Validation integration

#### FormCheckbox
Boolean input with custom styling and accessibility.

**Features:**
- Custom checkbox styling
- Accessible labels
- Validation support
- Indeterminate state

#### FormDatePicker
Date selection with calendar popup.

**Features:**
- Calendar popup interface
- Date range validation
- Accessible date input
- Keyboard navigation

### Advanced Components

#### FormMultiSelect
Multiple selection component with tag display.

**Features:**
- Multiple option selection
- Tag-based display
- Search functionality
- Maximum selection limits

#### FormTagInput
Dynamic tag creation and management.

**Features:**
- Dynamic tag creation
- Tag suggestions
- Validation support
- Maximum tag limits

### Layout Components

#### FormSection
Organized form sections with titles and descriptions.

**Features:**
- Section organization
- Collapsible sections
- Consistent spacing
- Accessible headings

#### FormActions
Button groups for form actions with consistent spacing.

**Features:**
- Flexible button layouts
- Responsive design
- Consistent spacing
- Alignment options

### Action & Display Components

#### FormButton
Enhanced button component with loading states and icons.

**Features:**
- Loading states with spinners
- Icon support (left/right positioning)
- Multiple variants and sizes
- Full-width option
- Accessibility compliant

#### FormBadge
Status indicators and tags with multiple variants.

**Features:**
- Multiple color variants
- Different sizes
- Icon support
- Removable functionality
- Pulse animations

#### FormAlert
Contextual messages and notifications.

**Features:**
- Multiple alert types (success, warning, error, info)
- Dismissible alerts
- Icon support
- Custom titles and descriptions

#### FormToast
Global notification system.

**Features:**
- Toast notifications
- Multiple variants
- Custom duration
- Action buttons
- Queue management

### Dialog & Context Components

#### FormDialog
Modal dialogs for forms and confirmations.

**Features:**
- Controlled and uncontrolled modes
- Customizable triggers
- Flexible content and footers
- Responsive sizing
- Accessibility compliant
- Keyboard navigation

#### ConfirmDialog
Specialized confirmation dialogs for destructive actions.

**Features:**
- Pre-built confirmation layout
- Customizable messages
- Loading states
- Accessible design

#### FormContextMenu
Right-click context menus for enhanced interactions.

**Features:**
- Multiple action types (regular, checkbox, radio)
- Nested sub-menus
- Keyboard shortcuts
- Separators and labels
- Destructive action styling

## Validation & Error Handling

### Zod Integration
All components integrate seamlessly with Zod schemas for validation:

```typescript
const schema = z.object({
  email: z.string().email('Invalid email'),
  age: z.number().min(18, 'Must be 18 or older'),
});
```

### Error Display
- Real-time validation feedback
- Accessible error announcements
- Visual error indicators
- Field-level error messages

## Accessibility Features

### WCAG 2.1 AA Compliance
- Proper ARIA labels and descriptions
- Keyboard navigation support
- Focus management
- Screen reader optimization
- Color contrast compliance

### Keyboard Navigation
- Tab order management
- Enter/Space key handling
- Escape key support
- Arrow key navigation (where applicable)

### Screen Reader Support
- Descriptive labels
- Error announcements
- State changes
- Progress indicators

## Styling & Theming

### Design Tokens
Components use consistent design tokens from shadcn/ui:
- Colors
- Typography
- Spacing
- Border radius
- Shadows

### Customization
- CSS custom properties
- Tailwind CSS classes
- Component variants
- Theme overrides

## Testing

### Automated Testing
- Unit tests with Vitest
- Accessibility tests with axe
- Visual regression tests
- Integration tests

### Manual Testing
- Keyboard navigation
- Screen reader testing
- Cross-browser compatibility
- Mobile responsiveness

## Best Practices

### Form Design
1. Use clear, descriptive labels
2. Provide helpful descriptions
3. Group related fields
4. Use appropriate input types
5. Implement proper validation

### Accessibility
1. Always provide labels
2. Use semantic HTML
3. Implement keyboard navigation
4. Test with screen readers
5. Ensure color contrast

### Performance
1. Use controlled components wisely
2. Implement proper memoization
3. Optimize re-renders
4. Lazy load heavy components

## Migration Guide

### From Basic HTML Forms
1. Replace HTML inputs with Form components
2. Add Zod validation schemas
3. Implement React Hook Form
4. Update styling to use design tokens

### From Other Libraries
1. Map existing props to component APIs
2. Update validation logic to use Zod
3. Migrate styling to Tailwind CSS
4. Test accessibility compliance

## Contributing

### Adding New Components
1. Follow existing patterns
2. Implement accessibility features
3. Add comprehensive tests
4. Create Storybook stories
5. Update documentation

### Reporting Issues
1. Use GitHub issues
2. Provide reproduction steps
3. Include accessibility concerns
4. Test across browsers

## Support

For questions, issues, or contributions:
- GitHub Issues: [Repository Issues](https://github.com/your-repo/issues)
- Documentation: [Storybook](http://localhost:6006)
- Examples: See Storybook stories
