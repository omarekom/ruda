import { PALETTE, slabFloor, type SlabStyle } from './blockTextures';
import { drawFromTable, type Skin } from './skin';
import { isSolid, texturedLooks, tiledFloor, type DrawSolid } from './textured';

/** The knobs the workshop variants differ in. */
interface WorkshopStyle {
  readonly floor: SlabStyle;
  /**
   * The edge of solid blocks: 'bevel' is light top-left and dark bottom-right like an inventory
   * icon, 'outline' adds a dark pixel outline, 'none' leaves the texture as it is.
   */
  readonly edge: 'bevel' | 'outline' | 'none';
  /** Solid blocks' shadow towards the bottom right: offset as a share of the cell. */
  readonly shadow: { readonly offset: number; readonly alpha: number; readonly soft: boolean };
}

const GREY_SLABS: SlabStyle = {
  fill: ['#c8c8c8', '#c3c3c3', '#cdcdcd'],
  light: '#d9d9d9',
  dark: '#a9a9a9',
  slabCells: 1,
};

const WARM_SLABS: SlabStyle = {
  fill: ['#d2ccc0', '#cdc7bb', '#d7d1c5'],
  light: '#e3ded4',
  dark: '#afa899',
  slabCells: 1,
};

const solidEdge =
  (edge: WorkshopStyle['edge']): DrawSolid =>
  (g, size, top) => {
    top(g, size);
    if (edge === 'none') return;
    const px = Math.max(1, size / 16);
    if (edge === 'outline') {
      g.strokeStyle = 'rgba(0, 0, 0, 0.6)';
      g.lineWidth = px;
      g.strokeRect(px / 2, px / 2, size - px, size - px);
    }
    const inset = edge === 'outline' ? px : 0;
    const inner = size - 2 * inset;
    g.fillStyle = 'rgba(255, 255, 255, 0.28)';
    g.fillRect(inset, inset, inner, px);
    g.fillRect(inset, inset + px, px, inner - px);
    g.fillStyle = 'rgba(0, 0, 0, 0.32)';
    g.fillRect(inset + px, inset + inner - px, inner - px, px);
    g.fillRect(inset + inner - px, inset + px, px, inner - 2 * px);
  };

function workshopSkin(style: WorkshopStyle): Skin {
  const looks = texturedLooks(solidEdge(style.edge));
  const { offset, alpha, soft } = style.shadow;
  // A soft shadow is a few stacked, fainter squares, each a little further out.
  const layers = soft ? [0.5, 0.75, 1] : [1];
  return {
    background: style.floor.fill[0] ?? '#c6c6c6',
    grid: 'rgba(0, 0, 0, 0)',
    hover: 'rgba(0, 0, 0, 0.6)',
    ink: PALETTE.stone[0],
    // Overlay makes light glow on the pale floor instead of just staining it.
    glow: { mode: 'overlay', strength: 2.5, overBlocks: 0 },
    light: { lamp: '#ffc53d', power: '#ff2a1a' },
    drawBlock: (g, block, size, appearance, seed) =>
      drawFromTable(looks, g, block, size, appearance, seed),
    drawFloor: tiledFloor(() => slabFloor(style.floor), style.floor.fill[0] ?? '#c6c6c6'),
    drawUnder: (g, block, size) => {
      if (!isSolid(block)) return;
      g.fillStyle = `rgba(0, 0, 0, ${alpha / layers.length})`;
      for (const layer of layers)
        g.fillRect(size * offset * layer, size * offset * layer, size, size);
    },
  };
}

/** Game look: a bright workshop of smooth stone slabs, in variants being compared. */
export const WORKSHOP_LOOKS = {
  classic: workshopSkin({
    floor: GREY_SLABS,
    edge: 'bevel',
    shadow: { offset: 0.12, alpha: 0.25, soft: false },
  }),
  soft: workshopSkin({
    floor: GREY_SLABS,
    edge: 'none',
    shadow: { offset: 0.16, alpha: 0.42, soft: true },
  }),
  crisp: workshopSkin({
    floor: WARM_SLABS,
    edge: 'outline',
    shadow: { offset: 0.1, alpha: 0.3, soft: false },
  }),
  slabs: workshopSkin({
    floor: { ...GREY_SLABS, slabCells: 2 },
    edge: 'bevel',
    shadow: { offset: 0.18, alpha: 0.22, soft: true },
  }),
} as const satisfies Record<string, Skin>;
