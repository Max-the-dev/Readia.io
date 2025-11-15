import { useEffect, useMemo, useState } from 'react';
import type { CaipNetwork } from '@reown/appkit/networks';
import { AssetUtil, ChainController } from '@reown/appkit-controllers';
import { NETWORK_FALLBACK_ICONS } from '../constants/networks';

export function useCaipNetworks(): CaipNetwork[] {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const unsubscribe = ChainController.subscribe(() => {
      setVersion(prev => prev + 1);
    });
    return () => {
      unsubscribe?.();
    };
  }, []);

  return useMemo(() => {
    const allNetworks = ChainController.getAllRequestedCaipNetworks();
    if (allNetworks?.length) {
      return allNetworks;
    }
    const fallback: CaipNetwork[] = [];
    ChainController.state.chains.forEach(adapter => {
      fallback.push(...(adapter?.caipNetworks || []));
    });
    return fallback;
  }, [version]);
}

export function useNetworkIconByCaipId(
  caipNetworkId?: string,
  fallback?: string
): string | null {
  const networks = useCaipNetworks();
  const targetNetwork = useMemo(
    () => networks.find(network => network.caipNetworkId === caipNetworkId),
    [networks, caipNetworkId]
  );
  return useNetworkIcon(targetNetwork, fallback ?? (caipNetworkId ? NETWORK_FALLBACK_ICONS[caipNetworkId] : undefined));
}

export function useNetworkIcon(
  network?: CaipNetwork,
  fallback?: string
): string | null {
  const [icon, setIcon] = useState<string | null>(fallback ?? null);

  useEffect(() => {
    let cancelled = false;
    async function resolveIcon(target?: CaipNetwork) {
      if (!target) {
        setIcon(fallback ?? null);
        return;
      }

      const cached =
        AssetUtil.getNetworkImage(target) ??
        target.assets?.imageUrl;

      if (cached) {
        setIcon(cached);
        return;
      }

      if (target.assets?.imageId) {
        const fetched = await AssetUtil.fetchNetworkImage(target.assets.imageId);
        if (!cancelled) {
          setIcon(fetched ?? fallback ?? null);
        }
        return;
      }

      setIcon(fallback ?? null);
    }

    resolveIcon(network);
    return () => {
      cancelled = true;
    };
  }, [network?.caipNetworkId, network?.assets?.imageUrl, network?.assets?.imageId, fallback]);

  return icon ?? fallback ?? null;
}
