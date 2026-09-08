import React from 'react';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

export async function render(element: React.ReactElement) {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(element);
  });

  return {
    renderer,
    getByTestId(testID: string): ReactTestInstance {
      return renderer.root.findByProps({ testID });
    },
  };
}

export const fireEvent = {
  async press(instance: ReactTestInstance) {
    await act(async () => {
      await instance.props.onPress();
    });
  },
  async changeText(instance: ReactTestInstance, value: string) {
    await act(async () => {
      await instance.props.onChangeText(value);
    });
  },
};