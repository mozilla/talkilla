Frequently Asked Questions
==========================

Why is Talkilla using long-polling rather than web sockets?
-----------------------------------------------------------

Web sockets were being used in the past, and then the SPA had been put in web
workers. Because [web sockets are not supported in firefox web workers](https://bugzilla.mozilla.org/show_bug.cgi?id=504553#c42),
we had to switch to another solution: long polling.