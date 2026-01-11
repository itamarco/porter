# Theme Configuration

## Font Size Configuration

All font sizes in the application are centralized in `src/theme.ts` for easy modification.

### Font Size Reference

```typescript
export const fontSizes = {
  // Headings
  heading: 'text-sm',
  
  // Body text
  body: 'text-xs',
  bodySmall: 'text-[10px]',
  bodyTiny: 'text-[9px]',
  
  // Dialog/Modal
  dialogTitle: 'text-sm',
  dialogBody: 'text-xs',
  dialogLabel: 'text-xs',
  dialogMono: 'text-[10px]',
  dialogWarning: 'text-[10px]',
  
  // Toast/Notifications
  toast: 'text-xs',
  
  // Buttons
  button: 'text-[10px]',
  buttonSmall: 'text-[9px]',
  
  // Service list specific
  serviceName: 'text-xs',
  serviceInfo: 'text-[9px]',
  
  // Cluster names
  clusterName: 'text-sm',
};
```

### Tailwind Font Size Reference

For reference, here are the standard Tailwind CSS font sizes:

- `text-[9px]` = 9px (custom)
- `text-[10px]` = 10px (custom)
- `text-xs` = 12px (0.75rem)
- `text-sm` = 14px (0.875rem)
- `text-base` = 16px (1rem)
- `text-lg` = 18px (1.125rem)
- `text-xl` = 20px (1.25rem)

### How to Modify Font Sizes

1. Open `src/theme.ts`
2. Modify the desired font size value
3. The change will apply to all components using that size
4. Hot Module Replacement will update the app automatically

### Components Using Theme

The following components use the centralized font sizes:

- **PortOccupiedDialog** - Error dialog for port conflicts
  - Title: `dialogTitle`
  - Body text: `dialogBody`
  - Labels: `dialogLabel`
  - Process details: `dialogMono`
  - Warning text: `dialogWarning`
  - Buttons: `button`

- **Toast** - Notification messages
  - Message text: `toast`

### Future Enhancements

Consider adding more theme properties:
- Colors
- Spacing
- Border radius
- Shadow depths
