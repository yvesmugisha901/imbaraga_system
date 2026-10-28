import { useTranslation } from 'react-i18next'
import type { RiskLevel } from '../../types'

/** Plain next-step wording per risk level. Edit these defaults (or the translations) to match your programme's procedure. */
export function useNextSteps(): Record<RiskLevel, string> {
  const { t } = useTranslation()
  return {
    High: t('insights.step.High', 'Confirm the household in person first.'),
    Medium: t('insights.step.Medium', 'Review with the local office and visit if capacity allows.'),
    Low: t('insights.step.Low', 'No action now. Check again at the next survey.'),
  }
}