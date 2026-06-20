import { CreditCardMini } from './Visuals';

export function RouteDashboardMockup() {
  return (
    <div className="mockup">
      <div className="ui-bar">
        <span className="ui-dot ui-dot--r" />
        <span className="ui-dot ui-dot--y" />
        <span className="ui-dot ui-dot--g" />
        <span className="ml-2 font-mono text-[11px] text-[#8898aa]">stipulate.io/console</span>
      </div>

      <div className="grid md:grid-cols-[200px_1fr]">
        <aside className="hidden border-r border-[#e6ebf1] bg-[#fafbfc] p-4 md:block">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8898aa]">Wallet</p>
          <ul className="mt-3 space-y-1.5">
            {['Amex Gold', 'Sapphire Reserve', 'Custom Cash'].map((c, i) => (
              <li
                key={c}
                className={`rounded-md px-2 py-1.5 text-[11px] ${i === 0 ? 'fur-chip px-2.5 py-1.5 text-[10px] shadow-sm' : 'text-[#425466]'}`}
              >
                {c}
              </li>
            ))}
          </ul>
        </aside>

        <div className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8898aa]">Route result</p>
              <p className="mt-1 text-sm font-medium text-[#0a2540]">Nobu · $87.42 · MCC 5812</p>
            </div>
            <span className="fur-chip px-2.5 py-1 text-[10px]">14ms</span>
          </div>

          <div className="space-y-2">
            {[
              { rank: 1, name: 'Amex Gold', ret: '+4.2%', note: '4× MR dining · $120 credit left', win: true },
              { rank: 2, name: 'Sapphire Reserve', ret: '+3.0%', note: '3× via Chase Travel', win: false },
              { rank: 3, name: 'Custom Cash', ret: '+1.5%', note: '5% top category is gas', win: false },
            ].map((r) => (
              <div
                key={r.name}
                className={`rounded-lg border px-3 py-2.5 ${r.win ? 'win-row' : 'border-[#e6ebf1] bg-white'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${r.win ? 'win-badge fur-chip !h-5 !w-5 !rounded !p-0' : 'bg-[#e6ebf1] text-[#425466]'}`}
                    >
                      {r.rank}
                    </span>
                    <span className="text-xs font-semibold text-[#0a2540]">{r.name}</span>
                  </div>
                  <span className={`text-xs font-bold ${r.win ? 'text-accent' : 'text-[#425466]'}`}>{r.ret}</span>
                </div>
                <p className="mt-1 pl-7 text-[10px] text-[#8898aa]">{r.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BillingMeterMockup() {
  return (
    <div className="relative p-5">
      <div className="mockup-cards-float mb-4">
        <CreditCardMini issuer="Amex" name="Gold Card" last4="1004" variant="gold" />
        <CreditCardMini issuer="Chase" name="Sapphire Reserve" last4="4821" variant="navy" />
      </div>
      <div className="rounded-lg border border-[#e6ebf1] bg-white p-4">
        <div className="flex justify-between text-xs">
          <span className="font-medium text-[#0a2540]">API usage</span>
          <span className="text-[#8898aa]">March 2026</span>
        </div>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-[#0a2540]">
          12,847 <span className="text-sm font-normal text-[#8898aa]">calls</span>
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e6ebf1]">
          <div className="fur-bar h-full w-[68%]" />
        </div>
        <p className="mt-2 text-[11px] text-[#8898aa]">$12.85 at $0.001 / call</p>
      </div>
    </div>
  );
}

export function ParserMockup() {
  return (
    <div className="relative p-5">
      <CreditCardMini issuer="Stipulate" name="Benefit rule" last4="0294" variant="forest" />
      <div className="mt-4 rounded-lg border border-[#e6ebf1] bg-white p-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8898aa]">Parsed benefit</p>
        <p className="mt-1.5 text-sm font-medium text-[#0a2540]">4× points at restaurants worldwide</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="fur-chip px-2 py-0.5 text-[10px]">confidence 0.94</span>
          <span className="rounded border border-[#e6ebf1] bg-[#f6f9fc] px-2 py-0.5 text-[10px] text-[#425466]">
            v2.3.1
          </span>
        </div>
      </div>
      <p className="mt-2 px-1 text-[11px] text-[#8898aa]">$120 dining credit · resets annually</p>
    </div>
  );
}

export function EnrichMockup() {
  return (
    <div className="p-5">
      <div className="mockup-cards-float !pb-0">
        <CreditCardMini issuer="Citi" name="Custom Cash" last4="7293" variant="forest" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between rounded-lg bg-[#f6f9fc] px-3 py-2">
          <span className="text-xs text-[#425466]">Whole Foods Market</span>
          <span className="fur-chip px-2 py-0.5 text-[10px]">MCC 5411</span>
        </div>
        <div className="rounded-lg border border-[rgba(27,67,50,0.2)] bg-white px-3 py-2.5">
          <p className="text-[10px] text-[#8898aa]">Issuer override · Chase</p>
          <p className="text-xs font-medium text-[#0a2540]">→ Grocery stores</p>
        </div>
      </div>
    </div>
  );
}
