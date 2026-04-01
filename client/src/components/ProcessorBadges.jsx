export function ProcessorBadges({ value }) {
  if (!value) return <span className="text-gray-400 text-xs italic">None</span>;

  const processors = value.split(';').map(p => p.trim()).filter(Boolean);
  const isBraintreeBundled = processors.includes('Braintree') && processors.length > 1;
  const hasBraintreeOnly = processors.length === 1 && processors[0] === 'Braintree';

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {processors.map(p => (
        <span
          key={p}
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium
            ${p === 'Braintree'
              ? 'bg-gray-100 text-gray-500 border border-gray-200'
              : 'bg-blue-50 text-blue-700 border border-blue-100'
            }`}
        >
          {p}
          {p === 'Braintree' && isBraintreeBundled && (
            <span className="ml-1 text-gray-400 font-normal text-xs" title="Bundled with Magento">⊕</span>
          )}
        </span>
      ))}
      {hasBraintreeOnly && (
        <span className="text-xs text-gray-400 italic" title="Braintree is bundled with Magento by default">bundled</span>
      )}
    </div>
  );
}

export default ProcessorBadges;
