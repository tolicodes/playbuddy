class WS {
  constructor(url, protocols, options) {
    return new WebSocket(url, protocols, options);
  }
}

module.exports = WS;
module.exports.default = WS;
