import { IAnyError, ICryptoError } from '../types/ICryptoError';

/**
 * Возвращает строку с описанием ошибки из исключения, порождённого плагином.
 * Для Firefox данный метод является единственным способом получения кода ошибки и её текстового описания от плагина.
 * @param {Error} error - ошибка, по которой нужно получить информацию.
 * @returns {Function} .
 */
export function getLastError(
  error: ICryptoError | Error | IAnyError
): Error | undefined {
  return window.cadesplugin?.getLastError(error);
}
