How to contribute
=================

The best way to make sure your issue is addressed is to submit a
patch. We accept patches through pull requests, email, comment on
[bugzilla](https://bugzilla.mozilla.org/buglist.cgi?product=Talkilla&component=General&resolution=---),
etc.

However, before sending a patch, please make sure that the following
applies:

* Your commit message links to that issue.
* Your commit message is descriptive enough.
* Your patch doesn't have useless merge commits.
* Your coding style is similar to ours (see below).
* You understand that we're super grateful for your patch.

Testing policy
--------------

- Tests are expected for all checkins, but that can be relexed by reviewer
  - for volunteers (typically reviewer would write tests in that case)
  - for trivial changes
  - for changes where the cost/benefit of implementing the tests is too high

Review policy
-------------
* Pull requests that are pair-programmed with at least one committer do not
  require code review, although contributors are encouraged to request it
  if another set of eyes seems important.  Pair-programmed merges should
  include a sentence like `These commits were paired on by n1k0 and dmose`.
* Otherwise, pull-requests require code review:
  * If you want a specific reviewer(s), explicitly state in the PR who you
    think the right reviewer(s) are. The patch shouldn't be merged until
    each requested reviewer signs off with `r@=reviewer-github-nick` in the PR.
  * Otherwise, any committer who feels qualified is free to review. If you're
    the reviewer, and you need responses to questions or changes before signing off,
    state that you intend to be the reviewer of record in the PR. This helps make it clear
    who has to stamp the PR with `r=@your-github-nick` before merging the PR.

Coding Style
------------

This section describes our coding style guide. You might not agree
with it and that's fine but if you're going to send us patches treat
this guide as a law.

### Spaces, wrapping, and indentation

- No tabs!
- Two space indentation is standard.
- Attempt to wrap lines at 80 characters, though it's OK to have
  longer lines if that's difficult
- Lines should not contain trailing spaces, even after binary
  operators, commas or semicolons.
- Operators should be separated by a space
- Do not use spaces between a function name and its arguments list, or
  between an array name and the square bracket. Also, do no use spaces
  after a bracket. Use a space after a comma to separate arguments.

        fooMethod ( a1, v2 ); // bad
        fooMethod(a1, v2);    // OK

- Use a space between a keyword and parentheses.

        if(condition)             // bad
        if (condition)            // OK

- Do not put compound statements in one line. Indent the controlled
  statement on the next line, for clarity.

        if (condition) break;     // bad
        if (condition)            // OK
          break;

- Function arguments that overflow the first line of the call
  expression should be aligned to underhang the first argument (to
  start in overflow lines in the column after the opening
  parenthesis).

        fooMethod(a1,         // bad
            v2);
        fooMethod(a1,         // OK
                  v2);

- One (or two) blank lines between block definitions. Also consider
  breaking up large code blocks with blank lines to improve
  readability.  Keep operators at the end of the line when wrapping
  conditions. Try to indent to line up with a related item on the
  previous line.

        if (reallyReallyLongCondition() && someOtherLongThing()     // bad
          && somethingShorter()) {
          ...
        }
        if (reallyReallyLongCondition() && someOtherLongThing() &&  // OK
            somethingShorter()) {
          ...
        }


        var result = prompt(message, initialValue,   // bad
          caption);
        var result = prompt(message, initialValue,   // OK
                            caption);

- End each file with a newline.

### Brackets

- Brackets around single line code blocks aren't required, but it's OK
  to use them If a statement or condition covers multiple lines, use
  braces for all the controlled statements (even if the else part fits
  on one line, brace it too). Brackets should always be on the same
  line as "if" or "else".

        if (condition)            // bad
          callThisMethod(argument1,
                         argument2);

        if (condition) {          // OK
          callThisMethod(argument1,
                         argument2);
        }

        if (foo.bar())         // OK
          doBar();
        else
          runAway();

        if (foo.bar()) {       // OK
          // Comment here
          doBar();
        } else {
          runAway();
        }

### Control flow

- Minimize indentation using return, break, and continue where
  appropriate. Prefer return (break, continue) statements to cast out
  abnormal cases, instead of nesting "if/else" statements and
  indenting the common cases.

        function myFunction(a) {
          if (a) {              // bad
            ...
          }
        }

        function myFunction(a) {
          if (!a)
            return;             // OK
          ...
        }

- If an "if" statement controls a "then" clause ending in a return
  statement, do not use "else" after return.

        if (condition) {          // bad
          doThis();
          return;
        } else
          doThat();

        if (condition) {          // OK
          DoThis();
          return;
        }
        DoThat();

- Avoid similar arbitrary patterns and non-sequiturs:

        if (condition) {          // bad
          doThis();
          doThat();
        } else {
          CleanUp();
          return;
        }
        DoTheOther();

        if (!condition) {         // OK
          cleanUp();
          return;
        }
        doThis();
        doThat();
        doTheOther();

### Function and variable names

- Function and variable names should be interCaps, first letter lowercase
- Global singleton objects and modules should use first-letter uppercase InterCaps
- All functions should have names (i.e. no anonymous functions)
- Constants should be in UPPER_CASE
- Arguments (parameter names) should be as descriptive as possible,
  and don't need to be prefixed with "a"
- Event handler functions should be prefixed with the word on, in
  particular try to use the names onLoad, onDialogAccept,
  onDialogCancel etc. where this is unambiguous
- Try to declare local variables as near to their use as possible; try
  to initialize every variable.

Examples:

    function myFooFunction(aArg1, aArg2) {
      ...
    }
    var obj = {
      myFooFunction: function obj_myFooFunc(aArg1, aArg2) {
        var local = aArg1 + " foo";
        this.anotherFunction(local);
      },

      anotherFunction: function obj_anotherFunction(aArg1) {
        ...
      }
    }

### JavaScript features

- Make sure that your code doesn't generate any strict JavaScript
  warnings, such as:
    - Duplicate variable declaration
    - Mixing return; with return value;
    - Trailing comma in JavaScript object declarations
    - Undeclared variables or members. If you are unsure if an array
      value exists, compare the index to the array's length. If you
      are unsure if an object member exists, use "name" in aObject.
- Prefer literal object notation (var obj = {}; over var obj = new
  Object();).
- Similarly, with arrays, prefer var a = [1, a, 3] to var a = new
  Array(1, a, 3);.
- Private members should be prefixed with "_". Example:

        var myObj = {
          _private: 42,
          _privFunction: function myObj__privF(aArg) {
            return aArg + 2;
          },
          pubFunction: function myObj_pubF(aArg) {
            return this._privFunction(aArg) * this._private;
          }
        }

- Getters and setters should use the get/set syntax. Example:

        var myObj = {
          _myProp: 0,
          get myProp() {
            return this._myProp;
          },
          set myProp(val) {
            return this._myProp = val;
          }
        }

### === and !== Operators.

Using `===` and `!==` should be the default. If you need to use `==`
and `!=` you should add the following comment for jshint in your file:
`/*jshint eqeqeq:false*/`

