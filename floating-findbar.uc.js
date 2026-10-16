(() => {
    window.floatingFindbarSettings?.destroy();

    const controller = new AbortController();
    const { signal } = controller;
    const buttons = new Map();
    const panels = new Map();
    const counters = new Map();
    let activeBar = null;

    const close = () => {
        if (!activeBar) return;
        activeBar.removeAttribute("data-options-open");
        buttons.get(activeBar)?.setAttribute("aria-expanded", "false");
        activeBar = null;
    };

    const attach = bar => {
        if (buttons.has(bar)) return;
        const container = bar.querySelector(".findbar-container");
        if (!container) return;

        const button = document.createElementNS("http://www.w3.org/1999/xhtml", "button");
        button.className = "floating-findbar-settings";
        button.type = "button";
        button.title = "Search options";
        button.setAttribute("aria-label", "Search options");
        button.setAttribute("aria-expanded", "false");
        button.hidden = !!bar.querySelector(".findbar-textbox.minimal");
        const matches = container.querySelector(".found-matches");
        if (matches) {
            const zeroMatches = document.createElementNS("http://www.w3.org/1999/xhtml", "span");
            zeroMatches.className = "floating-findbar-zero-matches";
            zeroMatches.textContent = "0 matches";
            zeroMatches.hidden = button.hidden;
            container.insertBefore(zeroMatches, matches.nextSibling);
            counters.set(bar, zeroMatches);
        }
        const panel = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
        panel.className = "floating-findbar-options";
        panel.hidden = button.hidden;
        const positions = [...container.querySelectorAll(":scope > checkbox")]
            .map(node => ({ node, next: node.nextSibling }));
        for (const { node } of positions) panel.appendChild(node);
        const highlight = panel.querySelector(".findbar-highlight");
        if (highlight) highlight.hidden = false;
        button.addEventListener("click", () => {
            const wasOpen = activeBar === bar;
            close();
            if (!wasOpen) {
                activeBar = bar;
                bar.setAttribute("data-options-open", "");
                button.setAttribute("aria-expanded", "true");
            }
        }, { signal });
        container.appendChild(panel);
        container.appendChild(button);
        buttons.set(bar, button);
        panels.set(bar, { panel, positions });
    };

    document.addEventListener("findbaropen", event => {
        close();
        attach(event.target);
    }, { capture: true, signal });

    document.addEventListener("findbarclose", close, { capture: true, signal });

    window.addEventListener("pointerdown", event => {
        if (!activeBar) return;
        const path = event.composedPath();
        if (path.includes(buttons.get(activeBar))) return;
        if (path.includes(panels.get(activeBar)?.panel)) return;
        close();
    }, { capture: true, mozSystemGroup: true, signal });

    window.addEventListener("keydown", event => {
        if (event.key !== "Escape" || !activeBar) return;
        const button = buttons.get(activeBar);
        close();
        button.focus();
        event.preventDefault();
        event.stopImmediatePropagation();
    }, { capture: true, signal });

    window.addEventListener("blur", event => {
        if (event.target === window) close();
    }, { signal });

    window.gBrowser?.tabContainer.addEventListener("TabSelect", close, { signal });
    document.querySelectorAll("findbar").forEach(attach);

    const destroy = () => {
        close();
        controller.abort();
        for (const button of buttons.values()) button.remove();
        for (const counter of counters.values()) counter.remove();
        for (const { panel, positions } of panels.values()) {
            for (const { node, next } of [...positions].reverse()) {
                panel.parentNode.insertBefore(node, next);
            }
            panel.remove();
        }
        buttons.clear();
        panels.clear();
        counters.clear();
        delete window.floatingFindbarSettings;
    };

    window.addEventListener("unload", destroy, { once: true, signal });
    window.floatingFindbarSettings = { destroy };
})();
