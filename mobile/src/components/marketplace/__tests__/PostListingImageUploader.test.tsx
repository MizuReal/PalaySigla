/// <reference types="jest" />
import { fireEvent, render } from '@testing-library/react-native'
import PostListingImageUploader from '../PostListingImageUploader'

const IMAGE = { uri: 'file:///cache/prepared.jpg', width: 1600, height: 1200 }

function buildProps(overrides: Record<string, unknown> = {}) {
  return {
    image: null,
    isProcessing: false,
    error: '',
    canOpenSettings: false,
    onTakePhoto: jest.fn(),
    onPickFromLibrary: jest.fn(),
    onRemove: jest.fn(),
    onOpenSettings: jest.fn(),
    ...overrides,
  }
}

describe('PostListingImageUploader', () => {
  it('offers camera and library actions when empty', async () => {
    const props = buildProps()
    const screen = await render(<PostListingImageUploader {...props} />)

    expect(screen.getByText('Add a photo — JPEG or PNG')).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Take photo' }))
    await fireEvent.press(
      screen.getByRole('button', { name: 'Choose from library' })
    )

    expect(props.onTakePhoto).toHaveBeenCalledTimes(1)
    expect(props.onPickFromLibrary).toHaveBeenCalledTimes(1)
  })

  it('swaps the actions for a processing spinner while compressing', async () => {
    const screen = await render(
      <PostListingImageUploader {...buildProps({ isProcessing: true })} />
    )

    expect(screen.getByText('Processing photo…')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Take photo' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Choose from library' })).toBeNull()
  })

  it('shows the preview with a remove action once an image is prepared', async () => {
    const props = buildProps({ image: IMAGE })
    const screen = await render(<PostListingImageUploader {...props} />)

    expect(screen.getByText('Remove photo')).toBeTruthy()
    expect(screen.queryByText('Add a photo — JPEG or PNG')).toBeNull()

    await fireEvent.press(screen.getByRole('button', { name: 'Remove photo' }))
    expect(props.onRemove).toHaveBeenCalledTimes(1)
  })

  it('shows the Settings affordance when the camera is permanently blocked', async () => {
    const props = buildProps({
      error: 'Camera access is off.',
      canOpenSettings: true,
    })
    const screen = await render(<PostListingImageUploader {...props} />)

    expect(screen.getByRole('alert')).toBeTruthy()
    await fireEvent.press(screen.getByRole('link', { name: 'Open settings' }))

    expect(props.onOpenSettings).toHaveBeenCalledTimes(1)
  })

  it('hides the Settings affordance for recoverable errors', async () => {
    const screen = await render(
      <PostListingImageUploader
        {...buildProps({ error: 'Please choose a JPEG or PNG photo.' })}
      />
    )

    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.queryByText('Open settings')).toBeNull()
  })
})
