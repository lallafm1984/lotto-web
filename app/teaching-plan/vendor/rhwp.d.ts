export class HwpDocument {
  constructor(input: Uint8Array);
  free(): void;
  getSectionCount(): number;
  getPageDef(sectionIndex: number): string;
  exportHwpx(): Uint8Array;
}

export default function init(options?: {
  module_or_path?: ArrayBuffer | Uint8Array | WebAssembly.Module | Response | URL | string;
}): Promise<WebAssembly.Exports>;
