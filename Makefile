install:
	@npm install
	@bower install

test:
	@./node_modules/mocha/bin/mocha --reporter spec

runserver:
	@env PORT=5000 node app.js

.PHONY: test install runserver
