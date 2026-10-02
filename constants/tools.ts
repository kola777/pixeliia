export type ToolCategoryId =
  | 'auto'
  | 'enhance'
  | 'face'
  | 'body'
  | 'age'
  | 'outfit'
  | 'camera'
  | 'background'
  | 'cleanup';

export type Tool = {
  id: string;
  name: string;
  category: ToolCategoryId;
  description: string;
  intensity: boolean;
};

export const CATEGORIES: { id: ToolCategoryId; name: string; blurb: string }[] = [
  { id: 'auto', name: 'Auto Edit', blurb: 'One tap, natural improvement' },
  { id: 'enhance', name: 'Enhance', blurb: 'Quality, sharpness, low light' },
  { id: 'face', name: 'Face & Skin', blurb: 'Texture-preserving retouch' },
  { id: 'body', name: 'Body', blurb: 'Subtle proportion tools' },
  { id: 'age', name: 'Age', blurb: 'Reimagine age, identity preserved' },
  { id: 'outfit', name: 'Outfit', blurb: 'Color, style, replace clothing' },
  { id: 'camera', name: 'Camera Look', blurb: 'Phone-camera style simulation' },
  { id: 'background', name: 'Background', blurb: 'Remove, blur, replace' },
  { id: 'cleanup', name: 'Cleanup', blurb: 'Object and distraction removal' },
];

export const TOOLS: Tool[] = [
  {
    id: 'auto-edit',
    name: 'Auto Edit',
    category: 'auto',
    description: 'Balances exposure, color, contrast, and skin while staying natural.',
    intensity: true,
  },
  {
    id: 'enhance-photo',
    name: 'Enhance Photo',
    category: 'enhance',
    description: 'Improve overall image quality without a heavy preset look.',
    intensity: true,
  },
  {
    id: 'hd-enhance',
    name: 'HD Enhance',
    category: 'enhance',
    description: 'Upscale and recover detail where technically possible.',
    intensity: false,
  },
  {
    id: 'sharpen',
    name: 'Sharpen',
    category: 'enhance',
    description: 'Add clarity while avoiding crunchy edges.',
    intensity: true,
  },
  {
    id: 'reduce-noise',
    name: 'Reduce Noise',
    category: 'enhance',
    description: 'Clean grain in low-light photos.',
    intensity: true,
  },
  {
    id: 'low-light',
    name: 'Low Light',
    category: 'enhance',
    description: 'Lift dark photos without blowing highlights.',
    intensity: true,
  },
  {
    id: 'smooth-skin',
    name: 'Smooth Skin',
    category: 'face',
    description: 'Soften skin while keeping pores, texture, and identity.',
    intensity: true,
  },
  {
    id: 'remove-blemishes',
    name: 'Remove Blemishes',
    category: 'face',
    description: 'Clear spots and pimples without plastic skin.',
    intensity: true,
  },
  {
    id: 'reduce-dark-circles',
    name: 'Dark Circles',
    category: 'face',
    description: 'Brighten under-eyes while keeping a natural look.',
    intensity: true,
  },
  {
    id: 'teeth-whitening',
    name: 'Teeth Whitening',
    category: 'face',
    description: 'Whiten teeth without a fake glow.',
    intensity: true,
  },
  {
    id: 'eye-enhance',
    name: 'Eye Enhance',
    category: 'face',
    description: 'Subtle eye clarity and brightness.',
    intensity: true,
  },
  {
    id: 'face-enhance',
    name: 'Face Enhance',
    category: 'face',
    description: 'Natural face quality pass that preserves structure and hair.',
    intensity: true,
  },
  {
    id: 'slimmer',
    name: 'Slimmer',
    category: 'body',
    description: 'Subtle slimming that avoids obvious warping.',
    intensity: true,
  },
  {
    id: 'more-athletic',
    name: 'More Athletic',
    category: 'body',
    description: 'A slightly more athletic build while keeping pose and clothes.',
    intensity: true,
  },
  {
    id: 'adjust-waist',
    name: 'Adjust Waist',
    category: 'body',
    description: 'Targeted waist adjustment with identity preserved.',
    intensity: true,
  },
  {
    id: 'age-edit',
    name: 'Age Transform',
    category: 'age',
    description: 'Reimagine the person at any age. Clearly labeled as an AI edit.',
    intensity: false,
  },
  {
    id: 'outfit-color',
    name: 'Change Outfit Color',
    category: 'outfit',
    description: 'Recolor clothing while keeping the garment shape.',
    intensity: false,
  },
  {
    id: 'outfit-style',
    name: 'Change Outfit Style',
    category: 'outfit',
    description: 'Shift the style of the existing outfit.',
    intensity: false,
  },
  {
    id: 'replace-clothing',
    name: 'Replace Clothing',
    category: 'outfit',
    description: 'Replace selected clothing with a new outfit.',
    intensity: false,
  },
  {
    id: 'iphone-look',
    name: 'iPhone Look',
    category: 'camera',
    description: 'Simulated iPhone camera processing — a look, not a device claim.',
    intensity: true,
  },
  {
    id: 'pixel-look',
    name: 'Pixel Look',
    category: 'camera',
    description: 'Simulated Google Pixel color and HDR feel.',
    intensity: true,
  },
  {
    id: 'galaxy-look',
    name: 'Galaxy Look',
    category: 'camera',
    description: 'Simulated Samsung Galaxy camera rendering.',
    intensity: true,
  },
  {
    id: 'remove-background',
    name: 'Remove Background',
    category: 'background',
    description: 'Cut the subject out of the current background.',
    intensity: false,
  },
  {
    id: 'blur-background',
    name: 'Blur Background',
    category: 'background',
    description: 'Portrait-style background blur.',
    intensity: true,
  },
  {
    id: 'remove-object',
    name: 'Remove Object',
    category: 'cleanup',
    description: 'Remove an unwanted object or distraction.',
    intensity: false,
  },
];

export const FEATURED_TOOL_IDS = [
  'auto-edit',
  'enhance-photo',
  'smooth-skin',
  'age-edit',
  'remove-background',
  'outfit-color',
  'iphone-look',
];

/** PRD 7.5 age presets: label plus representative target age. */
export const AGE_PRESETS = [
  { label: 'Newborn', age: 0 },
  { label: 'Child', age: 7 },
  { label: 'Teen', age: 15 },
  { label: 'Adult', age: 30 },
  { label: 'Senior', age: 70 },
  { label: '100 Years', age: 100 },
];

export function toolById(id: string) {
  return TOOLS.find((tool) => tool.id === id);
}

export function toolsInCategory(category: ToolCategoryId) {
  return TOOLS.filter((tool) => tool.category === category);
}
