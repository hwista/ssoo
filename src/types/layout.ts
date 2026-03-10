export type DeviceType = 'desktop' | 'mobile';

export type DocumentType = 'wiki' | 'dev';

export interface LayoutState {
  deviceType: DeviceType;
  documentType: DocumentType;
}

export interface LayoutActions {
  setDeviceType: (type: DeviceType) => void;
  setDocumentType: (type: DocumentType) => void;
}
