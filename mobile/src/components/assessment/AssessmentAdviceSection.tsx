// Scan-scoped composition for the AI analysis. The parent remounts this
// component for every new photo, so the conversation starts clean without any
// cross-scan state repair.
import { useState } from 'react'
import AssessmentAdvicePanel from './AssessmentAdvicePanel'
import AssessmentAdviceSheet from './AssessmentAdviceSheet'
import useAssessmentAdvice from '../../hooks/useAssessmentAdvice'
import type { AssessmentData } from '../../types/api'

interface AssessmentAdviceSectionProps {
  assessment: AssessmentData
  userId: string | null | undefined
}

function AssessmentAdviceSection({
  assessment,
  userId,
}: AssessmentAdviceSectionProps) {
  const advice = useAssessmentAdvice(assessment, userId)
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <AssessmentAdvicePanel
        opening={advice.opening}
        status={advice.status}
        errorMessage={advice.errorMessage}
        language={advice.language}
        hasFollowUps={advice.hasFollowUps}
        onLanguageChange={advice.setLanguage}
        onOpen={() => setIsOpen(true)}
        onRetry={advice.retry}
      />
      <AssessmentAdviceSheet
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        assessment={assessment}
        advice={advice}
      />
    </>
  )
}

export default AssessmentAdviceSection
