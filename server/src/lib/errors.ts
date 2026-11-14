export class HttpError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, string[]>;

  constructor(statusCode: number, code: string, message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(message: string, details?: Record<string, string[]>): HttpError {
  return new HttpError(400, 'BAD_REQUEST', message, details);
}

export function unauthorized(message = 'Oturum açman gerekiyor.'): HttpError {
  return new HttpError(401, 'UNAUTHORIZED', message);
}

export function forbidden(message = 'Bu işlem için yetkin yok.'): HttpError {
  return new HttpError(403, 'FORBIDDEN', message);
}

export function notFound(message = 'Kayıt bulunamadı.'): HttpError {
  return new HttpError(404, 'NOT_FOUND', message);
}

export function conflict(message: string): HttpError {
  return new HttpError(409, 'CONFLICT', message);
}

export function paymentRequired(message = 'Bu özellik için aktif bir paket gerekiyor.'): HttpError {
  return new HttpError(402, 'PAYMENT_REQUIRED', message);
}

export function tooManyRequests(message = 'Çok fazla istek gönderdin. Lütfen biraz bekle.'): HttpError {
  return new HttpError(429, 'RATE_LIMITED', message);
}
