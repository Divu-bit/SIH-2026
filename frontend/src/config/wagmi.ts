import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';
import { http } from 'wagmi';

export const config = getDefaultConfig({
  appName: 'TrustChain',
  projectId: 'c4f79cc821944d9680842e34466bfb10',
  chains: [sepolia],
  transports: {
    [sepolia.id]: http('https://gateway.tenderly.co/public/sepolia'),
  },
  ssr: false,
});
