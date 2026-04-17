export type CreateSummaryTemplateType =
  | 'default'
  | 'doc'
  | 'sheet'
  | 'slide'
  | 'pdf';

export interface CreateSummaryRequest {
  text: string;
  templateType?: CreateSummaryTemplateType;
}
