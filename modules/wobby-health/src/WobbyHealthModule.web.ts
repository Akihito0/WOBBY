import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './WobbyHealth.types';

type WobbyHealthModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class WobbyHealthModule extends NativeModule<WobbyHealthModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(WobbyHealthModule, 'WobbyHealthModule');
