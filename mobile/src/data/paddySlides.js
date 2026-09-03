// Landing hero slide content. Photos are Wikimedia Commons content,
// CC-licensed, credited in the hero's fine print. Mirrors the website's
// src/data/paddySlides.js so copy stays in sync across surfaces.

export const GOLDEN_PADDY_IMAGE =
  'https://upload.wikimedia.org/wikipedia/commons/a/ac/Unhulled_rice.jpg'
export const PANICLE_HARVEST_IMAGE =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Bagged_rice_panicles.JPG/1280px-Bagged_rice_panicles.JPG'
export const RED_HUSK_IMAGE =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Red_Rice_Paddy_field_in_Japan_001.jpg/1280px-Red_Rice_Paddy_field_in_Japan_001.jpg'

const PADDY_SLIDES = [
  {
    id: 'golden-paddy',
    name: 'Golden paddy',
    description:
      'Sun-dried unhulled grains, ready for the buyer\u2019s inspection \u2014 the classic first photo of the harvest.',
    imageUrl: GOLDEN_PADDY_IMAGE,
    imageAlt:
      'Close-up of golden unhulled paddy grains with their husks intact',
    chips: [
      { label: 'Grade', value: 'A' },
      { label: 'Mold', value: 'None' },
      { label: 'Moisture', value: 'Dry' },
    ],
  },
  {
    id: 'panicle-harvest',
    name: 'Panicle harvest',
    description:
      'Whole panicles straight from the field, still in husk \u2014 the way most palay arrives at the mill gate.',
    imageUrl: PANICLE_HARVEST_IMAGE,
    imageAlt: 'Harvested rice panicles with husked grains piled in sacks',
    chips: [
      { label: 'Grade', value: 'Premium A' },
      { label: 'Mold', value: 'None' },
      { label: 'Intake', value: 'Ready' },
    ],
  },
  {
    id: 'red-husk',
    name: 'Red-husk variety',
    description:
      'Traditional red-hulled paddy stands apart in a sea of gold \u2014 and the scan reads it the same way you do.',
    imageUrl: RED_HUSK_IMAGE,
    imageAlt: 'Field of reddish-husked paddy rice glowing in the sunlight',
    chips: [
      { label: 'Variety', value: 'Traditional' },
      { label: 'Grade', value: 'A' },
      { label: 'Mold', value: 'None' },
    ],
  },
]

export default PADDY_SLIDES
