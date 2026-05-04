import { NativeModule, requireNativeModule } from 'expo';

import { WobbyHealthModuleEvents } from './WobbyHealth.types';

declare class WobbyHealthModule extends NativeModule<WobbyHealthModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<WobbyHealthModule>('WobbyHealth');
