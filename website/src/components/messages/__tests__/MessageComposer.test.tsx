import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import MessageComposer from '../MessageComposer'

function sendButton(): HTMLButtonElement {
  return screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement
}

describe('MessageComposer', () => {
  it('sends a trimmed message and clears the field', () => {
    const onSend = vi.fn()
    render(<MessageComposer onSend={onSend} isSending={false} error="" />)

    const input = screen.getByLabelText('Message') as HTMLInputElement
    fireEvent.change(input, { target: { value: '  Magkano po?  ' } })
    fireEvent.click(sendButton())

    expect(onSend).toHaveBeenCalledWith('Magkano po?')
    expect(input.value).toBe('')
  })

  it('disables send while empty', () => {
    render(<MessageComposer onSend={vi.fn()} isSending={false} error="" />)
    expect(sendButton().disabled).toBe(true)
  })

  it('blocks sending while a message is in flight', () => {
    render(<MessageComposer onSend={vi.fn()} isSending error="" />)
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'hello' } })
    expect(sendButton().disabled).toBe(true)
  })

  it('renders the failure message', () => {
    render(
      <MessageComposer onSend={vi.fn()} isSending={false} error="Could not send the message." />
    )
    expect(screen.getByRole('alert').textContent).toContain('Could not send the message.')
  })
})
