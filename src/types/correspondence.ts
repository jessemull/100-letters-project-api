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

export type Correspondence = {
  correspondenceId: string;
  createdAt: string;
  recipientId: string;
  reason: Reason;
  updatedAt: string;
};

export type CorrespondenceCreateInput = {
  correspondence: {
    reason: Reason;
  };
  recipient: RecipientCreateInput;
  letters: LetterCreateInput[];
};

export type CorrespondenceUpdateInput = {
  correspondence: {
    correspondenceId: string;
    reason: Reason;
  };
  recipient: RecipientUpdateInput;
  letters: LetterUpdateInput[];
};
