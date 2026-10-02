export type ExportOption = {
  id: string;
  name: string;
  priceLabel: string;
  hint: string;
  mvp: boolean;
};

export const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'standard',
    name: 'Standard Download',
    priceLabel: 'Free',
    hint: 'Includes the Pixeliia watermark',
    mvp: true,
  },
  {
    id: 'hd',
    name: 'HD Download',
    priceLabel: '2 ESPEE',
    hint: 'Higher-resolution export',
    mvp: true,
  },
  {
    id: 'remove-pixeliia-watermark',
    name: 'Remove Pixeliia Watermark',
    priceLabel: '1 ESPEE',
    hint: 'Clean export without the Pixeliia mark',
    mvp: true,
  },
  {
    id: 'phone-watermark',
    name: 'Add Phone Watermark',
    priceLabel: '1 ESPEE',
    hint: 'Coming in a later release',
    mvp: false,
  },
  {
    id: 'remove-external-watermark',
    name: 'Remove External Watermark',
    priceLabel: '3 ESPEE',
    hint: 'Coming in a later release · for photos you own',
    mvp: false,
  },
];
