var app = require('./server/server').app;
require('./server/presence');

app.start(process.env.PORT || 5000);
