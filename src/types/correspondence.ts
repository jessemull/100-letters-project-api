import { LetterCreateInput, LetterUpdateInput } from './letters';
import { RecipientCreateInput, RecipientUpdateInput } from './recipients';

export type Correspondence = {
  correspondenceId: string;
  createdAt: string;
  recipientId: string;
  reason: string;
  updatedAt: string;
};

export type CorrespondenceCreateInput = {
  correspondence: {
    reason: string;
  };
  recipient: RecipientCreateInput;
  letters: LetterCreateInput[];
};

export type CorrespondenceUpdateInput = {
  correspondence: {
    correspondenceId: string;
    reason: string;
  };
  recipient: RecipientUpdateInput;
  letters: LetterUpdateInput[];
};
