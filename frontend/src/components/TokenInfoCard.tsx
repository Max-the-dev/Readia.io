import { useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TokenInfoCardProps {
  contractAddress: string;
}

function TokenInfoCard({ contractAddress }: TokenInfoCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(contractAddress).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    }
  };

  return (
    <div className="token-info-card">
      <div className="token-info-left">
        <span className="token-label">$READ Governance Token</span>
        <div className="token-address-wrapper">
          <span className="token-ca-label"></span>
          <code className="token-address">
            {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
          </code>
          <button
            onClick={handleCopy}
            className="token-copy-btn"
            aria-label="Copy contract address"
          >
            <Copy size={16} />
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>
      <div className="token-info-right">
        <Link to="/read-token" className="token-cta-button">
          <ExternalLink size={18} />
          Buy & Learn More
        </Link>
      </div>
    </div>
  );
}

export default TokenInfoCard;
