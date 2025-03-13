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

export interface Letter {
  correspondenceId: string;
  date: string;
  description?: string;
  imageURL: string;
  letterId: string;
  method: LetterMethod;
  status: LetterStatus;
  text: string;
  title: string;
  type: LetterType;
}

export type LetterCreateInput = {
  correspondenceId: string;
  date: string;
  description?: string;
  imageURL: string;
  method: LetterMethod;
  status: LetterStatus;
  text: string;
  title: string;
  type: LetterType;
};

export type LetterUpdateInput = {
  date: string;
  description?: string;
  imageURL: string;
  letterId: string;
  method: LetterMethod;
  status: LetterStatus;
  text: string;
  title: string;
  type: LetterType;
};
