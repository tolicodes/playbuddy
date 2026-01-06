function fetchShim(...args) {
  return fetch(...args);
}

module.exports = fetchShim;
module.exports.default = fetchShim;
