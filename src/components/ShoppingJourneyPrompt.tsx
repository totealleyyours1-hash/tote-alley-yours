import { Link } from 'react-router-dom';
import { ArrowRight, Palette, Sparkles } from 'lucide-react';

export function ShoppingJourneyPrompt({ compact = false }: { compact?: boolean }) {
  return (
    <section className={compact ? 'py-10' : 'py-16 md:py-24'}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-12">
          <p className="text-xs font-medium tracking-[0.18em] uppercase text-[#B55470] mb-3">
            Choose Your Experience
          </p>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold text-[#2A211F] text-balance">
            How Would You Like Your Tote Bag?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#6D5D58]">
            Two distinct ways to carry Tote&apos;Alley Yours — design every detail yourself or pick an original studio piece.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          {/* Option A */}
          <div className="group flex flex-col justify-between rounded-2xl bg-[#FDF2F4] border border-[#F1D8DF] p-7 sm:p-9 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div>
              <div className="flex items-center justify-between gap-4 mb-5">
                <span className="text-xs font-medium tracking-[0.14em] uppercase text-[#B55470]">
                  Option A · Custom Studio
                </span>
                <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#D66886] border border-[#F1D8DF]">
                  <Palette className="w-5 h-5" />
                </span>
              </div>
              <h3 className="font-display text-2xl sm:text-3xl font-semibold text-[#2A211F] mb-3">
                I Already Have a Design in Mind
              </h3>
              <p className="text-[#5C4D49] text-sm sm:text-base leading-relaxed mb-6">
                Create a tote bag that represents your personality. Choose your bag colour, add stickers and customise it your way.
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#7D6661] mb-8">
                <span>4 Canvas Colours</span>
                <span aria-hidden="true">·</span>
                <span>Up to 6 Free Stickers</span>
                <span aria-hidden="true">·</span>
                <span>40+ Fonts</span>
              </div>
            </div>

            <Link
              to="/customise"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D66886] text-white px-6 py-3.5 text-sm font-semibold tracking-wide transition-colors hover:bg-[#C05270] whitespace-nowrap"
            >
              <span>Customise My Tote</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Option B */}
          <div className="group flex flex-col justify-between rounded-2xl bg-[#F3ECE4] border border-[#E5D9CC] p-7 sm:p-9 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div>
              <div className="flex items-center justify-between gap-4 mb-5">
                <span className="text-xs font-medium tracking-[0.14em] uppercase text-[#7B5F52]">
                  Option B · Ready-Made Collection
                </span>
                <span className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#7B5F52] border border-[#E5D9CC]">
                  <Sparkles className="w-5 h-5" />
                </span>
              </div>
              <h3 className="font-display text-2xl sm:text-3xl font-semibold text-[#2A211F] mb-3">
                I Want a Tote Designed by You
              </h3>
              <p className="text-[#5C4D49] text-sm sm:text-base leading-relaxed mb-6">
                Explore our collection of original tote bag designs, created with love by our team.
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#7D6661] mb-8">
                <span>Original Illustrations</span>
                <span aria-hidden="true">·</span>
                <span>Heavyweight Cotton</span>
                <span aria-hidden="true">·</span>
                <span>Ready to Order</span>
              </div>
            </div>

            <Link
              to="/collection"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2A211F] text-white px-6 py-3.5 text-sm font-semibold tracking-wide transition-colors hover:bg-[#433532] whitespace-nowrap"
            >
              <span>Explore Collection</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
