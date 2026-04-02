export interface JsonFieldOption {
  label: string;
  value: string;
}

export interface JsonFieldDescriptor {
  key: string;
  label: string;
  helpKey: string;
  description: string;
  type: 'text' | 'email' | 'checkbox' | 'select';
  placeholder?: string;
  options?: JsonFieldOption[];
}
