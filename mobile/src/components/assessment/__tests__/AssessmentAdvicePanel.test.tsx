/// <reference types="jest" />
import type { ComponentProps } from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import AssessmentAdvicePanel from '../AssessmentAdvicePanel'

const OPENING = 'Mukhang may kaunting amag. Tuyuin muna bago iimbak.'

async function renderPanel(
  overrides: Partial<ComponentProps<typeof AssessmentAdvicePanel>> = {}
) {
  const props: ComponentProps<typeof AssessmentAdvicePanel> = {
    opening: OPENING,
    status: 'ready',
    errorMessage: null,
    language: 'english',
    hasFollowUps: false,
    onLanguageChange: jest.fn(),
    onOpen: jest.fn(),
    onRetry: jest.fn(),
    ...overrides,
  }
  return { view: await render(<AssessmentAdvicePanel {...props} />), props }
}

describe('AssessmentAdvicePanel', () => {
  it('shows the opening analysis and the disclaimer without a tap', async () => {
    const { view } = await renderPanel()

    expect(view.getByText(OPENING)).toBeTruthy()
    expect(
      view.getByText('AI guidance based on this scan. Not a laboratory result.')
    ).toBeTruthy()
    expect(view.getByText('Ask a follow-up')).toBeTruthy()
  })

  it('opens the conversation when the analysis box is tapped', async () => {
    const { view, props } = await renderPanel()

    await fireEvent.press(view.getByLabelText(`AI analysis. ${OPENING}`))

    expect(props.onOpen).toHaveBeenCalledTimes(1)
  })

  it('switches the opening language', async () => {
    const { view, props } = await renderPanel()

    await fireEvent.press(view.getByLabelText('Show the analysis in Tagalog'))

    expect(props.onLanguageChange).toHaveBeenCalledWith('tagalog')
  })

  it('hides the language toggle after a follow-up', async () => {
    const { view } = await renderPanel({ hasFollowUps: true })

    expect(view.queryByLabelText('Show the analysis in Tagalog')).toBeNull()
  })

  it('shows the loading state while the opening is generated', async () => {
    const { view } = await renderPanel({ opening: null, status: 'loading' })

    expect(view.getByText('Analyzing this result…')).toBeTruthy()
    expect(view.getByLabelText('The assistant is typing')).toBeTruthy()
  })

  it('shows a retry when the opening analysis fails', async () => {
    const { view, props } = await renderPanel({
      opening: null,
      status: 'error',
      errorMessage: 'The analysis is unavailable.',
    })

    expect(view.getByText('The analysis is unavailable.')).toBeTruthy()
    await fireEvent.press(view.getByText('Try again'))
    expect(props.onRetry).toHaveBeenCalledTimes(1)
  })
})
