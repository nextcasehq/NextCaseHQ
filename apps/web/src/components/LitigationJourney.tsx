import React from 'react';
import { classifyJourneyPosition } from '@/lib/domain/litigation-journey';

interface LitigationJourneyProps {
  engagementType: string;
  matterCategory: string | null;
  currentStage: string | null;
}

/**
 * The Matter Workspace centerpiece: a visual ✓/●/○ progression through the
 * matter's procedural stages, derived from the same Matter.current_stage
 * text already kept in sync by Court Note saves — no separate data entry.
 * An unrecognised stage never gets a fabricated position: the real
 * free-text stage is still shown, just without a highlighted step.
 */
export default function LitigationJourney({ engagementType, matterCategory, currentStage }: LitigationJourneyProps) {
  const { stages, currentIndex } = classifyJourneyPosition(engagementType, matterCategory, currentStage);
  const preparationPercent =
    currentIndex !== null && stages.length > 1 ? Math.round((currentIndex / (stages.length - 1)) * 100) : null;

  return (
    <div id="journey" className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm scroll-mt-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#726B58]">Litigation Journey</h2>
        {preparationPercent !== null && (
          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FBF6EA] text-[#8A6D2F] border border-[#E7DFC9]">
            {preparationPercent}% Complete
          </span>
        )}
      </div>

      {currentIndex === null && currentStage && (
        <p className="text-xs text-[#6F5624] mb-4">
          Current stage: <span className="font-bold">{currentStage}</span> — not yet recognized as one of the
          standard stages below, so no step is highlighted.
        </p>
      )}
      {!currentStage && (
        <p className="text-xs text-[#6F5624] mb-4">No stage recorded yet — record the first hearing to begin the journey.</p>
      )}

      <ol className="flex flex-col gap-0">
        {stages.map((stage, index) => {
          const isDone = currentIndex !== null && index < currentIndex;
          const isCurrent = currentIndex !== null && index === currentIndex;
          const isFuture = currentIndex === null || index > currentIndex;
          return (
            <li key={stage} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <span
                  aria-hidden="true"
                  className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 ${
                    isDone
                      ? 'bg-[#8A6D2F] text-white'
                      : isCurrent
                        ? 'bg-white border-2 border-[#8A6D2F] text-[#8A6D2F]'
                        : 'bg-[#F4EEE0] text-[#B0A588]'
                  }`}
                >
                  {isDone ? '✓' : isCurrent ? '●' : '○'}
                </span>
                {index < stages.length - 1 && (
                  <span className={`w-px flex-1 min-h-[18px] ${isDone ? 'bg-[#8A6D2F]' : 'bg-[#F4EEE0]'}`} aria-hidden="true" />
                )}
              </div>
              <p
                className={`text-xs pb-4 pt-0.5 ${
                  isCurrent
                    ? 'font-bold text-[#4A4130]'
                    : isDone
                      ? 'font-semibold text-[#6F5624]'
                      : 'font-medium text-[#B0A588]'
                }`}
              >
                {stage}
                {isCurrent && currentStage && <span className="block text-[10px] font-normal text-[#8A6D2F] mt-0.5">{currentStage}</span>}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
