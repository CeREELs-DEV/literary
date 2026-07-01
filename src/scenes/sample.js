export const sampleScene = {
  id: 'windy-door',
  title: 'A Windy Day',
  beats: [
    {
      text: 'The wind blew fiercely.',
      amplifiedCaption: 'Branches swayed and the windows rattled',
      duration: 3000,
      narration: 'The wind blew fiercely.',
      effects: [
        { type: 'clip', src: '' },              // TODO(asset): wind scene video
        { type: 'sound', src: '', volume: 0.6 }, // TODO(asset): wind sound
        { type: 'shake', intensity: 'low', duration: 800 },
      ],
    },
    {
      text: 'The door slammed shut.',
      amplifiedCaption: 'The whole house shuddered with a thud',
      duration: 3000,
      narration: 'The door slammed shut.',
      effects: [
        { type: 'image', src: '' },             // TODO(asset): closed door illustration
        { type: 'flash', color: '#000', strength: 0.25, duration: 250 },
        { type: 'shake', intensity: 'high', duration: 600 },
        { type: 'sound', src: '' },             // TODO(asset): door slam + low rumble
      ],
    },
    {
      text: 'And then, everything fell silent.',
      amplifiedCaption: 'Even the wind faded, leaving only a held breath',
      duration: 3000,
      narration: 'And then, everything fell silent.',
      effects: [],
    },
  ],
}
