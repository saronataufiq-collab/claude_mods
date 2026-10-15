# Claude mods

Two mods for Claude Code.

- **prompt-coach**: shows a tip when a prompt is vague. `/sharpen <idea>` rewrites a rough idea into a clear prompt (`/sharpen --send <idea>` sends it).
- **model-router**: early in a conversation, greetings go to Haiku and quick questions to Sonnet; real work stays on your chosen model. `/router on|off`. Start a message with `!` to skip routing.

## Install

In a `claude` terminal (not the desktop Code tab), run each line, answer `y` to add the marketplace, then pick the user scope:

```
/plugin install prompt-coach --marketplace saronataufiq-collab/claude_mods
```

```
/plugin install model-router --marketplace saronataufiq-collab/claude_mods
```

Installed at the user scope, they also load in the desktop app's Code tab.
