require('module-alias/register');
require('module-alias').addPath('.');
require('dotenv').config();

const express = require('express');
const path = require('path');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');

// Keep requestCorrelationId middleware as the first middleware. Otherwise we risk losing logs.
const requestCorrelationMiddleware = require('middlewares/requestCorrelationId.js'); // eslint-disable-line id-length
const camelCaseReqMiddleware = require('middlewares/camelCaseRequest.js').camelCaseRequest;
const errorHandleMiddleware = require('middlewares/errorHandling.js');

const logger = require('utils/logger.js');

const bitcoind = require('routes/v1/bitcoind/info.js');
const charts = require('routes/v1/bitcoind/charts.js');
const system = require('routes/v1/bitcoind/system.js');
const widgets = require('routes/v1/bitcoind/widgets.js');
const ping = require('routes/ping.js');
const app = express();

// Handles CORS
app.use(cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(requestCorrelationMiddleware);
app.use(camelCaseReqMiddleware);
app.use(morgan(logger.morganConfiguration));

app.use('/', express.static('./ui/dist'));

app.use('/v1/bitcoind/info', bitcoind);
app.use('/v1/bitcoind/info', charts);
app.use('/v1/bitcoind/system', system);
app.use('/v1/bitcoind/widgets', widgets);
app.use('/ping', ping);

app.use(errorHandleMiddleware);
app.use((req, res) => {
  res.status(404).json(); // eslint-disable-line no-magic-numbers
});

module.exports = app;
