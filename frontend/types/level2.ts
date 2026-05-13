export type GameStage = 'intro' | 'journal' | 'potions' | 'pipes' | 'victory';
export type BlankId = 'b1' | 'b2' | 'b3';
export type FragmentWord = 'calcinate' | 'conjoin' | 'sublime' | 'purify' | 'ferment' | 'dissolve';
export type PipeType = 'straight-h' | 'straight-v' | 'corner-ne' | 'corner-nw' | 'corner-se' | 'corner-sw' | 'empty';
export type PipeCell = { type: PipeType; rotation: number; hasLiquid: boolean };
