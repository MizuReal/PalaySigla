/// <reference types="jest" />
import { render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import DetectionOverlay from '../DetectionOverlay'
import type { DefectDetection } from '../../../types/api'

const DETECTION: DefectDetection = {
  class_key: 'mold_discoloration',
  label: 'Mold / discoloration',
  confidence: 0.78,
  box: [0.1, 0.2, 0.3, 0.4],
  area_ratio: 0.12,
}

describe('DetectionOverlay', () => {
  it('maps normalized boxes to percentages of the frame', async () => {
    const screen = await render(
      <DetectionOverlay
        imageUri="file:///cache/paddy.jpg"
        imageWidth={1000}
        imageHeight={500}
        detections={[DETECTION]}
      />
    )

    const [box] = screen.getAllByTestId('detection-box')
    const style = StyleSheet.flatten(box.props.style)
    expect(style.left).toBe('10.0000%')
    expect(style.top).toBe('20.0000%')
    expect(style.width).toBe('30.0000%')
    expect(style.height).toBe('40.0000%')
  })

  it('renders one box per detection', async () => {
    const screen = await render(
      <DetectionOverlay
        imageUri="file:///cache/paddy.jpg"
        imageWidth={1000}
        imageHeight={1000}
        detections={[DETECTION, { ...DETECTION, box: [0.5, 0.5, 0.1, 0.1], confidence: 0.6 }]}
      />
    )

    expect(screen.getAllByTestId('detection-box')).toHaveLength(2)
  })

  it('keeps the frame at the photo aspect ratio', async () => {
    const screen = await render(
      <DetectionOverlay
        imageUri="file:///cache/paddy.jpg"
        imageWidth={1200}
        imageHeight={800}
        detections={[]}
      />
    )

    const frame = screen.getByTestId('detection-overlay')
    const style = StyleSheet.flatten(frame.props.style)
    expect(style.aspectRatio).toBeCloseTo(1.5)
    expect(screen.queryAllByTestId('detection-box')).toHaveLength(0)
  })
})
