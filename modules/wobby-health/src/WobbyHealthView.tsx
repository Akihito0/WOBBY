import { requireNativeView } from 'expo';
import * as React from 'react';

import { WobbyHealthViewProps } from './WobbyHealth.types';

const NativeView: React.ComponentType<WobbyHealthViewProps> =
  requireNativeView('WobbyHealth');

export default function WobbyHealthView(props: WobbyHealthViewProps) {
  return <NativeView {...props} />;
}
