PinPanel is an add-on for Firefox to make it possible to debug panels,
since their default behavior is to disappear when the mouse is clicked in a
debugger tool (Firebug or otherwise).

When enabled, the panel no longer automatically hides itself,
and only closes when the toolbar button that spawned the panel is clicked.

The hope is for this to go away once better debuggability is added to Firefox
itself.

It's a bootstrapped add-on based Mardak's restartless stuff <http://ed.agadak
.net/2011/01/restartless-add-on-example-code>.

If you need to modify this XPI, you can cause it to be rebuilt by executing
`make pinpanel` in the top-level directory of the Talkilla repo.

