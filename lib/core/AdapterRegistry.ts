import { IGenerationAdapter } from '../interfaces';
import { ParsedSave } from '../parser/types';
import { Gen1Adapter } from '../generations/gen1/Gen1Adapter';
import { Gen2Adapter } from '../generations/gen2/Gen2Adapter';

/**
 * Singleton/Registry to manage generation adapters dynamically.
 * Provides APIs to register adapters and automatically parse uploaded saves
 * through a detection cascade.
 */
export class AdapterRegistry {
  private _adapters: Map<number, IGenerationAdapter> = new Map();

  /**
   * Registers a new generation adapter.
   */
  register(adapter: IGenerationAdapter): void {
    this._adapters.set(adapter.generation, adapter);
  }

  /**
   * Retrieves an adapter for a specific generation.
   */
  getAdapter(generation: number): IGenerationAdapter | undefined {
    return this._adapters.get(generation);
  }

  /**
   * Returns all registered adapters.
   */
  getAdapters(): IGenerationAdapter[] {
    return Array.from(this._adapters.values());
  }

  /**
   * Run the auto-detection cascade across all registered adapters to detect and parse the save.
   */
  detectAndParse(buffer: Uint8Array, filename: string): { success: boolean; generation?: number; data?: ParsedSave; error?: string } {
    for (const [gen, adapter] of this._adapters.entries()) {
      const detectResult = adapter.detectSave(buffer, filename);
      if (detectResult.detected) {
        try {
          const parsed = adapter.parseSave(buffer, filename);
          return {
            success: true,
            generation: gen,
            data: parsed
          };
        } catch (err: any) {
          return {
            success: false,
            error: `Failed to parse detected save for Gen ${gen}: ${err?.message || err}`
          };
        }
      }
    }
    return {
      success: false,
      error: `Unsupported save format. No compatible generation adapter found for this file size (${buffer.length} bytes).`
    };
  }
}

// Global registry singleton with native pre-registered adapters
export const registry = new AdapterRegistry();
registry.register(new Gen1Adapter());
registry.register(new Gen2Adapter());
