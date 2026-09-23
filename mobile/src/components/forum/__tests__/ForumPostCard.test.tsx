/// <reference types="jest" />
import { fireEvent, render } from '@testing-library/react-native'

// the heart's own behavior is covered by HeartButton.test.tsx; stub it here so
// the card test is isolated from auth + the reactions service
jest.mock('../HeartButton', () => {
  const React = jest.requireActual<typeof import('react')>('react')
  const { Pressable } = jest.requireActual<typeof import('react-native')>('react-native')
  return {
    __esModule: true,
    default: () =>
      React.createElement(Pressable, {
        accessibilityRole: 'button',
        accessibilityLabel: 'heart',
      }),
  }
})

jest.mock('../ForumPostImage', () => ({ __esModule: true, default: () => null }))

import ForumPostCard from '../ForumPostCard'
import type { ForumPostSummary } from '../../../types/domain'

const POST = {
  id: 'P1',
  author_name: 'Juan Cruz',
  created_at: '2026-09-01T00:00:00Z',
  updated_at: null,
  category: 'pests',
  title: 'Aphids on my seedlings',
  body: 'They appeared after the rain.',
  heart_count: 2,
  comment_count: 3,
  hasHearted: false,
  forum_images: [],
} as unknown as ForumPostSummary

describe('ForumPostCard', () => {
  it('renders the title with its tag, the description, and the two footer buttons', async () => {
    const screen = await render(
      <ForumPostCard post={POST} onSelect={jest.fn()} onRequireSignIn={jest.fn()} />
    )

    expect(screen.getByText('Aphids on my seedlings')).toBeTruthy()
    expect(screen.getByText('Pests & Diseases')).toBeTruthy()
    expect(screen.getByText('They appeared after the rain.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'heart' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'View 3 replies' })).toBeTruthy()
  })

  it('opens the thread from the reply button', async () => {
    const onSelect = jest.fn()
    const screen = await render(
      <ForumPostCard post={POST} onSelect={onSelect} onRequireSignIn={jest.fn()} />
    )

    await fireEvent.press(screen.getByRole('button', { name: 'View 3 replies' }))

    expect(onSelect).toHaveBeenCalledWith(POST)
  })
})
