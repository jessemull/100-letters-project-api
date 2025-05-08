export enum LetterMethod {
  TYPED = 'TYPED',
  HANDWRITTEN = 'HANDWRITTEN',
  PRINTED = 'PRINTED',
  DIGITAL = 'DIGITAL',
  OTHER = 'OTHER',
}

export enum LetterStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  RECEIVED = 'RECEIVED',
  RESPONDED = 'RESPONDED',
}

export enum LetterType {
  MAIL = 'MAIL',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  OTHER = 'OTHER',
}

export enum LetterMimeType {
  JPEG = 'image/jpeg',
  PNG = 'image/png',
  WEBP = 'image/webp',
  GIF = 'image/gif',
}

export enum View {
  ENVELOPE_FRONT = 'ENVELOPE_FRONT',
  ENVELOPE_BACK = 'ENVELOPE_BACK',
  LETTER_FRONT = 'LETTER_FRONT',
  LETTER_BACK = 'LETTER_BACK',
}

export type LetterImage = {
  caption?: string;
  dateUploaded?: string;
  fileKey: string;
  id: string;
  mimeType?: LetterMimeType;
  sizeInBytes?: number;
  uploadedBy?: string;
  url: string;
  urlThumbnail: string;
  view: View;
};

export interface Letter {
  correspondenceId: string;
  description?: string;
  imageURLs: LetterImage[];
  letterId: string;
  method: LetterMethod;
  receivedAt?: string;
  sentAt?: string;
  status: LetterStatus;
  text: string;
  title: string;
  type: LetterType;
}

export type LetterCreateInput = {
  correspondenceId: string;
  description?: string;
  imageURLs: LetterImage[];
  method: LetterMethod;
  receivedAt?: string;
  sentAt?: string;
  status: LetterStatus;
  text: string;
  title: string;
  type: LetterType;
};

export type LetterUpdateInput = {
  description?: string;
  imageURLs: LetterImage[];
  letterId: string;
  method: LetterMethod;
  receivedAt?: string;
  sentAt?: string;
  status: LetterStatus;
  text: string;
  title: string;
  type: LetterType;
};
