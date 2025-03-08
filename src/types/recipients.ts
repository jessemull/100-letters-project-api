export type RecipientInput = {
  address: string;
  description?: string;
  firstName: string;
  lastName: string;
  occupation?: string;
};

export type Recipient = {
  address: string;
  description?: string;
  firstName: string;
  lastName: string;
  occupation?: string;
  recipientId: string;
};
