# Digium Respoke Example Apps

These are a suite of example applications to show how to work with the
[Respoke](https://docs.respoke.io/) API just using jQuery.


### Getting Started

The fastest way to try out the web-examples is to [view them live][examples]!

[examples]: https://respoke.github.com/web-examples "view examples"

Alternatively you can run the already built files from the web server of your
choice as they are static HTML files. Point your web server to the `app`
directory or copy the files there to an already publicly accessible location.

See the Development section for details on how to use Node.js to run the
examples.

### Group Messaging

For more details on how to setup and use the group messaging example please see
the [README](app/modules/group-messaging/README.md) in that module.

### Development

You will need to install [Node.js](http://nodejs.org),
[npm](https://www.npmjs.org), and [Bower](http://bower.io) to build the
JavaScript and CSS. After installing npm and Bower, install the dependencies.

```bash
npm install; bower install;
```

To build the JavaScript, CSS, and HTML:

```bash
grunt build
```

To run the built-in Node.js server with file watching and a test runner:

```bash
grunt server
```

Once the server starts, you can see all of the apps by visiting
`http://localhost:9876`.

If you have push access to the respoke/web-examples repo you can update the
[live examples][examples] with:

```bash
grunt publish
```

### Testing

The tests are written using [mocha](http://mochajs.org). After going through the
setup in the Development section, just run the grunt test task. This will build
the necessary files and run the [jshint](http://jshint.com/docs/) linter and mocha.

```bash
grunt test
```

### License

The code in this package uses the ISC license.

> Copyright (c) 2014, Digium, Inc.
>
> Permission to use, copy, modify, and/or distribute this software for any
> purpose with or without fee is hereby granted, provided that the above
> copyright notice and this permission notice appear in all copies.
>
> THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
> REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
> AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
> INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
> LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
> OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
> PERFORMANCE OF THIS SOFTWARE.
