var app = require('./server/server').app;

app.start(process.env.PORT || 5000);
