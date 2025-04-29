import { LetterCreateInput, LetterUpdateInput } from './letters';
import { RecipientCreateInput, RecipientUpdateInput } from './recipients';

export enum Impact {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export type Reason = {
  description: string;
  domain: string;
  impact: Impact;
};

export enum Status {
  COMPLETED = 'COMPLETED',
  PENDING = 'PENDING',
  RESPONDED = 'RESPONDED',
  UNSENT = 'UNSENT',
}

export type Correspondence = {
  correspondenceId: string;
  createdAt: string;
  recipientId: string;
  reason: Reason;
  status: Status;
  title: string;
  updatedAt: string;
};

export type CorrespondenceCreateInput = {
  correspondence: {
    reason: Reason;
    status: Status;
    title: string;
  };
  letters: LetterCreateInput[];
  recipient: RecipientCreateInput;
};

export type CorrespondenceUpdateInput = {
  correspondence: {
    correspondenceId: string;
    reason: Reason;
    status: Status;
    title: string;
  };
  letters: LetterUpdateInput[];
  recipient: RecipientUpdateInput;
};
