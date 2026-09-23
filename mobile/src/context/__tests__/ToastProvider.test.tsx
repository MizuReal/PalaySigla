/// <reference types="jest" />
import { useRef } from 'react'
import { Pressable, Text } from 'react-native'
import { act, fireEvent, render } from '@testing-library/react-native'

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

import ToastProvider from '../ToastProvider'
import { useToast } from '../toastContext'

function AddingConsumer() {
  const { showToast } = useToast()
  const count = useRef(0)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="add"
      onPress={() => {
        count.current += 1
        showToast(`Toast ${count.current}`, 'info')
      }}
    >
      <Text>add</Text>
    </Pressable>
  )
}

async function pressAdd(screen: Awaited<ReturnType<typeof render>>) {
  await fireEvent.press(screen.getByRole('button', { name: 'add' }))
}

afterEach(() => {
  jest.useRealTimers()
})

describe('ToastProvider', () => {
  it('renders a toast through the context', async () => {
    const screen = await render(
      <ToastProvider>
        <AddingConsumer />
      </ToastProvider>
    )

    await pressAdd(screen)

    expect(screen.getByText('Toast 1')).toBeTruthy()
  })

  it('auto-dismisses a toast after four seconds', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] })
    const screen = await render(
      <ToastProvider>
        <AddingConsumer />
      </ToastProvider>
    )

    await pressAdd(screen)
    expect(screen.getByText('Toast 1')).toBeTruthy()

    await act(() => {
      jest.advanceTimersByTime(4000)
    })

    expect(screen.queryByText('Toast 1')).toBeNull()
  })

  it('dismisses a toast from its close affordance', async () => {
    const screen = await render(
      <ToastProvider>
        <AddingConsumer />
      </ToastProvider>
    )

    await pressAdd(screen)
    await fireEvent.press(screen.getByLabelText('Dismiss notification'))

    expect(screen.queryByText('Toast 1')).toBeNull()
  })

  it('keeps only the newest four toasts', async () => {
    const screen = await render(
      <ToastProvider>
        <AddingConsumer />
      </ToastProvider>
    )

    for (let index = 0; index < 5; index += 1) {
      await pressAdd(screen)
    }

    expect(screen.queryByText('Toast 1')).toBeNull()
    expect(screen.getByText('Toast 2')).toBeTruthy()
    expect(screen.getByText('Toast 5')).toBeTruthy()
  })
})
