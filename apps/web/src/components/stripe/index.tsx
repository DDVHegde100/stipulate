import { StripeCta } from './Cta';
import { StripeDeveloper } from './Developer';
import { FurEnhancer } from './FurEnhancer';
import { StripeFooter } from './StripeFooter';
import { StripeHero } from './Hero';
import { StripeNav } from './StripeNav';
import { PlatformDeepDive } from './PlatformDeepDive';
import { StripeProducts } from './Products';
import { StripeSolutions } from './Solutions';
import { StripeStats } from './Stats';
import { StripeStories } from './Stories';

export function StripeHome() {
  return (
    <div className="stripe">
      <FurEnhancer />
      <StripeNav />
      <main>
        <StripeHero />
        <StripeStats />
        <PlatformDeepDive />
        <StripeProducts />
        <StripeStories />
        <StripeSolutions />
        <StripeDeveloper />
        <StripeCta />
      </main>
      <StripeFooter />
    </div>
  );
}
