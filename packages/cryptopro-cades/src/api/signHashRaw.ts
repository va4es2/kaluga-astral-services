import { Buffer } from 'buffer';

import { CryptoError } from '../errors';
import {
  CADESCOM_HASH_ALGORITHM,
  CRYPTO_OBJECTS,
  GOST_KEY_ALGORITHM_TYPES,
} from '../constants';
import type { CPHashedData, ICertificate, RawSignature } from '../types';
import { Certificate } from '../Certificate';
import { outputDebug } from '../utils';

import { afterPluginLoaded } from './internal/afterPluginLoaded';
import { createObject } from './createObject';
import { setCryptoProperty } from './internal/setCryptoProperty';
import { validateCertificate } from './validateCertificate';
import { unwrap } from './internal/unwrap';

/**
 * Выбрать алгоритм хэширования на основе алгоритма сертификата.
 * @param cert сертификат.
 * @throws {CryptoError} в случае неизвестного алгоритма сертификата.
 * @returns алгоритм хэширования.
 */
function selectAlgoritm(cert: Certificate): CADESCOM_HASH_ALGORITHM {
  switch (cert.algorithm) {
    case GOST_KEY_ALGORITHM_TYPES.GOST_R3410_12_256:
      return CADESCOM_HASH_ALGORITHM.CADESCOM_HASH_ALGORITHM_CP_GOST_3411_2012_256;
    case GOST_KEY_ALGORITHM_TYPES.GOST_R3410_12_512:
      return CADESCOM_HASH_ALGORITHM.CADESCOM_HASH_ALGORITHM_CP_GOST_3411_2012_512;

    default:
      const errorMessage = 'Неизвестный алгоритм ключа электронной подписи';

      throw CryptoError.create('CBP-7', errorMessage, null, errorMessage);
  }
}

/**
 * Подписать хэш указанным сертификатом в "сыром" формате.
 * @param {ICertificate | Certificate} certificate -сертификат пользователя.
 * @param {ArrayBuffer | string} data - данные для подписания. Массив байт хэша либо сам хэш в формате hex строки (в любом регистре)
 * @example
 *  4A5F6E54CA44064A5544943DDC244DDC84DC3952AC5924A475838E7BB8320878
 * @param {boolean} [doNotValidate=false] - не проводить валидацию сертификатов.
 * @throws {CryptoError} в случае ошибки.
 * @returns "сырая" подпись в формате hex строки.
 */
export function signHashRaw(
  certificate: ICertificate | Certificate,
  data: ArrayBuffer | string,
  doNotValidate: boolean = false,
): Promise<string> {
  return afterPluginLoaded(async () => {
    const logData = [];

    logData.push({
      certificate,
      data,
      doNotValidate,
    });

    try {
      if (!data) {
        const errorMessage = 'Не указаны хэш для подписания.';

        throw CryptoError.create('CBP-7', errorMessage, null, errorMessage);
      }

      if (!certificate) {
        const errorMessage =
          'Не указан сертификат для вычисления электронной подписи.';

        throw CryptoError.create('CBP-7', errorMessage, null, errorMessage);
      }

      const hexString =
        data instanceof ArrayBuffer ? Buffer.from(data).toString('hex') : data;

      logData.push({ hexString });

      let cadesCert: ICertificate | null = null;
      let cert: Certificate | null = null;

      if (certificate instanceof Certificate) {
        cadesCert = certificate?.certificateBin;
        cert = certificate;
      } else {
        cadesCert = certificate;
        cert = await Certificate.CreateFrom(cadesCert);
      }

      if (!doNotValidate && !!cadesCert) {
        const errorMessage = await validateCertificate(cadesCert);

        if (errorMessage) {
          throw CryptoError.create(
            'CBP-6',
            'Сертификат не прошел проверку при подписи.',
            null,
            errorMessage,
          );
        }
      }

      const hashedData: CPHashedData = await createObject(
        CRYPTO_OBJECTS.hashedData,
      );
      const rawSignature: RawSignature = await createObject(
        CRYPTO_OBJECTS.rawSignature,
      );

      // заполнение параметров для подписи
      try {
        await setCryptoProperty(hashedData, 'Algorithm', selectAlgoritm(cert));
        await unwrap(hashedData.SetHashValue(hexString));
      } catch (error) {
        throw CryptoError.createCadesError(
          error,
          'Ошибка при заполнении параметров подписания.',
        );
      }

      try {
        const signResult = await unwrap(
          rawSignature.SignHash(hashedData, cadesCert as ICertificate),
        );

        logData.push({ signResult });

        return signResult;
      } catch (error) {
        throw CryptoError.createCadesError(
          error,
          'Ошибка при вычислении электронной подписи.',
        );
      }
    } catch (error) {
      logData.push({ error });
      throw error;
    } finally {
      outputDebug('signHashRaw >>', logData);
    }
  })();
}
