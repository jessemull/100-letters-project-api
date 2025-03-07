export interface Letter {
  letterId: string;
  imageUrl: string;
  correspondenceId: string;
  type: string;
  date: string; // Using string since DynamoDB stores dates as ISO strings
  text: string;
  method?: string;
  status?: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}
