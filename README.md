# dsh-subagent-limit-slider

English | [中文](README.zh.md)

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin that puts the **subagent parallelism limit** on a slider in the composer tool row — beside the permission and plan controls — so you can change how wide delegation may go without leaving the conversation.

## What it does

The slider reads and writes `maxActiveSubagents` in the host's `subagent` configuration namespace. The host enforces that value: once the ceiling is reached, further delegation is refused with

```
subagent limit reached (active child limit: N)
```

until a running subagent finishes.

- **Range:** 1–32. The host schema has no maximum; 32 bounds the slider only.
- **Meaning:** every live subagent under one main agent, across all recursion levels. The main agent itself is excluded.
- **Coalesced writes:** a drag produces one settings write, not one per pixel.
- **Immediate effect:** the new ceiling applies to subsequent start requests. Subagents already running are not stopped.
- **Visible failure:** if the host rejects a write, the number turns red and snaps back to the accepted value.

## Install

### Option 1 — from GitHub (recommended)

Add the repository as a bundle to the profile you want it in:

```
github:3470437923-cloud/dsh-subagent-limit-slider
```

You can hand that spec to an agent in a session, or use the Plugins page in the Web GUI. Then restart DeepSeek Harness so the profile is re-composed.

### Option 2 — manual

From your profile directory (for example `~/.dsh/profiles/desktop`):

```sh
pnpm add github:3470437923-cloud/dsh-subagent-limit-slider
```

Then add the package name to that profile's `package.json`:

```json
{
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-subagent-limit-slider"
      ]
    }
  }
}
```

Restart DeepSeek Harness.

## Usage

The control appears at the **left of the composer tool row**, after the permission and plan controls. Drag it; the number beside it is the current ceiling.

## Relationship to the built-in settings page

DeepSeek Harness already exposes this same field at **Settings → Plugins → Subagent → Subagent parallelism limit**. This plugin does not add a capability — it adds a faster path to the value you already own.

Both surfaces read and write the same namespace, so they never disagree: change it in one place and the other reflects it.

## Compatibility

Developed and verified against DeepSeek Harness **`0.2.0-rc.2`**.

The plugin leans on four host contracts, any of which a future release could rename:

| Contract | Used for |
|---|---|
| `dsh.bundle.patch` manifest field | being selectable as a profile bundle |
| `dsh.client` declaration and the `__ModuleLoader__.load` bundle format | how the browser half is loaded |
| the `conversation.input.left` slot | where the slider mounts |
| the `configForms` service, `subagent` namespace, `maxActiveSubagents` field | the value it reads and writes |

The mount is **guarded**: on a composition that never mounts the host `subagent` plugin, the control stays absent instead of rendering a dead control.

**Platforms.** The plugin is browser-side only and contains no platform-specific code, so it is expected to behave identically on macOS, Windows, and Linux. It has been **verified on macOS only** — Windows is untested. Reports welcome.

## How it works

The package has two halves:

- `lib/index.js` — an empty host `apply`. It exists only so the package holds a Loader row, which is what makes the client module system serve the browser half.
- `lib/client.js` — the browser half. It binds the `subagent` namespace through the `configForms` service, registers a React control into `conversation.input.left`, and writes through the revision-fenced form API.

`cordis.patch.yml` inserts that single Loader row. Without it the package is not a bundle, and no profile can select it.

## Limitations

- The UI caps the slider at 32. The host schema has no maximum, so a larger value set elsewhere is displayed but cannot be dragged past the cap.
- The setting is stored per profile, so it applies to every session using that profile.
- Changing the value does not stop subagents that are already running.

## Uninstall

Remove `dsh-subagent-limit-slider` from the profile's `dsh.profile.bundles`, then restart. To drop the dependency too, run `pnpm remove dsh-subagent-limit-slider` in the profile directory.

## Development

There is no build step. `lib/client.js` is the source that ships, written against the bundle format the client module system expects.

To work on it locally, link the checkout into a profile:

```sh
cd ~/.dsh/profiles/desktop
pnpm add link:./path/to/dsh-subagent-limit-slider
```

and add the package name to `dsh.profile.bundles`.

## License

[MIT](LICENSE)
