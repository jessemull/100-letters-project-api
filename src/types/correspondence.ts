import { LetterInput } from './letters';
import { RecipientInput } from './recipients';

export type CorrespondenceInput = {
  reason: string;
};

export type CreateOrUpdateCorrespondenceInput = {
  correspondence: CorrespondenceInput;
  recipient: RecipientInput;
  letters: LetterInput[];
};

export type Correspondence = {
  correspondenceId: string;
  createdAt: string;
  recipientId: string;
  reason: string;
  updatedAt: string;
};
