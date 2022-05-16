import { CryptoError } from '../errors';
import {
  CRYPTO_OBJECTS,
  CRYPTO_PRO_CRYPTO_PROVIDER_TYPES,
  DEFAULT_CRYPTO_PROVIDER,
  VIP_NET_CRYPTO_PROVIDER_TYPES,
} from '../constants';
import { outputDebug } from '../utils/outputDebug';
import { IAbout } from '../types';
import { SystemInfo } from '../types/SystemInfo';

import { afterPluginLoaded } from './internal/afterPluginLoaded';
import { createObject } from './createObject';
import { getCryptoProviders } from './getCryptoProviders';

/**
 * Кэш информации о системе.
 */
let systemInfoCache: SystemInfo | null = null;

/**
 * Предоставляет информацию о системе.
 *
 * @returns информацию о CSP и плагине.
 */
export const getSystemInfo = (): Promise<SystemInfo> => {
  return afterPluginLoaded(async () => {
    if (systemInfoCache) {
      return systemInfoCache;
    }

    const sysInfo: SystemInfo = {
      cadesVersion: '',
      cspVersion: null,
      cryptoProInstalled: false,
      vipNetInstalled: false,
      cryptoProviderName: null,
    };

    const cadesAbout: IAbout = await createObject(CRYPTO_OBJECTS.about);

    for (const cryptoProvider of await getCryptoProviders()) {
      if (VIP_NET_CRYPTO_PROVIDER_TYPES.includes(cryptoProvider.ProviderType)) {
        sysInfo.vipNetInstalled = true;
        sysInfo.cryptoProviderName =
          DEFAULT_CRYPTO_PROVIDER.Fallback.ProviderName;
        sysInfo.cspVersion =
          cryptoProvider.MajorVersion + '.' + cryptoProvider.MinorVersion;
      }
      if (
        CRYPTO_PRO_CRYPTO_PROVIDER_TYPES.includes(cryptoProvider.ProviderType)
      ) {
        sysInfo.cryptoProInstalled = true;
        sysInfo.cryptoProviderName =
          DEFAULT_CRYPTO_PROVIDER.Default.ProviderName;
        sysInfo.cspVersion =
          cryptoProvider.MajorVersion +
          '.' +
          cryptoProvider.MinorVersion +
          '.' +
          cryptoProvider.BuildVersion;
      }
    }

    try {
      const pluginVersion = await cadesAbout.PluginVersion;

      if (pluginVersion) {
        sysInfo.cadesVersion = await pluginVersion.toString();
      }
      if (!sysInfo.cadesVersion) {
        sysInfo.cadesVersion = await cadesAbout.Version;
      }
    } catch (error) {
      throw CryptoError.createCadesError(
        error,
        'Ошибка при получении информации о системе'
      );
    }

    outputDebug(sysInfo.toString());

    return (systemInfoCache = sysInfo);
  })();
};