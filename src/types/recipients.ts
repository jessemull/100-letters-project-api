export type Address = {
  city: string;
  country: string;
  postalCode: string;
  state: string;
  street: string;
};

export type Recipient = {
  address: string;
  description?: string;
  firstName: string;
  lastName: string;
  occupation?: string;
  organization?: string;
  recipientId: string;
};

export type RecipientCreateInput = {
  address: string;
  description?: string;
  firstName: string;
  lastName: string;
  occupation?: string;
  organization?: string;
};

export type RecipientUpdateInput = {
  address: Address;
  description?: string;
  firstName: string;
  lastName: string;
  occupation?: string;
  organization?: string;
  recipientId: string;
};
