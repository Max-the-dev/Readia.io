import { WalletMinimal } from 'lucide-react';
import { useShillWallet } from '../contexts/ShillWalletContext';

function ShillConnectButton() {
  const { address, isConnected, connect } = useShillWallet();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnected && address) {
    return (
      <button
        className="wallet-connect-button"
        type="button"
        onClick={connect}
      >
        <span className="wallet-address">{formatAddress(address)}</span>
      </button>
    );
  }

  return (
    <button
      className="wallet-connect-button wallet-connect-button--disconnected"
      type="button"
      onClick={connect}
    >
      <WalletMinimal
        aria-hidden="true"
        className="wallet-connect-button--disconnected__icon"
        strokeWidth={2.4}
        size={18}
      />
      <span className="wallet-connect-button__text wallet-connect-button--disconnected__label">
        Connect Wallet
      </span>
    </button>
  );
}

export default ShillConnectButton;
