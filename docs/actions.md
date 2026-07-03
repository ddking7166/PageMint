# Actions

`@pagemint/actions` provides a small `data-action` protocol.

```tsx
<ActionButton action="modal.open" payload={{ id: 'settings' }}>
  Open
</ActionButton>
```

The browser runtime listens for clicks and dispatches registered handlers. It does not implement hydration or global state management.

See [API Reference](./api.md) for every action API, prop, option, event, and parameter.
