# Debugging Talkilla

Talkilla is currently based mainly around the [Social API](https://developer.mozilla.org/docs/Social_API) in Firefox. As a result, the usual debugging tools for web applications can't be used. However, there are alternatives and replacements.

The Social API consists of front-end parts (e.g. conversation window) and a number of background workers.

## Logging in the browser

Found under `Tools -> Web Developer -> Browser Console`, the [Browser Console](https://developer.mozilla.org/docs/Tools/Browser_Console) is the main logger to view. It can show various errors, logging and network activity.

Currently, you have to log in different ways depending on if you are in a worker or not. It is hoped that this will be resolved in the future ([bug 620935](https://bugzilla.mozilla.org/show_bug.cgi?id=620935)).

### Front-end logging

To log to the browser console from a front-end window, use [console.log](https://developer.mozilla.org/docs/Web/API/console.log). This also allows an object which can then be examined in detail in the Browser Console:

    console.log("Message", object);

The console.log function can take many objects to log.

### Worker logger

To log to the browser console from a worker:

1. Ensure you are running the server in development mode, or with a modified config with `DEBUG` set to true.

2. Ensure the sidebar is open

3. Call a special function:

        tkWorker.ports.broadcastDebug("Message", object);

This function can only take one object to log.

### Dump debugging

If none of the other methods work, worst-case you can use [dump to log output](https://developer.mozilla.org/docs/Debugging_JavaScript#dump.28.29) to the native console.

## Debugging

### Debugging the drop-down panel

In order to effectively debug panels, they need to be made to not disappear
when the mouse pointer is clicked in your debugging tool of choice.  Until
something like this makes it into Firefox, this code base includes an add-on
which makes the drop-down panel not automatically hide itself.  Instead, the
developer clicks in the toolbar button that spawned the panel to make the panel
close.  To install it:

1. Go to `Tools -> Add-ons` while using the browser profile you use for
development

2. Click the `Extensions` side tab

3. Click the gear button next to the search box near the top of the tab

4. Select `Install Add-on From File`

5. Navigate into the `bin` directory in your Talkilla source tree,
and select `PinPanel.xpi`.

### Using Firebug

At the time of this writing, it's not really possible to debug live code in
dynamically created widgets (eg chat box, panel) using the built-in debugger.
Sufficiently new versions (e.g. 1.13.0a6) of Firebug, however,
work pretty well.

### Using the built-in remote debugger

The remote debugger can be used for debugging in the sidebar or the frameworker. See the [general debugger information](https://developer.mozilla.org/docs/Tools/Debugger) for details on how it works.

There are a couple of known issues:

* It cannot currently be used for debugging the sub-workers e.g. the SPAs ([bug 757133](https://bugzilla.mozilla.org/show_bug.cgi?id=757133))
* There is also a known issue where closing and opening a window, or reloading may cause breakpoints not to work as well

To use the remote debugger:

1. In about:config, set both `devtools.debugger.remote-enabled` and `devtools.chrome.enabled` to true

2. Go to `Tools -> Web Developer -> Browser Debugger` (or `Browser Toolbox`,
in newer builds).

3. When it opens, accept the incoming connection

## Inspecting the DOM

If other tools aren't working well enough to inspect the DOM, it's also
possible to use the [DOM Inspector]
(https://addons.mozilla.org/firefox/addon/dom-inspector-6622/).

To use the add-on:

1. Install it from the [add-on page](https://addons.mozilla.org/firefox/addon/dom-inspector-6622/) and restart Firefox if necessary.

2. Open DOM Inspector (Command/Ctrl+shift+I keyboard shortcut)

3. File->Inspect Content Document->Talkilla Sidebar (or the title of the window you want to inspect)

4. Click the first toolbar button.

5. Focus the main browser window again, and click on the element you want to inspect; it will be shown/selected in the tree on the left side of the DOM Inspector window.

6. At the top of the right panel, there's a drop down to select between "DOM Node", "Box Model", "CSS Rules", "Computed Style", "JavaScript Object". All these views are very useful (for different purposes), try them :-).
