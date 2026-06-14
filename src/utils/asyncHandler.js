'use strict';

/**
 * Envolve um handler async para que qualquer rejeição de Promise seja
 * encaminhada ao middleware de erro do Express via next(err).
 */
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
