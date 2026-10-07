export type ExportOption = {
  id: string;
  name: string;
  priceLabel: string;
  hint: string;
  mvp: boolean;
  /** Price in ESPEE actually charged by the ledger. 0 = free. */
  cost: number;
};

export const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'standard',
    name: 'Standard Download',
    priceLabel: 'Free',
    hint: 'Includes the Pixeliia watermark',
    mvp: true,
    cost: 0,
  },
  {
    id: 'hd',
    name: 'HD Download',
    priceLabel: '1 ESPEE',
    hint: 'Higher-resolution export',
    mvp: true,
    cost: 1,
  },
  {
    id: 'remove-pixeliia-watermark',
    name: 'Remove Pixeliia Watermark',
    priceLabel: '1 ESPEE',
    hint: 'Clean export without the Pixeliia mark',
    mvp: true,
    cost: 1,
  },
  {
    id: 'phone-watermark',
    name: 'Add Phone Watermark',
    priceLabel: '1 ESPEE',
    hint: 'Coming in a later release',
    mvp: false,
    cost: 1,
  },
  {
    id: 'remove-external-watermark',
    name: 'Remove External Watermark',
    priceLabel: '1 ESPEE',
    hint: 'Coming in a later release · for photos you own',
    mvp: false,
    cost: 1,
  },
];
