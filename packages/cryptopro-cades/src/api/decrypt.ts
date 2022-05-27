import { Buffer } from 'buffer';

import { CryptoError } from '../errors';
import { CADESCOM_BASE64_TO_BINARY, CRYPTO_OBJECTS } from '../constants';
import { CPEnvelopedData } from '../types';
import { outputDebug } from '../utils';

import { createObject } from './createObject';
import { afterPluginLoaded } from './internal/afterPluginLoaded';
import { setCryptoProperty } from './internal/setCryptoProperty';

/**
 * Расшифровать данные.
 * @param {string} encryptedData -входные данные для расшифровки в формате Base64 или ArrayBuffer.
 * @throws {CryptoError} в случае ошибки.
 * @returns {Promise<string>} .Расшифрованная строка в кодировке Base64.
 */
export function decrypt(encryptedData: ArrayBuffer | string): Promise<string> {
  return afterPluginLoaded(async () => {
    const logData = [];
    logData.push({ encryptedData });

    try {
      if (!encryptedData) {
        const errorMessage = 'Не указаны данные для расшифровки.';
        throw CryptoError.create('CBP-7', errorMessage, null, errorMessage);
      }

      const base64String =
        encryptedData instanceof ArrayBuffer
          ? Buffer.from(encryptedData).toString('base64')
          : encryptedData;

      logData.push({ base64String });

      const envelopedData: CPEnvelopedData = await createObject(
        CRYPTO_OBJECTS.envelopedData
      );
      try {
        // в криптопро браузер плагине не поддерживается подпись/расшифровка бинарных данных,
        // поэтому подписываем предварительно конвертированный в Base64
        setCryptoProperty(
          envelopedData,
          'ContentEncoding',
          CADESCOM_BASE64_TO_BINARY
        );
      } catch (err) {
        throw CryptoError.createCadesError(
          err,
          'Ошибка при заполнении параметров расшифровки.'
        );
      }

      try {
        // в криптопро браузер плагине не поддерживается подпись/расшифровка бинарных данных,
        // поэтому расшифровываем предварительно конвертированный в Base64
        const decryptResult = envelopedData.Decrypt(base64String);
        if (decryptResult instanceof Promise) {
          await decryptResult;
        }

        const decryptedData =
          envelopedData.Content instanceof Promise
            ? await envelopedData.Content
            : envelopedData.Content;

        logData.push({ decryptedData });

        return decryptedData;
      } catch (err) {
        throw CryptoError.createCadesError(
          err,
          'Ошибка при расшифровке данных.'
        );
      }
    } catch (error) {
      logData.push({ error });
      throw error;
    } finally {
      outputDebug('decrypt >>', logData);
    }
  })();
}
