'use strict';

var request = require('request')
  , utils = require('./utils');

/**
 * Constructs API client.
 *
 * Usage:
 *
 * ```js
 * var Client = require('prostore.api-client');
 *
 * var client = new Client({
 *   userId: '54b4c1d3bab9e22843c99ea4',
 *   url: 'https://example.store',
 *   privateToken: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
 * });
 * ```
 *
 * @module prostore.api-client
 * @param {object} options - options
 * @param {string} options.url - store URL including schema
 * @param {string} options.userId - ProStore user id (12-byte BSON ObjectId, hex-encoded)
 * @param {string} options.privateToken - secret token for authentication
 *   (must be obtained via API login)
 * @class ApiClient
 */
var ApiClient = module.exports = exports = function(options) {
  if (!(this instanceof ApiClient))
    return new ApiClient(options);
  this.url = options.url.replace(/\/+$/, '');
  this.userId = options.userId;
  this.privateToken = options.privateToken;
};

/**
 * Returns base URL for API endpoints.
 *
 * Example:
 *
 * ```
 * https://example.store/api
 * ```
 *
 * @returns {string} base URL for API endpoints.
 * @memberOf ApiClient
 */
Object.defineProperty(ApiClient.prototype, 'baseUrl', {
  get: function() {
    return this.url + '/api';
  }
});

/**
 * Computes and returns ProStore authentication headers.
 *
 * Example:
 *
 * ```js
 * {
 *   'ProStore-Auth-UserId': '54b4c1d3bab9e22843c99ea4',
 *   'ProStore-Auth-Nonce': '12345678912345678912345678912345',
 *   'ProStore-Auth-Token': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
 * }
 * ```
 *
 * @returns {object}
 * @memberOf ApiClient
 */
Object.defineProperty(ApiClient.prototype, 'headers', {
  get: function() {
    var nonce = utils.randomString(32)
      , token = utils.sha256(nonce + ':' + this.privateToken);
    return {
      'ProStore-Auth-UserId': this.userId,
      'ProStore-Auth-Nonce': nonce,
      'ProStore-Auth-Token': token
    };
  }
});

/**
 * Constructs endpoint URL.
 *
 * @param {string} endpoint - API endpoint (e.g. `admin/products`)
 * @returns {string} URL (e.g. `https://example.store/api/admin/products`)
 * @memberOf ApiClient
 */
ApiClient.prototype.url = function(endpoint) {
  return this.baseUrl + '/' + endpoint.replace(/^\//, '');
};

/**
 * Returns new [request](https://github.com/request/request) object
 * with specified `method`, `endpoint` (converted to URL) and auth headers
 * as defaults.
 *
 * You use it then to instantiate a request (see below).
 *
 * Example file upload:
 *
 * ```js
 * var request = client.request('post', 'admin/storage/index.html')
 * var r = request({ json: false }, function(err, resp, body) {
 *   // handle server response as you see fit
 * });
 * var form = r.form();
 * form.append('file', fs.createReadStream('path/to/file'));
 * ```
 *
 * This is a low-level object, which is particularly useful for uploading files.
 * For simpler cases (e.g. sending-receiving JSON requests) use `get`, `post`,
 * `put` and `delete` methods.
 *
 * @param {string} method - HTTP method
 * @param {string} endpoint - API endpoint
 * @returns {object} request object
 * @see {@link https://github.com/request/request}
 * @memberOf ApiClient
 */
ApiClient.prototype.request = function(method, endpoint) {
  return request.defaults({
    method: method ? method.toLowerCase() : undefined,
    url: endpoint ? this.url(endpoint) : undefined,
    headers: this.headers,
    json: true
  });
};

/**
 * Performs a request to specified API endpoint.
 *
 * Usage:
 *
 * ```js
 * client.get('echo', function(err, data) { });
 *
 * client.post('echo', {
 *   data: 'Hello!'
 * }, function(err, data) { });
 * ```
 *
 * @param {string} endpoint - API endpoint
 * @param {object} options - options for `request`
 * @param {function} cb - callback `function(err, data)`
 * @see {@link https://github.com/request/request}
 * @memberOf ApiClient
 * @function get|post|put|delete
 */
['get', 'post', 'put', 'delete'].forEach(function(method) {
  ApiClient.prototype[method] = function(endpoint, options, cb) {
    if (typeof options == 'function') {
      cb = options;
      options = {};
    }
    var r = this.request(method, endpoint);
    r(options, function(err, res, data) {
      /* istanbul ignore if */
      if (err) return cb(err);
      if (res.statusCode >= 400)
        return cb(new Error('Server returned ' + res.statusCode));
      cb(null, data);
    })
  };
});