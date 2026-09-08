const fs = require('node:fs');
const { imageSize: parseImage } = require('image-size-safe');

function imageSize(input) {
  return parseImage(typeof input === 'string' ? fs.readFileSync(input) : input);
}

module.exports = imageSize;
module.exports.default = imageSize;
module.exports.imageSize = imageSize;