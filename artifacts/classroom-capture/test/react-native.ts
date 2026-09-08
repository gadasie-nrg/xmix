import React from 'react';

function nativeElement(name: string) {
  return function NativeElement({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) {
    return React.createElement(name, props, children);
  };
}

type TestState = { alerts: Array<{ title: string; message?: string }> };
const getTestState = () => (globalThis as unknown as { __xmixTestState: TestState }).__xmixTestState;

export const ActivityIndicator = nativeElement('ActivityIndicator');
export const Alert = {
  alert: (title: string, message?: string) => getTestState().alerts.push({ title, message }),
};
export const Linking = { openSettings: () => undefined };
export const Modal = nativeElement('Modal');
export const Platform = { OS: 'ios' };
export const Pressable = nativeElement('Pressable');
export const ScrollView = nativeElement('ScrollView');
export const StyleSheet = { absoluteFill: {}, create: (styles: unknown) => styles };
export const Text = nativeElement('Text');
export const TextInput = nativeElement('TextInput');
export const View = nativeElement('View');