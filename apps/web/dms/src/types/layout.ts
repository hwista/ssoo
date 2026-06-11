export type DeviceType = 'desktop' | 'mobile';

export interface LayoutState {
  deviceType: DeviceType;
}

export interface LayoutActions {
  setDeviceType: (type: DeviceType) => void;
}
