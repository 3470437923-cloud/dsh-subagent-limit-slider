/**
 * Host half.
 *
 * This plugin owns no host-side behaviour: the setting it edits
 * (`maxActiveSubagents`) belongs to `@deepseek-ai/dsh-subagent`, and the write
 * travels over the existing settings channel. This empty `apply` exists so the
 * package holds a Loader row, which is what makes the client module system
 * serve the browser half declared under `dsh.client` in package.json.
 */
function apply() {}

export { apply };
