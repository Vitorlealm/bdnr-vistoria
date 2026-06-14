'use strict';

/**
 * Erro de aplicação com status HTTP associado.
 * Permite lançar erros de domínio (400, 404, ...) e tratá-los de forma
 * centralizada no middleware de erro.
 */
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }

  static badRequest(msg) {
    return new ApiError(400, msg);
  }

  static notFound(msg) {
    return new ApiError(404, msg);
  }
}

module.exports = ApiError;
