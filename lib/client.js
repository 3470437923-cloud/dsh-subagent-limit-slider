window.__ModuleLoader__.load({
  id: "dsh-subagent-limit-slider",
  factory: (require) => {
    const React = require("react");

    /** Settings namespace owned by the host-side @deepseek-ai/dsh-subagent plugin. */
    const SUBAGENT_NS = "subagent";
    /** Field inside that namespace holding the live-subagent ceiling. */
    const LIMIT_FIELD = "maxActiveSubagents";

    /** Host schema default, used when no value has been stored yet. */
    const DEFAULT_LIMIT = 8;
    /** Schema minimum: the host rejects anything below 1. */
    const MIN_LIMIT = 1;
    /** Slider ceiling. The host schema has no maximum; this only bounds the UI. */
    const MAX_LIMIT = 32;
    /** Coalescing window so a drag produces one write, not one per pixel. */
    const WRITE_DELAY_MS = 200;

    const css = `
      .dsh-sls {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 28px;
        color: var(--dsw-alias-label-tertiary);
        font-size: 12px;
        line-height: 18px;
        white-space: nowrap;
      }
      .dsh-sls__label { color: var(--dsw-alias-label-tertiary); }
      .dsh-sls__range {
        width: 84px;
        height: 14px;
        margin: 0;
        accent-color: var(--dsw-alias-brand-primary);
        cursor: pointer;
      }
      .dsh-sls__range:disabled { opacity: .45; cursor: default; }
      .dsh-sls__value {
        min-width: 20px;
        color: var(--dsw-alias-label-primary);
        font-variant-numeric: tabular-nums;
        text-align: right;
      }
      .dsh-sls--failed .dsh-sls__value { color: var(--dsw-alias-state-error-primary); }
    `;

    if (typeof document !== "undefined" && document.querySelector("style[data-dsh-sls]") === null) {
      const tag = document.createElement("style");
      tag.dataset.dshSls = "true";
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    /**
     * Read the stored ceiling from a form snapshot.
     * @param snapshot - configForms snapshot for the `subagent` namespace.
     * @returns the stored integer, or the host default when absent/invalid.
     */
    function limitOf(snapshot) {
      const value = snapshot.value?.[LIMIT_FIELD];
      return Number.isSafeInteger(value) && value >= MIN_LIMIT ? value : DEFAULT_LIMIT;
    }

    /**
     * The composer slider: drafts locally while dragging, then writes once.
     * @param props.scope - the bound configForms form for `subagent`.
     */
    function SubagentLimitSlider({ scope }) {
      const subscribe = React.useCallback((listener) => scope.subscribe(listener), [scope]);
      const read = React.useCallback(() => scope.getSnapshot(), [scope]);
      const snapshot = React.useSyncExternalStore(subscribe, read, read);

      const stored = limitOf(snapshot);
      const [draft, setDraft] = React.useState(stored);
      const [failed, setFailed] = React.useState(false);
      const timer = React.useRef(null);

      // Re-sync whenever the accepted value changes, so another surface editing
      // the same namespace (the Plugins settings page) is reflected here.
      React.useEffect(() => {
        if (timer.current !== null) clearTimeout(timer.current);
        timer.current = null;
        setDraft(stored);
        setFailed(false);
      }, [stored]);

      React.useEffect(() => () => {
        if (timer.current !== null) clearTimeout(timer.current);
      }, []);

      const disabled = snapshot.status !== "ready" || !snapshot.writable;

      /** Write one accepted value through the revision-fenced form API. */
      const commit = (next) => {
        const latest = scope.getSnapshot();
        if (latest.status !== "ready" || !latest.writable) return;
        const settle = (accepted) => {
          if (accepted === false) {
            setFailed(true);
            setDraft(limitOf(scope.getSnapshot()));
          } else {
            setFailed(false);
          }
        };
        const write = scope.set(LIMIT_FIELD, next);
        if (write !== undefined && typeof write.then === "function") write.then(settle, () => {
          setFailed(true);
          setDraft(limitOf(scope.getSnapshot()));
        });
      };

      const onChange = (event) => {
        const next = Number(event.target.value);
        setDraft(next);
        setFailed(false);
        if (timer.current !== null) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          timer.current = null;
          commit(next);
        }, WRITE_DELAY_MS);
      };

      const title = failed
        ? `子代理并行数量上限保存失败 · Subagent parallelism limit could not be saved`
        : `子代理并行数量上限：${draft} · 同一主 Agent 下同时存活的子代理总数\nSubagent parallelism limit: ${draft}`;

      return React.createElement(
        "label",
        { className: `dsh-sls${failed ? " dsh-sls--failed" : ""}`, title },
        React.createElement("span", { className: "dsh-sls__label" }, "子代理"),
        React.createElement("input", {
          className: "dsh-sls__range",
          type: "range",
          min: MIN_LIMIT,
          max: MAX_LIMIT,
          step: 1,
          value: draft,
          disabled,
          "aria-label": "Subagent parallelism limit",
          onChange,
        }),
        React.createElement("output", { className: "dsh-sls__value" }, draft),
      );
    }

    /** Required client services. */
    const inject = ["slots", "configForms"];

    /**
     * Mount the slider into the composer tool row.
     *
     * `whileServed` keeps the control absent on compositions that never mount
     * the host `subagent` plugin, so this plugin cannot leave a dead control
     * behind on a profile that has no delegation at all.
     * @param ctx - the browser plugin context.
     */
    function apply(ctx) {
      const scope = ctx.configForms.get(SUBAGENT_NS);
      ctx.effect(
        () =>
          ctx.configForms.whileServed([SUBAGENT_NS], () =>
            ctx.slots.inject("conversation.input.left", () =>
              ctx.slots.register(
                {
                  name: "conversation.input.left",
                  id: "subagent-limit-slider",
                  order: 40,
                  inject: () => ({ scope }),
                },
                SubagentLimitSlider,
              ),
            ),
          ),
        "subagent-limit-slider: composer slider",
      );
    }

    return { apply, inject };
  },
});
