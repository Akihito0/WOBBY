import * as React from 'react';

import { WobbyHealthViewProps } from './WobbyHealth.types';

export default function WobbyHealthView(props: WobbyHealthViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
